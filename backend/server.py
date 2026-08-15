from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="LifeDesk API")
api_router = APIRouter(prefix="/api")

# =========================================================
# Models
# =========================================================

def new_id() -> str:
    return str(uuid.uuid4())

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class Account(BaseModel):
    id: str = Field(default_factory=new_id)
    name: str
    type: Literal["bank", "cash", "ewallet", "credit_card", "savings", "investment"]
    initial_balance: float = 0
    current_balance: float = 0
    masked_number: Optional[str] = None
    color: str = "#4A7C59"
    icon: str = "wallet"
    active: bool = True
    created_at: str = Field(default_factory=now_iso)


class Category(BaseModel):
    id: str = Field(default_factory=new_id)
    name: str
    type: Literal["income", "expense"]
    color: str = "#8DB596"
    icon: str = "tag"
    parent_id: Optional[str] = None
    archived: bool = False


class Transaction(BaseModel):
    id: str = Field(default_factory=new_id)
    date: str  # YYYY-MM-DD
    time: str = "12:00"
    type: Literal["income", "expense", "transfer", "refund", "adjustment"]
    amount: float
    account_id: str
    to_account_id: Optional[str] = None
    category_id: Optional[str] = None
    subcategory_id: Optional[str] = None
    payee: Optional[str] = None
    method: Optional[str] = None
    note: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    attachment: Optional[str] = None
    is_recurring: bool = False
    verified: bool = True
    debt_id: Optional[str] = None
    savings_goal_id: Optional[str] = None
    bill_id: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)


class Budget(BaseModel):
    id: str = Field(default_factory=new_id)
    category_id: Optional[str] = None  # None = total
    period: Literal["monthly", "weekly"] = "monthly"
    amount: float
    month: int  # 1-12
    year: int


class Bill(BaseModel):
    id: str = Field(default_factory=new_id)
    name: str
    amount: float
    frequency: Literal["daily", "weekly", "monthly", "yearly"] = "monthly"
    due_date: str  # YYYY-MM-DD
    category_id: Optional[str] = None
    account_id: Optional[str] = None
    is_paid: bool = False
    fixed: bool = True
    notes: Optional[str] = None
    reminder: bool = False


class Payment(BaseModel):
    id: str = Field(default_factory=new_id)
    date: str
    amount: float
    note: Optional[str] = None


class DebtCredit(BaseModel):
    id: str = Field(default_factory=new_id)
    party_name: str
    type: Literal["debt", "credit", "loan", "cashbon", "installment"]
    initial_amount: float
    date: str
    due_date: Optional[str] = None
    payments: List[Payment] = Field(default_factory=list)
    account_id: Optional[str] = None
    notes: Optional[str] = None
    status: Literal["active", "paid"] = "active"


class SavingsGoal(BaseModel):
    id: str = Field(default_factory=new_id)
    name: str
    target_amount: float
    current_amount: float = 0
    target_date: Optional[str] = None
    periodic_deposit: Optional[float] = None
    account_id: Optional[str] = None
    notes: Optional[str] = None


class Note(BaseModel):
    id: str = Field(default_factory=new_id)
    type: Literal["plan", "purchase", "debt", "saving_idea", "journal"] = "journal"
    title: str
    content: str = ""
    date: str = Field(default_factory=lambda: datetime.now(timezone.utc).strftime("%Y-%m-%d"))


class Settings(BaseModel):
    user_name: str = "Pengguna LifeDesk"
    currency: str = "IDR"
    date_format: str = "DD/MM/YYYY"
    timezone: str = "Asia/Jakarta"
    theme: Literal["light", "dark", "system"] = "system"
    notify_budget: bool = True


# =========================================================
# Helpers
# =========================================================

def clean(doc: dict) -> dict:
    if doc and "_id" in doc:
        doc.pop("_id", None)
    return doc


async def find_all(collection: str, sort_field: Optional[str] = None, sort_dir: int = -1) -> list:
    cur = db[collection].find({}, {"_id": 0})
    if sort_field:
        cur = cur.sort(sort_field, sort_dir)
    return await cur.to_list(length=10000)


