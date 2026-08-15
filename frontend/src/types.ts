export type AccountType = "bank" | "cash" | "ewallet" | "credit_card" | "savings" | "investment";
export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initial_balance: number;
  current_balance: number;
  masked_number?: string | null;
  color: string;
  icon: string;
  active: boolean;
  created_at?: string;
}

export type CategoryType = "income" | "expense";
export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  color: string;
  icon: string;
  parent_id?: string | null;
  archived: boolean;
}

export type TxType = "income" | "expense" | "transfer" | "refund" | "adjustment";
export interface Transaction {
  id: string;
  date: string;
  time: string;
  type: TxType;
  amount: number;
  account_id: string;
  to_account_id?: string | null;
  category_id?: string | null;
  subcategory_id?: string | null;
  payee?: string | null;
  method?: string | null;
  note?: string | null;
  tags: string[];
  attachment?: string | null;
  is_recurring: boolean;
  verified: boolean;
  debt_id?: string | null;
  savings_goal_id?: string | null;
  bill_id?: string | null;
}

export interface Budget {
  id: string;
  category_id?: string | null;
  period: "monthly" | "weekly";
  amount: number;
  month: number;
  year: number;
}

export interface Bill {
  id: string;
  name: string;
  amount: number;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  due_date: string;
  category_id?: string | null;
  account_id?: string | null;
  is_paid: boolean;
  fixed: boolean;
  notes?: string | null;
  reminder: boolean;
}

export interface Payment {
  id: string;
  date: string;
  amount: number;
  note?: string | null;
}

export interface DebtCredit {
  id: string;
  party_name: string;
  type: "debt" | "credit" | "loan" | "cashbon" | "installment";
  initial_amount: number;
  date: string;
  due_date?: string | null;
  payments: Payment[];
  account_id?: string | null;
  notes?: string | null;
  status: "active" | "paid";
  paid_amount?: number;
  remaining?: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date?: string | null;
  periodic_deposit?: number | null;
  account_id?: string | null;
  notes?: string | null;
}

export interface Note {
  id: string;
  type: "plan" | "purchase" | "debt" | "saving_idea" | "journal";
  title: string;
  content: string;
  date: string;
}

export interface Settings {
  id?: string;
  user_name: string;
  currency: string;
  date_format: string;
  timezone: string;
  theme: "light" | "dark" | "system";
  notify_budget: boolean;
}

export interface DashboardData {
  total_balance: number;
  primary_account: Account | null;
  income: number;
  expense: number;
  total_budget: number;
  remaining_budget: number;
  total_debt: number;
  total_credit: number;
  upcoming_bills: Bill[];
  top_expenses: Transaction[];
  chart_6m: { label: string; income: number; expense: number }[];
  recent_transactions: Transaction[];
}
