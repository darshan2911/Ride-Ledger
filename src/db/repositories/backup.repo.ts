import { getDatabase, recordAuditLog } from '../database';
import { CommutesRepo } from './commutes.repo';

export type BackupData = {
  version: number;
  exported_at: string;
  app_settings: any[];
  carpool_owners: any[];
  commute_days: any[];
  commute_trips: any[];
  payments: any[];
  payment_allocations: any[];
};

export const BackupRepo = {
  exportDatabaseToJson(): BackupData {
    const db = getDatabase();
    return {
      version: 1,
      exported_at: new Date().toISOString(),
      app_settings: db.getAllSync('SELECT * FROM app_settings'),
      carpool_owners: db.getAllSync('SELECT * FROM carpool_owners'),
      commute_days: db.getAllSync('SELECT * FROM commute_days'),
      commute_trips: db.getAllSync('SELECT * FROM commute_trips'),
      payments: db.getAllSync('SELECT * FROM payments'),
      payment_allocations: db.getAllSync('SELECT * FROM payment_allocations'),
    };
  },

  exportCommuteHistoryToCsv(): string {
    const commutes = CommutesRepo.getCommuteHistory();
    const headers = [
      'Date',
      'Commute Type',
      'Morning Owner',
      'Morning Fare (₹)',
      'Evening Owner',
      'Evening Fare (₹)',
      'Total Fare (₹)',
      'Payment Status',
      'Notes',
    ];

    const rows = commutes.map((c) => {
      const morning = c.trips.find(t => t.trip_type === 'morning');
      const evening = c.trips.find(t => t.trip_type === 'evening');

      return [
        `"${c.date}"`,
        `"${c.commute_type}"`,
        `"${morning?.owner_name || ''}"`,
        (morning ? morning.fare_paise / 100 : 0).toFixed(2),
        `"${evening?.owner_name || ''}"`,
        (evening ? evening.fare_paise / 100 : 0).toFixed(2),
        (c.total_fare_paise / 100).toFixed(2),
        `"${c.payment_status}"`,
        `"${(c.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  },

  importDatabaseFromJson(jsonData: BackupData): { success: boolean; message: string } {
    const db = getDatabase();

    if (!jsonData || typeof jsonData !== 'object' || !Array.isArray(jsonData.carpool_owners)) {
      return { success: false, message: 'Invalid backup file structure.' };
    }

    try {
      db.withTransactionSync(() => {
        // Clear existing data safely
        db.execSync('PRAGMA foreign_keys = OFF;');
        db.runSync('DELETE FROM payment_allocations;');
        db.runSync('DELETE FROM payments;');
        db.runSync('DELETE FROM commute_trips;');
        db.runSync('DELETE FROM commute_days;');
        db.runSync('DELETE FROM carpool_owners;');
        db.runSync('DELETE FROM app_settings;');

        // Insert app settings
        if (Array.isArray(jsonData.app_settings)) {
          for (const s of jsonData.app_settings) {
            db.runSync(
              `INSERT INTO app_settings (
                id, reminder_enabled, reminder_hour, reminder_minute,
                secondary_reminder_enabled, secondary_reminder_hour, secondary_reminder_minute,
                default_owner_id, theme, currency, currency_symbol, working_days
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                s.id,
                s.reminder_enabled,
                s.reminder_hour,
                s.reminder_minute,
                s.secondary_reminder_enabled ?? 0,
                s.secondary_reminder_hour ?? 22,
                s.secondary_reminder_minute ?? 0,
                s.default_owner_id,
                s.theme,
                s.currency,
                s.currency_symbol,
                s.working_days,
              ],
            );
          }
        }

        // Insert carpool owners
        if (Array.isArray(jsonData.carpool_owners)) {
          for (const o of jsonData.carpool_owners) {
            db.runSync(
              `INSERT INTO carpool_owners (
                id, name, phone, default_morning_fare_paise, default_evening_fare_paise,
                notes, is_active, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                o.id,
                o.name,
                o.phone,
                o.default_morning_fare_paise,
                o.default_evening_fare_paise,
                o.notes,
                o.is_active,
                o.created_at,
                o.updated_at,
              ],
            );
          }
        }

        // Insert commute days
        if (Array.isArray(jsonData.commute_days)) {
          for (const d of jsonData.commute_days) {
            db.runSync(
              `INSERT INTO commute_days (id, date, commute_type, notes, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [d.id, d.date, d.commute_type, d.notes, d.created_at, d.updated_at],
            );
          }
        }

        // Insert commute trips
        if (Array.isArray(jsonData.commute_trips)) {
          for (const t of jsonData.commute_trips) {
            db.runSync(
              `INSERT INTO commute_trips (id, commute_day_id, owner_id, trip_type, fare_paise, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [t.id, t.commute_day_id, t.owner_id, t.trip_type, t.fare_paise, t.created_at, t.updated_at],
            );
          }
        }

        // Insert payments
        if (Array.isArray(jsonData.payments)) {
          for (const p of jsonData.payments) {
            db.runSync(
              `INSERT INTO payments (id, owner_id, amount_paise, payment_date, payment_method, notes, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [p.id, p.owner_id, p.amount_paise, p.payment_date, p.payment_method, p.notes, p.created_at, p.updated_at],
            );
          }
        }

        // Insert payment allocations
        if (Array.isArray(jsonData.payment_allocations)) {
          for (const a of jsonData.payment_allocations) {
            db.runSync(
              `INSERT INTO payment_allocations (id, payment_id, commute_trip_id, allocated_amount_paise, created_at)
               VALUES (?, ?, ?, ?, ?)`,
              [a.id, a.payment_id, a.commute_trip_id, a.allocated_amount_paise, a.created_at],
            );
          }
        }

        db.execSync('PRAGMA foreign_keys = ON;');
        recordAuditLog('system', 'backup', 'update', null, { restored_at: new Date().toISOString() });
      });

      return { success: true, message: 'Data restored successfully.' };
    }
    catch (error: any) {
      console.error('Import error:', error);
      return { success: false, message: error.message || 'Import failed.' };
    }
  },
};