async def recompute_account_balance(account_id: str):
    account = await db.accounts.find_one({"id": account_id}, {"_id": 0})
    if not account:
        return
    initial = account.get("initial_balance", 0)
    total = initial
    txns = await db.transactions.find({"$or": [{"account_id": account_id}, {"to_account_id": account_id}]}, {"_id": 0}).to_list(length=100000)
    for t in txns:
        if t["type"] == "income" or t["type"] == "refund":
            if t["account_id"] == account_id:
                total += t["amount"]
        elif t["type"] == "expense":
            if t["account_id"] == account_id:
                total -= t["amount"]
        elif t["type"] == "transfer":
            if t["account_id"] == account_id:
                total -= t["amount"]
            if t.get("to_account_id") == account_id:
                total += t["amount"]
        elif t["type"] == "adjustment":
            if t["account_id"] == account_id:
                total += t["amount"]
    await db.accounts.update_one({"id": account_id}, {"$set": {"current_balance": total}})


async def audit_log(action: str, entity: str, entity_id: str, data: Optional[dict] = None):
    await db.audit_logs.insert_one({
        "id": new_id(),
        "action": action,
        "entity": entity,
        "entity_id": entity_id,
        "data": data or {},
        "timestamp": now_iso(),
    })


# =========================================================
# Accounts
# =========================================================

@api_router.get("/accounts")
async def list_accounts():
    return await find_all("accounts", "created_at", 1)


@api_router.post("/accounts")
async def create_account(a: Account):
    d = a.model_dump()
    d["current_balance"] = d["initial_balance"]
    await db.accounts.insert_one(d)
    return clean(d)


@api_router.put("/accounts/{account_id}")
async def update_account(account_id: str, a: Account):
    d = a.model_dump()
    d["id"] = account_id
    await db.accounts.update_one({"id": account_id}, {"$set": d})
    await recompute_account_balance(account_id)
    return clean(d)


@api_router.delete("/accounts/{account_id}")
async def delete_account(account_id: str):
    await db.accounts.delete_one({"id": account_id})
    return {"ok": True}


# =========================================================
# Categories
# =========================================================

@api_router.get("/categories")
async def list_categories():
    return await find_all("categories")


@api_router.post("/categories")
async def create_category(c: Category):
    d = c.model_dump()
    await db.categories.insert_one(d)
    return clean(d)


@api_router.put("/categories/{category_id}")
async def update_category(category_id: str, c: Category):
    d = c.model_dump()
    d["id"] = category_id
    await db.categories.update_one({"id": category_id}, {"$set": d})
    return clean(d)


@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str):
    await db.categories.update_one({"id": category_id}, {"$set": {"archived": True}})
    return {"ok": True}


# =========================================================
# Transactions
# =========================================================

@api_router.get("/transactions")
async def list_transactions(
    account_id: Optional[str] = None,
    category_id: Optional[str] = None,
    type: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    q: Optional[str] = None,
    tag: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    limit: int = 500,
):
    query: Dict[str, Any] = {}
    if account_id:
        query["$or"] = [{"account_id": account_id}, {"to_account_id": account_id}]
    if category_id:
        query["category_id"] = category_id
    if type:
        query["type"] = type
    if date_from or date_to:
        query["date"] = {}
        if date_from:
            query["date"]["$gte"] = date_from
        if date_to:
            query["date"]["$lte"] = date_to
    if tag:
        query["tags"] = tag
    if min_amount is not None:
        query.setdefault("amount", {})["$gte"] = min_amount
    if max_amount is not None:
        query.setdefault("amount", {})["$lte"] = max_amount
    if q:
        query["$or"] = [
            {"note": {"$regex": q, "$options": "i"}},
            {"payee": {"$regex": q, "$options": "i"}},
        ]
    cur = db.transactions.find(query, {"_id": 0}).sort([("date", -1), ("time", -1)])
    return await cur.to_list(length=limit)


