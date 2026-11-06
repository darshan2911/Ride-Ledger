import type { AppSettings, CarpoolOwner } from './types';
import * as SQLite from 'expo-sqlite';
import { SCHEMA_STATEMENTS } from './schema';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let isInitialized = false;

export const DB_NAME = 'rideledger.db';

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync(DB_NAME);
  }
  if (!isInitialized) {
    initDatabase();
  }
  return dbInstance;
}

export function initDatabase(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync(DB_NAME);
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
    db.runSync(
      `INSERT INTO app_settings (
        id, reminder_enabled, reminder_hour, reminder_minute,
        secondary_reminder_enabled, secondary_reminder_hour, secondary_reminder_minute,
        default_owner_id, theme, currency, currency_symbol, working_days
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      ],
    );
  }

  // Seed default owners if none exist (Raj, Amit, Suresh) as per the prompt requirements
  const ownerCount = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM carpool_owners',
  )?.count ?? 0;

  if (ownerCount === 0) {
    const now = new Date().toISOString();
    const defaultOwners: Omit<CarpoolOwner, 'updated_at'>[] = [
      {
        id: 'owner-raj',
        name: 'Raj',
        phone: '+91 98765 43210',
        default_morning_fare_paise: 6000, // ₹60
        default_evening_fare_paise: 6000, // ₹60
        notes: 'Primary carpool driver. Morning & evening standard route.',
        is_active: 1,
        created_at: now,
      },
      {
        id: 'owner-amit',
        name: 'Amit',
        phone: '+91 98123 45678',
        default_morning_fare_paise: 7000, // ₹70
        default_evening_fare_paise: 6000, // ₹60
        notes: 'Alternate carpool for evening trips or late shifts.',
        is_active: 1,
        created_at: now,
      },
      {
        id: 'owner-suresh',
        name: 'Suresh',
        phone: '+91 99887 76655',
        default_morning_fare_paise: 5000, // ₹50
        default_evening_fare_paise: 5000, // ₹50
        notes: 'Shared commute on Fridays.',
        is_active: 1,
        created_at: now,
      },
    ];

    for (const owner of defaultOwners) {
      db.runSync(
        `INSERT INTO carpool_owners (
          id, name, phone, default_morning_fare_paise, default_evening_fare_paise,
          notes, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          owner.id,
          owner.name,
          owner.phone ?? null,
          owner.default_morning_fare_paise,
          owner.default_evening_fare_paise,
          owner.notes ?? null,
          owner.is_active,
          owner.created_at,
          now,
        ],
      );
    }

    // Set Raj as default owner in app_settings
    db.runSync(
      'UPDATE app_settings SET default_owner_id = ? WHERE id = ?',
      ['owner-raj', 'default'],
    );
  }

  return db;
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
