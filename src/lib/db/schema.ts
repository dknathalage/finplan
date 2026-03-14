export const CREATE_TABLES = `
CREATE TABLE IF NOT EXISTS scenarios (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT,
  is_baseline INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS income_sources (
  id TEXT PRIMARY KEY, scenario_id TEXT NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  name TEXT NOT NULL, amount REAL NOT NULL,
  frequency TEXT NOT NULL CHECK(frequency IN ('weekly','fortnightly','monthly','annually')),
  type TEXT NOT NULL CHECK(type IN ('salary','rental','business','investment','other')),
  is_active INTEGER DEFAULT 1, starts_at TEXT, ends_at TEXT
);
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY, scenario_id TEXT NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  name TEXT NOT NULL, amount REAL NOT NULL,
  frequency TEXT NOT NULL CHECK(frequency IN ('weekly','fortnightly','monthly','annually')),
  category TEXT NOT NULL CHECK(category IN ('housing','transport','food','utilities','insurance','subscriptions','childcare','education','health','entertainment','savings','debt','other')),
  is_fixed INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, value REAL NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('property','vehicle','cash','shares','super','other')),
  notes TEXT, as_of TEXT DEFAULT (date('now'))
);
CREATE TABLE IF NOT EXISTS liabilities (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, balance REAL NOT NULL,
  interest_rate REAL NOT NULL, monthly_payment REAL NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('mortgage','personal_loan','car_loan','credit_card','student_loan','other')),
  notes TEXT
);
CREATE TABLE IF NOT EXISTS properties (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, purchase_price REAL NOT NULL,
  deposit_pct REAL NOT NULL DEFAULT 20, interest_rate REAL NOT NULL,
  loan_term_years INTEGER NOT NULL DEFAULT 30, weekly_rent REAL,
  annual_expenses_pct REAL DEFAULT 1.5,
  purchase_type TEXT NOT NULL CHECK(purchase_type IN ('move_in','rent_out')),
  state TEXT DEFAULT 'VIC', is_first_home INTEGER DEFAULT 0, notes TEXT
);
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, purchase_price REAL NOT NULL,
  purchase_method TEXT NOT NULL CHECK(purchase_method IN ('cash','finance','lease')),
  finance_rate REAL, finance_term_months INTEGER,
  annual_running_cost REAL DEFAULT 3000, notes TEXT
);
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL,
  action TEXT NOT NULL, changes TEXT, created_at TEXT DEFAULT (datetime('now'))
);
`;