@api_router.post("/transactions")
async def create_transaction(t: Transaction):
    d = t.model_dump()
    await db.transactions.insert_one(d)
    await recompute_account_balance(d["account_id"])
    if d.get("to_account_id"):
        await recompute_account_balance(d["to_account_id"])
    if d.get("debt_id"):
        await apply_debt_payment(d["debt_id"], d["amount"], d["date"])
    if d.get("savings_goal_id"):
        await apply_savings_deposit(d["savings_goal_id"], d["amount"])
    if d.get("bill_id"):
        await db.bills.update_one({"id": d["bill_id"]}, {"$set": {"is_paid": True}})
    await audit_log("create", "transaction", d["id"], d)
    return clean(d)


@api_router.put("/transactions/{transaction_id}")
async def update_transaction(transaction_id: str, t: Transaction):
    existing = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Not found")
    d = t.model_dump()
    d["id"] = transaction_id
    await db.transactions.update_one({"id": transaction_id}, {"$set": d})
    for aid in {existing.get("account_id"), existing.get("to_account_id"), d.get("account_id"), d.get("to_account_id")}:
        if aid:
            await recompute_account_balance(aid)
    await audit_log("update", "transaction", transaction_id, d)
    return clean(d)


@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: str):
    existing = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Not found")
    await db.transactions.delete_one({"id": transaction_id})
    for aid in {existing.get("account_id"), existing.get("to_account_id")}:
        if aid:
            await recompute_account_balance(aid)
    await audit_log("delete", "transaction", transaction_id, existing)
    return {"ok": True, "deleted": existing}


# =========================================================
# Budgets
# =========================================================

@api_router.get("/budgets")
async def list_budgets(month: Optional[int] = None, year: Optional[int] = None):
    q: Dict[str, Any] = {}
    if month:
        q["month"] = month
    if year:
        q["year"] = year
    return await db.budgets.find(q, {"_id": 0}).to_list(length=1000)


@api_router.post("/budgets")
async def create_budget(b: Budget):
    d = b.model_dump()
    await db.budgets.insert_one(d)
    return clean(d)


@api_router.put("/budgets/{budget_id}")
async def update_budget(budget_id: str, b: Budget):
    d = b.model_dump()
    d["id"] = budget_id
    await db.budgets.update_one({"id": budget_id}, {"$set": d})
    return clean(d)


@api_router.delete("/budgets/{budget_id}")
async def delete_budget(budget_id: str):
    await db.budgets.delete_one({"id": budget_id})
    return {"ok": True}


@api_router.post("/budgets/copy")
async def copy_budgets(from_month: int, from_year: int, to_month: int, to_year: int):
    src = await db.budgets.find({"month": from_month, "year": from_year}, {"_id": 0}).to_list(length=1000)
    inserted = 0
    for b in src:
        b_new = {**b, "id": new_id(), "month": to_month, "year": to_year}
        await db.budgets.insert_one(b_new)
        inserted += 1
    return {"copied": inserted}


# =========================================================
# Bills
# =========================================================

@api_router.get("/bills")
async def list_bills():
    return await db.bills.find({}, {"_id": 0}).sort("due_date", 1).to_list(length=1000)


@api_router.post("/bills")
async def create_bill(b: Bill):
    d = b.model_dump()
    await db.bills.insert_one(d)
    return clean(d)


@api_router.put("/bills/{bill_id}")
async def update_bill(bill_id: str, b: Bill):
    d = b.model_dump()
    d["id"] = bill_id
    await db.bills.update_one({"id": bill_id}, {"$set": d})
    return clean(d)


@api_router.delete("/bills/{bill_id}")
async def delete_bill(bill_id: str):
    await db.bills.delete_one({"id": bill_id})
    return {"ok": True}


# =========================================================
# Debt / Credit
# =========================================================

