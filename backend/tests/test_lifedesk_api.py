"""LifeDesk backend regression tests"""
import os
import pytest
import requests
from datetime import datetime, timezone, timedelta

BASE = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://catatan-duit-2.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"

# Server timezone is Asia/Jakarta (UTC+7) per backend dashboard
def today_wib():
    return datetime.now(timezone(timedelta(hours=7))).strftime("%Y-%m-%d")


# ---------- Health & seed ----------
class TestHealthAndSeed:
    def test_root(self, api_client):
        r = api_client.get(f"{API}/")
        assert r.status_code == 200
        assert r.json().get("status") == "ok"

    def test_seed_force(self, api_client):
        r = api_client.post(f"{API}/seed?force=true")
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_seed_counts(self, api_client):
        accts = api_client.get(f"{API}/accounts").json()
        assert len(accts) == 5, f"expected 5 accounts got {len(accts)}"
        txns = api_client.get(f"{API}/transactions").json()
        assert len(txns) >= 30, f"expected >=30 txns got {len(txns)}"
        bills = api_client.get(f"{API}/bills").json()
        assert len(bills) == 5
        debts = api_client.get(f"{API}/debts").json()
        assert len(debts) == 3
        savings = api_client.get(f"{API}/savings").json()
        assert len(savings) == 4


# ---------- Dashboard ----------
class TestDashboard:
    def test_dashboard_shape(self, api_client):
        r = api_client.get(f"{API}/dashboard")
        assert r.status_code == 200
        d = r.json()
        for k in ["total_balance", "income", "expense", "chart_6m",
                  "upcoming_bills", "recent_transactions", "top_expenses",
                  "total_debt", "total_credit"]:
            assert k in d, f"missing {k}"
        assert len(d["chart_6m"]) == 6
        for c in d["chart_6m"]:
            assert "label" in c and "income" in c and "expense" in c


# ---------- Listing endpoints ----------
class TestListings:
    def test_categories(self, api_client):
        r = api_client.get(f"{API}/categories")
        assert r.status_code == 200
        cats = r.json()
        assert len(cats) >= 20
        assert any(c["type"] == "income" for c in cats)
        assert any(c["type"] == "expense" for c in cats)

    def test_transactions_filters(self, api_client):
        r = api_client.get(f"{API}/transactions?type=expense")
        assert r.status_code == 200
        assert all(t["type"] == "expense" for t in r.json())
        r2 = api_client.get(f"{API}/transactions?q=Gojek")
        assert r2.status_code == 200

    def test_budgets(self, api_client):
        r = api_client.get(f"{API}/budgets")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_notes(self, api_client):
        r = api_client.get(f"{API}/notes")
        assert r.status_code == 200


# ---------- Transaction lifecycle ----------
class TestTransactionLifecycle:
    def test_expense_updates_balance_and_persists(self, api_client):
        accts = api_client.get(f"{API}/accounts").json()
        acc = accts[0]
        before_bal = acc["current_balance"]
        dash_before = api_client.get(f"{API}/dashboard").json()
        exp_before = dash_before["expense"]

        payload = {
            "date": today_wib(),
            "type": "expense",
            "amount": 12345,
            "account_id": acc["id"],
            "payee": "TEST_expense",
        }
        r = api_client.post(f"{API}/transactions", json=payload)
        assert r.status_code == 200
        tx = r.json()
        assert tx["amount"] == 12345
        tid = tx["id"]

        # Verify balance recomputed
        acc_after = [a for a in api_client.get(f"{API}/accounts").json() if a["id"] == acc["id"]][0]
        assert abs(acc_after["current_balance"] - (before_bal - 12345)) < 0.01

        dash_after = api_client.get(f"{API}/dashboard").json()
        assert dash_after["expense"] >= exp_before + 12345 - 0.01

        # Update
        payload["amount"] = 50000
        r2 = api_client.put(f"{API}/transactions/{tid}", json=payload)
        assert r2.status_code == 200
        acc_upd = [a for a in api_client.get(f"{API}/accounts").json() if a["id"] == acc["id"]][0]
        assert abs(acc_upd["current_balance"] - (before_bal - 50000)) < 0.01

        # Delete
        r3 = api_client.delete(f"{API}/transactions/{tid}")
        assert r3.status_code == 200
        acc_final = [a for a in api_client.get(f"{API}/accounts").json() if a["id"] == acc["id"]][0]
        assert abs(acc_final["current_balance"] - before_bal) < 0.01

    def test_transfer_does_not_affect_income_expense(self, api_client):
        accts = api_client.get(f"{API}/accounts").json()
        src, dst = accts[0], accts[1]
        src_bal = src["current_balance"]
        dst_bal = dst["current_balance"]
        dash_before = api_client.get(f"{API}/dashboard").json()

        r = api_client.post(f"{API}/transactions", json={
            "date": today_wib(),
            "type": "transfer",
            "amount": 100000,
            "account_id": src["id"],
            "to_account_id": dst["id"],
            "note": "TEST_transfer",
        })
        assert r.status_code == 200
        tid = r.json()["id"]

        accs2 = {a["id"]: a for a in api_client.get(f"{API}/accounts").json()}
        assert abs(accs2[src["id"]]["current_balance"] - (src_bal - 100000)) < 0.01
        assert abs(accs2[dst["id"]]["current_balance"] - (dst_bal + 100000)) < 0.01

        dash_after = api_client.get(f"{API}/dashboard").json()
        # Transfer must not add to income or expense
        assert abs(dash_after["income"] - dash_before["income"]) < 0.01, "transfer affected income"
        assert abs(dash_after["expense"] - dash_before["expense"]) < 0.01, "transfer affected expense"

        api_client.delete(f"{API}/transactions/{tid}")


