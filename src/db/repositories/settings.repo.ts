import type { AppSettings } from '../types';
import { getDatabase, recordAuditLog } from '../database';

type RawSettingsRow = {
  id: string;
  reminder_enabled: number;
  reminder_hour: number;
  reminder_minute: number;
  secondary_reminder_enabled: number;
  secondary_reminder_hour: number;
  secondary_reminder_minute: number;
  default_owner_id: string | null;
  theme: 'system' | 'light' | 'dark';
  currency: string;
  currency_symbol: string;
  working_days: string;
  tracking_start_date: string | null;
};

function parseSettings(row: RawSettingsRow): AppSettings {
  return {
    ...row,
    reminder_enabled: row.reminder_enabled === 1,
    secondary_reminder_enabled: row.secondary_reminder_enabled === 1,
    working_days: (row.working_days || '1,2,3,4,5').split(',').map(Number),
    tracking_start_date: row.tracking_start_date ?? null,
  };
}

export const SettingsRepo = {
  getSettings(): AppSettings {
    const db = getDatabase();
    const row = db.getFirstSync<RawSettingsRow>('SELECT * FROM app_settings WHERE id = "default"');
    if (!row) {
      throw new Error('Default settings not found. Database must be initialized first.');
    }
    return parseSettings(row);
  },

  updateSettings(data: Partial<AppSettings>): AppSettings {
    const db = getDatabase();
    const current = this.getSettings();
    const merged = { ...current, ...data };

    db.runSync(
      `UPDATE app_settings
       SET reminder_enabled = ?, reminder_hour = ?, reminder_minute = ?,
           secondary_reminder_enabled = ?, secondary_reminder_hour = ?, secondary_reminder_minute = ?,
           default_owner_id = ?, theme = ?, currency = ?, currency_symbol = ?,
           working_days = ?, tracking_start_date = ?
       WHERE id = "default"`,
      [
        merged.reminder_enabled ? 1 : 0,
        merged.reminder_hour,
        merged.reminder_minute,
        merged.secondary_reminder_enabled ? 1 : 0,
        merged.secondary_reminder_hour,
        merged.secondary_reminder_minute,
        merged.default_owner_id ?? null,
        merged.theme,
        merged.currency,
        merged.currency_symbol,
        merged.working_days.join(','),
        merged.tracking_start_date ?? null,
      ],
    );

    const updated = this.getSettings();
    recordAuditLog('app_settings', 'default', 'update', current, updated);
    return updated;
  },
};