async def apply_debt_payment(debt_id: str, amount: float, date: str):
    dc = await db.debts.find_one({"id": debt_id}, {"_id": 0})
    if not dc:
        return
    payments = dc.get("payments", [])
    payments.append({"id": new_id(), "date": date, "amount": amount, "note": None})
    total_paid = sum(p["amount"] for p in payments)
    status = "paid" if total_paid >= dc["initial_amount"] else "active"
    await db.debts.update_one({"id": debt_id}, {"$set": {"payments": payments, "status": status}})


@api_router.get("/debts")
async def list_debts():
    items = await db.debts.find({}, {"_id": 0}).to_list(length=1000)
    for it in items:
        paid = sum(p["amount"] for p in it.get("payments", []))
        it["paid_amount"] = paid
        it["remaining"] = it["initial_amount"] - paid
    return items


@api_router.post("/debts")
async def create_debt(d: DebtCredit):
    doc = d.model_dump()
    await db.debts.insert_one(doc)
    return clean(doc)


@api_router.put("/debts/{debt_id}")
async def update_debt(debt_id: str, d: DebtCredit):
    doc = d.model_dump()
    doc["id"] = debt_id
    await db.debts.update_one({"id": debt_id}, {"$set": doc})
    return clean(doc)


@api_router.delete("/debts/{debt_id}")
async def delete_debt(debt_id: str):
    await db.debts.delete_one({"id": debt_id})
    return {"ok": True}


# =========================================================
# Savings goals
# =========================================================

async def apply_savings_deposit(goal_id: str, amount: float):
    g = await db.savings.find_one({"id": goal_id}, {"_id": 0})
    if not g:
        return
    new_current = g.get("current_amount", 0) + amount
    await db.savings.update_one({"id": goal_id}, {"$set": {"current_amount": new_current}})


@api_router.get("/savings")
async def list_savings():
    return await db.savings.find({}, {"_id": 0}).to_list(length=1000)


@api_router.post("/savings")
async def create_savings(s: SavingsGoal):
    d = s.model_dump()
    await db.savings.insert_one(d)
    return clean(d)


@api_router.put("/savings/{goal_id}")
async def update_savings(goal_id: str, s: SavingsGoal):
    d = s.model_dump()
    d["id"] = goal_id
    await db.savings.update_one({"id": goal_id}, {"$set": d})
    return clean(d)


@api_router.delete("/savings/{goal_id}")
async def delete_savings(goal_id: str):
    await db.savings.delete_one({"id": goal_id})
    return {"ok": True}


# =========================================================
# Notes
# =========================================================

@api_router.get("/notes")
async def list_notes():
    return await db.notes.find({}, {"_id": 0}).sort("date", -1).to_list(length=1000)


@api_router.post("/notes")
async def create_note(n: Note):
    d = n.model_dump()
    await db.notes.insert_one(d)
    return clean(d)


@api_router.put("/notes/{note_id}")
async def update_note(note_id: str, n: Note):
    d = n.model_dump()
    d["id"] = note_id
    await db.notes.update_one({"id": note_id}, {"$set": d})
    return clean(d)


@api_router.delete("/notes/{note_id}")
async def delete_note(note_id: str):
    await db.notes.delete_one({"id": note_id})
    return {"ok": True}


# =========================================================
# Settings
# =========================================================

@api_router.get("/settings")
async def get_settings():
    s = await db.settings.find_one({"id": "singleton"}, {"_id": 0})
    if not s:
        default = Settings().model_dump()
        default["id"] = "singleton"
        await db.settings.insert_one(default)
        default.pop("_id", None)
        return default
    return s


@api_router.put("/settings")
async def update_settings(s: Settings):
    d = s.model_dump()
    d["id"] = "singleton"
    await db.settings.update_one({"id": "singleton"}, {"$set": d}, upsert=True)
    return d


# =========================================================
# Dashboard summary
# =========================================================