# ---------- Debt payment ----------
class TestDebtPayment:
    def test_debt_payment_records_and_updates(self, api_client):
        debts = api_client.get(f"{API}/debts").json()
        d = next((x for x in debts if x["type"] in ("debt", "loan")), None)
        assert d is not None
        remaining_before = d["remaining"]
        accts = api_client.get(f"{API}/accounts").json()
        acc = accts[0]

        r = api_client.post(f"{API}/transactions", json={
            "date": today_wib(),
            "type": "expense",
            "amount": remaining_before,  # fully pay
            "account_id": acc["id"],
            "debt_id": d["id"],
            "note": "TEST_debt_payment",
        })
        assert r.status_code == 200
        tid = r.json()["id"]

        debts_after = api_client.get(f"{API}/debts").json()
        d_after = next(x for x in debts_after if x["id"] == d["id"])
        assert d_after["remaining"] <= 0.01
        assert d_after["status"] == "paid"

        api_client.delete(f"{API}/transactions/{tid}")


# ---------- Savings deposit ----------
class TestSavingsDeposit:
    def test_savings_deposit_increments(self, api_client):
        goals = api_client.get(f"{API}/savings").json()
        g = goals[0]
        before = g["current_amount"]
        accts = api_client.get(f"{API}/accounts").json()

        r = api_client.post(f"{API}/transactions", json={
            "date": today_wib(),
            "type": "expense",
            "amount": 50000,
            "account_id": accts[0]["id"],
            "savings_goal_id": g["id"],
            "note": "TEST_saving",
        })
        assert r.status_code == 200
        tid = r.json()["id"]

        goals_after = api_client.get(f"{API}/savings").json()
        g_after = next(x for x in goals_after if x["id"] == g["id"])
        assert abs(g_after["current_amount"] - (before + 50000)) < 0.01

        api_client.delete(f"{API}/transactions/{tid}")


# ---------- Bill mark paid ----------
class TestBills:
    def test_mark_paid(self, api_client):
        bills = api_client.get(f"{API}/bills").json()
        b = next((x for x in bills if not x["is_paid"]), None)
        assert b is not None
        b["is_paid"] = True
        r = api_client.put(f"{API}/bills/{b['id']}", json=b)
        assert r.status_code == 200
        after = next(x for x in api_client.get(f"{API}/bills").json() if x["id"] == b["id"])
        assert after["is_paid"] is True
        # revert
        after["is_paid"] = False
        api_client.put(f"{API}/bills/{b['id']}", json=after)


# ---------- Budget copy ----------
class TestBudgetCopy:
    def test_copy_budgets(self, api_client):
        from datetime import datetime
        now = datetime.utcnow()
        target_m = 12 if now.month == 1 else now.month - 1
        target_y = now.year - 1 if now.month == 1 else now.year
        r = api_client.post(f"{API}/budgets/copy?from_month={now.month}&from_year={now.year}&to_month={target_m}&to_year={target_y}")
        assert r.status_code == 200
        assert "copied" in r.json()


# ---------- Reports ----------
class TestReports:
    def test_net_worth(self, api_client):
        r = api_client.get(f"{API}/reports/net-worth")
        assert r.status_code == 200
        d = r.json()
        for k in ["assets", "liabilities", "net_worth", "liquid", "savings", "investments"]:
            assert k in d


# ---------- Search ----------
class TestSearch:
    def test_search_returns_buckets(self, api_client):
        r = api_client.get(f"{API}/search?q=a")
        assert r.status_code == 200
        d = r.json()
        for k in ["transactions", "accounts", "categories", "debts", "savings", "notes"]:
            assert k in d


# ---------- Reset ----------
class TestReset:
    def test_reset_invalid_confirm(self, api_client):
        r = api_client.post(f"{API}/reset?confirm=WRONG")
        assert r.status_code == 400

    def test_reset_valid_and_reseed(self, api_client):
        r = api_client.post(f"{API}/reset?confirm=HAPUS_SEMUA")
        assert r.status_code == 200
        accts = api_client.get(f"{API}/accounts").json()
        assert accts == []
        # Re-seed for downstream test consistency
        api_client.post(f"{API}/seed?force=true")
