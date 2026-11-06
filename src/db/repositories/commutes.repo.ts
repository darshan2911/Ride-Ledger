import type {
  CommuteDay,
  CommuteDayWithTrips,
  CommuteTrip,
  CommuteTripDetail,
  CommuteType,
  PaymentStatus,
  TripType,
} from '../types';
import { getDatabase, recordAuditLog } from '../database';

export type LogCommuteInput = {
  date: string; // YYYY-MM-DD
  commute_type: CommuteType;
  notes?: string | null;
  trips?: {
    trip_type: TripType;
    owner_id?: string | null;
    fare_paise: number;
  }[];
};

export const CommutesRepo = {
  getCommuteByDate(date: string): CommuteDayWithTrips | null {
    const db = getDatabase();
    const day = db.getFirstSync<CommuteDay>('SELECT * FROM commute_days WHERE date = ?', [date]);
    if (!day)
      return null;

    const tripsSql = `
      SELECT
        t.*,
        o.name as owner_name,
        COALESCE(SUM(pa.allocated_amount_paise), 0) as allocated_paise,
        (t.fare_paise - COALESCE(SUM(pa.allocated_amount_paise), 0)) as remaining_paise,
        CASE
          WHEN t.fare_paise = 0 THEN 'paid'
          WHEN COALESCE(SUM(pa.allocated_amount_paise), 0) = 0 THEN 'unpaid'
          WHEN COALESCE(SUM(pa.allocated_amount_paise), 0) < t.fare_paise THEN 'partially_paid'
          ELSE 'paid'
        END as payment_status
      FROM commute_trips t
      LEFT JOIN carpool_owners o ON o.id = t.owner_id
      LEFT JOIN payment_allocations pa ON pa.commute_trip_id = t.id
      WHERE t.commute_day_id = ?
      GROUP BY t.id
      ORDER BY CASE WHEN t.trip_type = 'morning' THEN 1 ELSE 2 END
    `;

    const trips = db.getAllSync<CommuteTripDetail>(tripsSql, [day.id]);
    const total_fare_paise = trips.reduce((sum, t) => sum + t.fare_paise, 0);
    const total_allocated_paise = trips.reduce((sum, t) => sum + t.allocated_paise, 0);

    let payment_status: PaymentStatus = 'unpaid';
    if (day.commute_type !== 'carpool' || total_fare_paise === 0 || total_allocated_paise >= total_fare_paise) {
      payment_status = 'paid';
    }
    else if (total_allocated_paise > 0) {
      payment_status = 'partially_paid';
    }

    return {
      ...day,
      trips,
      total_fare_paise,
      total_allocated_paise,
      payment_status,
    };
  },

  logCommute(input: LogCommuteInput): CommuteDayWithTrips {
    const db = getDatabase();
    const now = new Date().toISOString();
    let result: CommuteDayWithTrips;

    db.withTransactionSync(() => {
      // Check if entry already exists for this date
      const existing = db.getFirstSync<CommuteDay>('SELECT * FROM commute_days WHERE date = ?', [input.date]);

      let dayId: string;
      if (existing) {
        dayId = existing.id;
        db.runSync(
          'UPDATE commute_days SET commute_type = ?, notes = ?, updated_at = ? WHERE id = ?',
          [input.commute_type, input.notes?.trim() || null, now, dayId],
        );

        // Delete existing trips and their allocations if replacing
        db.runSync('DELETE FROM commute_trips WHERE commute_day_id = ?', [dayId]);
        recordAuditLog('commute_days', dayId, 'update', existing, { ...existing, ...input });
      }
      else {
        dayId = `day-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        db.runSync(
          `INSERT INTO commute_days (id, date, commute_type, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [dayId, input.date, input.commute_type, input.notes?.trim() || null, now, now],
        );
        recordAuditLog('commute_days', dayId, 'create', null, { id: dayId, ...input });
      }

      // If carpool, insert trips
      if (input.commute_type === 'carpool' && input.trips && input.trips.length > 0) {
        for (const trip of input.trips) {
          const tripId = `trip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          db.runSync(
            `INSERT INTO commute_trips (id, commute_day_id, owner_id, trip_type, fare_paise, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [tripId, dayId, trip.owner_id || null, trip.trip_type, trip.fare_paise, now, now],
          );
        }
      }

      result = this.getCommuteByDate(input.date)!;
    });

    return result!;
  },

  deleteCommute(id: string) {
    const db = getDatabase();
    db.withTransactionSync(() => {
      const existing = db.getFirstSync<CommuteDay>('SELECT * FROM commute_days WHERE id = ?', [id]);
      if (existing) {
        db.runSync('DELETE FROM commute_days WHERE id = ?', [id]);
        recordAuditLog('commute_days', id, 'delete', existing, null);
      }
    });
  },

  getCommuteHistory(filter?: {
    startDate?: string;
    endDate?: string;
    ownerId?: string;
    commuteType?: CommuteType | 'all';
    paymentStatus?: PaymentStatus | 'all';
    search?: string;
  }): CommuteDayWithTrips[] {
    const db = getDatabase();
    let sql = `
      SELECT DISTINCT d.id
      FROM commute_days d
      LEFT JOIN commute_trips t ON t.commute_day_id = d.id
      LEFT JOIN carpool_owners o ON o.id = t.owner_id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (filter?.startDate) {
      sql += ' AND d.date >= ?';
      params.push(filter.startDate);
    }
    if (filter?.endDate) {
      sql += ' AND d.date <= ?';
      params.push(filter.endDate);
    }
    if (filter?.commuteType && filter.commuteType !== 'all') {
      sql += ' AND d.commute_type = ?';
      params.push(filter.commuteType);
    }
    if (filter?.ownerId) {
      sql += ' AND t.owner_id = ?';
      params.push(filter.ownerId);
    }
    if (filter?.search) {
      sql += ' AND (d.notes LIKE ? OR o.name LIKE ?)';
      params.push(`%${filter.search}%`, `%${filter.search}%`);
    }

    sql += ' ORDER BY d.date DESC';

    const dayIds = db.getAllSync<{ id: string }>(sql, params).map(r => r.id);
    const results: CommuteDayWithTrips[] = [];

    for (const id of dayIds) {
      const day = db.getFirstSync<CommuteDay>('SELECT * FROM commute_days WHERE id = ?', [id]);
      if (!day)
        continue;

      const tripsSql = `
        SELECT
          t.*,
          o.name as owner_name,
          COALESCE(SUM(pa.allocated_amount_paise), 0) as allocated_paise,
          (t.fare_paise - COALESCE(SUM(pa.allocated_amount_paise), 0)) as remaining_paise,
          CASE
            WHEN t.fare_paise = 0 THEN 'paid'
            WHEN COALESCE(SUM(pa.allocated_amount_paise), 0) = 0 THEN 'unpaid'
            WHEN COALESCE(SUM(pa.allocated_amount_paise), 0) < t.fare_paise THEN 'partially_paid'
            ELSE 'paid'
          END as payment_status
        FROM commute_trips t
        LEFT JOIN carpool_owners o ON o.id = t.owner_id
        LEFT JOIN payment_allocations pa ON pa.commute_trip_id = t.id
        WHERE t.commute_day_id = ?
        GROUP BY t.id
        ORDER BY CASE WHEN t.trip_type = 'morning' THEN 1 ELSE 2 END
      `;
      const trips = db.getAllSync<CommuteTripDetail>(tripsSql, [day.id]);
      const total_fare_paise = trips.reduce((sum, t) => sum + t.fare_paise, 0);
      const total_allocated_paise = trips.reduce((sum, t) => sum + t.allocated_paise, 0);

      let payment_status: PaymentStatus = 'unpaid';
      if (day.commute_type !== 'carpool' || total_fare_paise === 0 || total_allocated_paise >= total_fare_paise) {
        payment_status = 'paid';
      }
      else if (total_allocated_paise > 0) {
        payment_status = 'partially_paid';
      }

      if (filter?.paymentStatus && filter.paymentStatus !== 'all' && payment_status !== filter.paymentStatus) {
        continue;
      }

      results.push({
        ...day,
        trips,
        total_fare_paise,
        total_allocated_paise,
        payment_status,
      });
    }

    return results;
  },

  getCalendarRange(
    startDate: string,
    endDate: string,
  ): Record<
    string,
    {
      commute_type: CommuteType;
      total_fare_paise: number;
      payment_status: PaymentStatus;
      trips_count: number;
      morning_owner_name?: string | null;
      evening_owner_name?: string | null;
    }
  > {
    const list = this.getCommuteHistory({ startDate, endDate });
    const map: Record<string, any> = {};

    for (const item of list) {
      const morningTrip = item.trips.find(t => t.trip_type === 'morning');
      const eveningTrip = item.trips.find(t => t.trip_type === 'evening');

      map[item.date] = {
        commute_type: item.commute_type,
        total_fare_paise: item.total_fare_paise,
        payment_status: item.payment_status,
        trips_count: item.trips.length,
        morning_owner_name: morningTrip?.owner_name,
        evening_owner_name: eveningTrip?.owner_name,
      };
    }
    return map;
  },

  getUnloggedDates(daysBack = 14): string[] {
    const db = getDatabase();
    const today = new Date();
    const unlogged: string[] = [];

    // Settings for working days
    const settings = db.getFirstSync<{ working_days: string }>(
      'SELECT working_days FROM app_settings WHERE id = "default"',
    );
    const workingDays = (settings?.working_days || '1,2,3,4,5').split(',').map(Number);

    for (let i = 1; i <= daysBack; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay(); // 1=Mon, 7=Sun

      if (workingDays.includes(dayOfWeek)) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;

        const exists = db.getFirstSync<{ id: string }>('SELECT id FROM commute_days WHERE date = ?', [dateStr]);
        if (!exists) {
          unlogged.push(dateStr);
        }
      }
    }

    return unlogged;
  },

  bulkLogPastDates(
    dates: string[],
    commuteType: CommuteType,
    trips?: { trip_type: TripType; owner_id?: string | null; fare_paise: number }[],
    notes?: string,
  ) {
    for (const date of dates) {
      this.logCommute({
        date,
        commute_type: commuteType,
        trips,
        notes,
      });
    }
  },
};