@api_router.get("/dashboard")
async def dashboard(month: Optional[int] = None, year: Optional[int] = None):
    now = datetime.now(timezone(timedelta(hours=7)))
    m = month or now.month
    y = year or now.year
    prefix = f"{y:04d}-{m:02d}"

    accounts = await db.accounts.find({"active": True}, {"_id": 0}).to_list(length=1000)
    total_balance = sum(a.get("current_balance", 0) for a in accounts)
    primary = accounts[0] if accounts else None

    txns_month = await db.transactions.find({"date": {"$regex": f"^{prefix}"}}, {"_id": 0}).to_list(length=10000)
    income = sum(t["amount"] for t in txns_month if t["type"] in ("income", "refund"))
    expense = sum(t["amount"] for t in txns_month if t["type"] == "expense")

    budgets = await db.budgets.find({"month": m, "year": y}, {"_id": 0}).to_list(length=1000)
    total_budget = sum(b["amount"] for b in budgets)
    remaining_budget = total_budget - expense

    debts = await db.debts.find({"status": "active"}, {"_id": 0}).to_list(length=1000)
    total_debt = 0
    total_credit = 0
    for d in debts:
        paid = sum(p["amount"] for p in d.get("payments", []))
        remaining = d["initial_amount"] - paid
        if d["type"] in ("debt", "loan"):
            total_debt += remaining
        else:
            total_credit += remaining

    bills = await db.bills.find({"is_paid": False}, {"_id": 0}).sort("due_date", 1).to_list(length=10)

    top_expenses = sorted([t for t in txns_month if t["type"] == "expense"], key=lambda x: -x["amount"])[:5]

    # 6-month chart (calendar-accurate)
    chart = []
    for i in range(5, -1, -1):
        total_month = (y * 12 + (m - 1)) - i
        cy, cm = divmod(total_month, 12)
        cm += 1
        prefix_i = f"{cy:04d}-{cm:02d}"
        m_txns = await db.transactions.find({"date": {"$regex": f"^{prefix_i}"}}, {"_id": 0}).to_list(length=10000)
        m_income = sum(t["amount"] for t in m_txns if t["type"] in ("income", "refund"))
        m_expense = sum(t["amount"] for t in m_txns if t["type"] == "expense")
        chart.append({"label": prefix_i, "income": m_income, "expense": m_expense})

    recent = await db.transactions.find({}, {"_id": 0}).sort([("date", -1), ("time", -1)]).to_list(length=8)

    return {
        "total_balance": total_balance,
        "primary_account": primary,
        "income": income,
        "expense": expense,
        "total_budget": total_budget,
        "remaining_budget": remaining_budget,
        "total_debt": total_debt,
        "total_credit": total_credit,
        "upcoming_bills": bills,
        "top_expenses": top_expenses,
        "chart_6m": chart,
        "recent_transactions": recent,
    }


@api_router.get("/reports/net-worth")
async def net_worth():
    accounts = await db.accounts.find({}, {"_id": 0}).to_list(length=1000)
    liquid = sum(a.get("current_balance", 0) for a in accounts if a["type"] in ("bank", "cash", "ewallet"))
    savings_accs = sum(a.get("current_balance", 0) for a in accounts if a["type"] == "savings")
    investments = sum(a.get("current_balance", 0) for a in accounts if a["type"] == "investment")
    credit_card_debt = sum(-a.get("current_balance", 0) for a in accounts if a["type"] == "credit_card" and a.get("current_balance", 0) < 0)

    debts = await db.debts.find({"status": "active"}, {"_id": 0}).to_list(length=1000)
    total_debt = 0
    total_credit = 0
    for d in debts:
        paid = sum(p["amount"] for p in d.get("payments", []))
        remaining = d["initial_amount"] - paid
        if d["type"] in ("debt", "loan"):
            total_debt += remaining
        else:
            total_credit += remaining

    assets = liquid + savings_accs + investments + total_credit
    liabilities = total_debt + credit_card_debt
    net = assets - liabilities
    return {
        "liquid": liquid,
        "savings": savings_accs,
        "investments": investments,
        "receivables": total_credit,
        "debts": total_debt,
        "credit_card_debt": credit_card_debt,
        "assets": assets,
        "liabilities": liabilities,
        "net_worth": net,
    }


