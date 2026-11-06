export const SCHEMA_STATEMENTS = [
  // Enable foreign keys
  `PRAGMA foreign_keys = ON;`,

  // Carpool Owners
  `CREATE TABLE IF NOT EXISTS carpool_owners (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    default_morning_fare_paise INTEGER NOT NULL DEFAULT 6000,
    default_evening_fare_paise INTEGER NOT NULL DEFAULT 6000,
    notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  // Commute Days (One record per calendar date)
  `CREATE TABLE IF NOT EXISTS commute_days (
    id TEXT PRIMARY KEY NOT NULL,
    date TEXT UNIQUE NOT NULL,
    commute_type TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  // Commute Trips (Trips on a specific commute day)
  `CREATE TABLE IF NOT EXISTS commute_trips (
    id TEXT PRIMARY KEY NOT NULL,
    commute_day_id TEXT NOT NULL REFERENCES commute_days(id) ON DELETE CASCADE,
    owner_id TEXT REFERENCES carpool_owners(id) ON DELETE SET NULL,
    trip_type TEXT NOT NULL,
    fare_paise INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  // Payments (Settlements made to carpool owners)
  `CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY NOT NULL,
    owner_id TEXT NOT NULL REFERENCES carpool_owners(id) ON DELETE RESTRICT,
    amount_paise INTEGER NOT NULL,
    payment_date TEXT NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'upi',
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  // Payment Allocations (Mapping payments to specific trips)
  `CREATE TABLE IF NOT EXISTS payment_allocations (
    id TEXT PRIMARY KEY NOT NULL,
    payment_id TEXT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    commute_trip_id TEXT NOT NULL REFERENCES commute_trips(id) ON DELETE CASCADE,
    allocated_amount_paise INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );`,

  // App Settings
  `CREATE TABLE IF NOT EXISTS app_settings (
    id TEXT PRIMARY KEY NOT NULL,
    reminder_enabled INTEGER NOT NULL DEFAULT 1,
    reminder_hour INTEGER NOT NULL DEFAULT 21,
    reminder_minute INTEGER NOT NULL DEFAULT 0,
    secondary_reminder_enabled INTEGER NOT NULL DEFAULT 0,
    secondary_reminder_hour INTEGER NOT NULL DEFAULT 22,
    secondary_reminder_minute INTEGER NOT NULL DEFAULT 0,
    default_owner_id TEXT REFERENCES carpool_owners(id) ON DELETE SET NULL,
    theme TEXT NOT NULL DEFAULT 'system',
    currency TEXT NOT NULL DEFAULT 'INR',
    currency_symbol TEXT NOT NULL DEFAULT '₹',
    working_days TEXT NOT NULL DEFAULT '1,2,3,4,5',
    tracking_start_date TEXT
  );`,

  // Audit Logs (Financial and mutation audit trail)
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    previous_data TEXT,
    updated_data TEXT,
    created_at TEXT NOT NULL
  );`,

  // Indexes for query performance
  `CREATE INDEX IF NOT EXISTS idx_commute_days_date ON commute_days(date);`,
  `CREATE INDEX IF NOT EXISTS idx_commute_trips_day_id ON commute_trips(commute_day_id);`,
  `CREATE INDEX IF NOT EXISTS idx_commute_trips_owner_id ON commute_trips(owner_id);`,
  `CREATE INDEX IF NOT EXISTS idx_payments_owner_id ON payments(owner_id);`,
  `CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);`,
  `CREATE INDEX IF NOT EXISTS idx_allocations_payment_id ON payment_allocations(payment_id);`,
  `CREATE INDEX IF NOT EXISTS idx_allocations_trip_id ON payment_allocations(commute_trip_id);`,
];
