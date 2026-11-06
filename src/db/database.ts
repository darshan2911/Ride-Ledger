import type { AppSettings, CarpoolOwner } from './types';
import * as SQLite from 'expo-sqlite';
import { getTodayDateString } from '@/lib/currency';
import { SCHEMA_STATEMENTS } from './schema';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let isInitialized = false;

export const DB_NAME = 'rideledger.db';

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync(DB_NAME);
    try {
      dbInstance.execSync('PRAGMA foreign_keys = ON;');
    }
    catch (e) {
      console.warn('Failed to enable foreign keys:', e);
    }
  }
  if (!isInitialized) {
    initDatabase();
  }
  return dbInstance;
}

export function initDatabase(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync(DB_NAME);
    try {
      dbInstance.execSync('PRAGMA foreign_keys = ON;');
    }
    catch (e) {
      console.warn('Failed to enable foreign keys:', e);
    }
  }
  const db = dbInstance;
  if (isInitialized)
    return db;

  // Run schema creation
  for (const statement of SCHEMA_STATEMENTS) {
    try {
      db.execSync(statement);
    }
    catch (error) {
      console.error('Error executing schema statement:', statement, error);
      throw error;
    }
  }
  isInitialized = true;

  // Ensure default app settings exist
  const existingSettings = db.getFirstSync<AppSettings>(
    'SELECT * FROM app_settings WHERE id = ?',
    ['default'],
  );

  if (!existingSettings) {
    const todayDate = getTodayDateString();
    db.runSync(
      `INSERT INTO app_settings (
        id, reminder_enabled, reminder_hour, reminder_minute,
        secondary_reminder_enabled, secondary_reminder_hour, secondary_reminder_minute,
        default_owner_id, theme, currency, currency_symbol, working_days, tracking_start_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'default',
        1, // reminder_enabled
        21, // 9:00 PM
        0,
        0, // secondary disabled by default
        22, // 10:00 PM
        0,
        null,
        'system',
        'INR',
        '₹',
        '1,2,3,4,5', // Mon - Fri
        todayDate,
      ],
    );
  }

  // Safe migration: Add tracking_start_date to app_settings if upgrading
  try {
    db.runSync('ALTER TABLE app_settings ADD COLUMN tracking_start_date TEXT');
    const todayDate = getTodayDateString();
    db.runSync('UPDATE app_settings SET tracking_start_date = ? WHERE tracking_start_date IS NULL', [todayDate]);
  }
  catch {
    // Column already exists
  }

  return db;
}

export function resetToFactoryCleanSlate() {
  const db = getDatabase();
  const todayDate = getTodayDateString();
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM payment_allocations');
    db.runSync('DELETE FROM payments');
    db.runSync('DELETE FROM commute_trips');
    db.runSync('DELETE FROM commute_days');
    db.runSync('DELETE FROM carpool_owners');
    db.runSync('DELETE FROM audit_logs');
    db.runSync(
      'UPDATE app_settings SET default_owner_id = NULL, tracking_start_date = ? WHERE id = "default"',
      [todayDate],
    );
  });
}

export function recordAuditLog(
  entityType: string,
  entityId: string,
  action: 'create' | 'update' | 'delete' | 'settle',
  previousData?: unknown,
  updatedData?: unknown,
) {
  try {
    const db = getDatabase();
    const id = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();
    db.runSync(
      `INSERT INTO audit_logs (id, entity_type, entity_id, action, previous_data, updated_data, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        entityType,
        entityId,
        action,
        previousData ? JSON.stringify(previousData) : null,
        updatedData ? JSON.stringify(updatedData) : null,
        now,
      ],
    );
  }
  catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