# =========================================================
# Global search
# =========================================================

@api_router.get("/search")
async def global_search(q: str):
    regex = {"$regex": q, "$options": "i"}
    return {
        "transactions": await db.transactions.find({"$or": [{"note": regex}, {"payee": regex}]}, {"_id": 0}).limit(20).to_list(20),
        "accounts": await db.accounts.find({"name": regex}, {"_id": 0}).to_list(20),
        "categories": await db.categories.find({"name": regex}, {"_id": 0}).to_list(20),
        "debts": await db.debts.find({"party_name": regex}, {"_id": 0}).to_list(20),
        "savings": await db.savings.find({"name": regex}, {"_id": 0}).to_list(20),
        "notes": await db.notes.find({"$or": [{"title": regex}, {"content": regex}]}, {"_id": 0}).to_list(20),
    }


# =========================================================
# Export / Backup / Reset
# =========================================================

@api_router.get("/export/backup")
async def export_backup():
    return {
        "accounts": await db.accounts.find({}, {"_id": 0}).to_list(10000),
        "categories": await db.categories.find({}, {"_id": 0}).to_list(10000),
        "transactions": await db.transactions.find({}, {"_id": 0}).to_list(100000),
        "budgets": await db.budgets.find({}, {"_id": 0}).to_list(10000),
        "bills": await db.bills.find({}, {"_id": 0}).to_list(10000),
        "debts": await db.debts.find({}, {"_id": 0}).to_list(10000),
        "savings": await db.savings.find({}, {"_id": 0}).to_list(10000),
        "notes": await db.notes.find({}, {"_id": 0}).to_list(10000),
        "settings": await db.settings.find({}, {"_id": 0}).to_list(10),
        "exported_at": now_iso(),
    }


@api_router.post("/reset")
async def reset_all(confirm: str):
    if confirm != "HAPUS_SEMUA":
        raise HTTPException(400, "Konfirmasi tidak valid")
    for coll in ["accounts", "categories", "transactions", "budgets", "bills", "debts", "savings", "notes", "audit_logs"]:
        await db[coll].delete_many({})
    return {"ok": True}


# =========================================================
# Seed dummy data
# =========================================================

DEFAULT_CATEGORIES_INCOME = [
    ("Gaji", "#4A7C59", "briefcase"),
    ("Honor", "#6BB382", "medal"),
    ("Bonus", "#34C759", "gift"),
    ("Penjualan", "#8DB596", "storefront"),
    ("Hadiah", "#FF9F0A", "gift"),
    ("Pengembalian dana", "#B7D5BE", "arrow-u-left-top"),
    ("Pendapatan lain", "#A3CCAE", "cash"),
]

DEFAULT_CATEGORIES_EXPENSE = [
    ("Makanan", "#FF9F0A", "food"),
    ("Transportasi", "#FF7A45", "car"),
    ("Tagihan", "#FF3B30", "file-document"),
    ("Internet", "#5AC8FA", "wifi"),
    ("Pulsa", "#AF52DE", "cellphone"),
    ("Belanja", "#FF2D55", "shopping"),
    ("Kesehatan", "#34C759", "medical-bag"),
    ("Pendidikan", "#FFCC00", "school"),
    ("Hiburan", "#FF69B4", "movie"),
    ("Keluarga", "#8E8E93", "account-group"),
    ("Donasi", "#4A7C59", "hand-heart"),
    ("Tempat tinggal", "#A2845E", "home"),
    ("Pajak", "#8B4513", "bank"),
    ("Biaya admin", "#8E8E93", "receipt"),
    ("Lainnya", "#C7C7CC", "dots-horizontal"),
]


@api_router.post("/seed")
async def seed_data(force: bool = False):
    exists = await db.accounts.count_documents({})
    if exists > 0 and not force:
        return {"ok": True, "message": "Data sudah ada", "skipped": True}

    # Wipe
    for coll in ["accounts", "categories", "transactions", "budgets", "bills", "debts", "savings", "notes"]:
        await db[coll].delete_many({})

    # Categories
    cats = {}
    for name, color, icon in DEFAULT_CATEGORIES_INCOME:
        c = Category(name=name, type="income", color=color, icon=icon).model_dump()
        await db.categories.insert_one(c)
        cats[name] = c["id"]
    for name, color, icon in DEFAULT_CATEGORIES_EXPENSE:
        c = Category(name=name, type="expense", color=color, icon=icon).model_dump()
        await db.categories.insert_one(c)
        cats[name] = c["id"]

    # Accounts
    accounts_def = [
        ("BCA Utama", "bank", 8500000, "**** 3421", "#4A7C59", "bank"),
        ("Dompet Tunai", "cash", 350000, None, "#FF9F0A", "wallet"),
        ("GoPay", "ewallet", 275000, "**** 8812", "#00A86B", "cellphone"),
        ("CC Mandiri", "credit_card", -1250000, "**** 4409", "#FF3B30", "credit-card"),
        ("Tabungan Rumah", "savings", 12500000, "**** 7788", "#8DB596", "piggy-bank"),
    ]
    acc_ids = []
    for name, tp, bal, num, color, icon in accounts_def:
        a = Account(name=name, type=tp, initial_balance=bal, current_balance=bal, masked_number=num, color=color, icon=icon).model_dump()
        await db.accounts.insert_one(a)
        acc_ids.append(a["id"])

    # Bills
    now = datetime.now(timezone(timedelta(hours=7)))
    bills_def = [
        ("Listrik PLN", 385000, "Tagihan", 5),
        ("Internet IndiHome", 425000, "Internet", 10),
        ("Netflix", 65000, "Hiburan", 15),
        ("Cicilan Motor", 1250000, "Tagihan", 20),
        ("Air PDAM", 145000, "Tagihan", 25),
    ]
    for name, amt, cat, day in bills_def:
        due = now.replace(day=min(day, 28))
        if due < now:
            due = (due.replace(day=1) + timedelta(days=32)).replace(day=min(day, 28))
        b = Bill(name=name, amount=amt, category_id=cats.get(cat), account_id=acc_ids[0], due_date=due.strftime("%Y-%m-%d")).model_dump()
        await db.bills.insert_one(b)

    # Debts & credits
    debts_def = [
        ("Andi", "credit", 500000, 3),
        ("Budi", "debt", 1500000, 10),
        ("Cici", "credit", 300000, 20),
    ]
    for name, tp, amt, days_ago in debts_def:
        dt = now - timedelta(days=days_ago)
        dc = DebtCredit(party_name=name, type=tp, initial_amount=amt, date=dt.strftime("%Y-%m-%d"), due_date=(dt + timedelta(days=30)).strftime("%Y-%m-%d")).model_dump()
        await db.debts.insert_one(dc)

    # Savings goals
    savings_def = [
        ("Dana Darurat", 25000000, 8500000, 180),
        ("Laptop Baru", 15000000, 4200000, 120),
        ("Liburan Bali", 8000000, 2100000, 90),
        ("Modal Usaha", 30000000, 5500000, 365),
    ]
    for name, target, current, days_ahead in savings_def:
        s = SavingsGoal(name=name, target_amount=target, current_amount=current, target_date=(now + timedelta(days=days_ahead)).strftime("%Y-%m-%d"), periodic_deposit=target / 12).model_dump()
        await db.savings.insert_one(s)

    # Transactions (last 90 days, ~35 total)
    import random
    random.seed(42)
    expense_payees = {
        "Makanan": ["Warteg Mama", "Gojek Food", "GrabFood", "Kopi Kenangan", "Indomaret"],
        "Transportasi": ["Gojek", "Grab", "SPBU Pertamina", "Parkir Mall"],
        "Belanja": ["Tokopedia", "Shopee", "Uniqlo", "H&M"],
        "Hiburan": ["Netflix", "Bioskop XXI", "Spotify"],
        "Kesehatan": ["Apotek K24", "Klinik Sehat"],
        "Internet": ["IndiHome"],
        "Pulsa": ["Telkomsel"],
        "Tempat tinggal": ["Kos Bulanan"],
        "Biaya admin": ["Biaya Transfer", "Admin Bulanan"],
    }
    for i in range(35):
        days_ago = random.randint(0, 85)
        dt = now - timedelta(days=days_ago)
        tp = random.choices(["expense", "income", "transfer"], weights=[70, 20, 10])[0]
        if tp == "income":
            cat_name = random.choice(["Gaji", "Bonus", "Honor", "Penjualan", "Pendapatan lain"])
            amt = random.choice([7500000, 500000, 350000, 250000, 1250000, 850000])
            t = Transaction(
                date=dt.strftime("%Y-%m-%d"),
                time=f"{random.randint(8,20):02d}:{random.randint(0,59):02d}",
                type="income",
                amount=amt,
                account_id=acc_ids[0],
                category_id=cats.get(cat_name),
                payee={"Gaji": "PT Emergent Nusantara", "Bonus": "Bonus Kinerja", "Honor": "Klien Freelance", "Penjualan": "Marketplace"}.get(cat_name, "Sumber Lain"),
                note=None,
            ).model_dump()
        elif tp == "expense":
            cat_name = random.choice(list(expense_payees.keys()))
            amt = random.choice([15000, 25000, 45000, 75000, 125000, 250000, 450000, 850000, 1250000])
            t = Transaction(
                date=dt.strftime("%Y-%m-%d"),
                time=f"{random.randint(8,22):02d}:{random.randint(0,59):02d}",
                type="expense",
                amount=amt,
                account_id=random.choice(acc_ids[:3]),
                category_id=cats.get(cat_name),
                payee=random.choice(expense_payees[cat_name]),
                method=random.choice(["Debit", "QRIS", "Tunai", "Transfer"]),
            ).model_dump()
        else:
            amt = random.choice([250000, 500000, 1000000, 1500000])
            src, dst = random.sample(acc_ids[:5], 2)
            t = Transaction(
                date=dt.strftime("%Y-%m-%d"),
                time=f"{random.randint(8,20):02d}:{random.randint(0,59):02d}",
                type="transfer",
                amount=amt,
                account_id=src,
                to_account_id=dst,
                note="Transfer antar-akun",
            ).model_dump()
        await db.transactions.insert_one(t)

    # Recompute balances
    for aid in acc_ids:
        await recompute_account_balance(aid)

    # Budgets for current month
    budget_def = [
        ("Makanan", 2000000),
        ("Transportasi", 800000),
        ("Belanja", 1500000),
        ("Hiburan", 500000),
        ("Tagihan", 2500000),
    ]
    for cat_name, amt in budget_def:
        b = Budget(category_id=cats.get(cat_name), amount=amt, month=now.month, year=now.year).model_dump()
        await db.budgets.insert_one(b)

    # Notes
    notes_def = [
        ("plan", "Rencana Keuangan Q2", "Fokus menabung untuk dana darurat. Target 25jt akhir tahun."),
        ("saving_idea", "Ide Hemat", "Bawa bekal dari rumah minimal 3x/minggu untuk hemat makan siang."),
        ("purchase", "Pertimbangan Laptop", "Bandingkan MacBook Air M3 vs ThinkPad. Cek promo akhir bulan."),
        ("journal", "Refleksi Bulanan", "Bulan ini pengeluaran makanan meningkat. Perlu batasi ordering online."),
    ]
    for tp, title, content in notes_def:
        n = Note(type=tp, title=title, content=content, date=now.strftime("%Y-%m-%d")).model_dump()
        await db.notes.insert_one(n)

    return {"ok": True, "message": "Data dummy berhasil dibuat"}


# =========================================================
# Root & registration
# =========================================================

@api_router.get("/")
async def root():
    return {"app": "LifeDesk", "status": "ok"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
