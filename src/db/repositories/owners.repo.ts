import type { CarpoolOwner, CommuteTripDetail, OwnerSummary, PaymentDetail, PaymentStatus } from '../types';
import { getDatabase, recordAuditLog } from '../database';

export const OwnersRepo = {
  getAllOwners(includeArchived = false): OwnerSummary[] {
    const db = getDatabase();
    const activeClause = includeArchived ? '' : 'WHERE o.is_active = 1';

    const sql = `
      SELECT
        o.*,
        (SELECT COUNT(*) FROM commute_trips WHERE owner_id = o.id) as total_trips,
        (SELECT COALESCE(SUM(fare_paise), 0) FROM commute_trips WHERE owner_id = o.id) as total_charges_paise,
        (SELECT COALESCE(SUM(amount_paise), 0) FROM payments WHERE owner_id = o.id) as total_paid_paise,
        (
          (SELECT COALESCE(SUM(fare_paise), 0) FROM commute_trips WHERE owner_id = o.id) -
          (SELECT COALESCE(SUM(amount_paise), 0) FROM payments WHERE owner_id = o.id)
        ) as outstanding_balance_paise,
        (
          SELECT COUNT(*)
          FROM commute_trips ct
          WHERE ct.owner_id = o.id
            AND ct.fare_paise > 0
            AND ct.id NOT IN (
              SELECT pa.commute_trip_id
              FROM payment_allocations pa
              GROUP BY pa.commute_trip_id
              HAVING SUM(pa.allocated_amount_paise) >= ct.fare_paise
            )
        ) as unpaid_trips_count,
        (
          SELECT MAX(p.payment_date)
          FROM payments p
          WHERE p.owner_id = o.id
        ) as last_payment_date
      FROM carpool_owners o
      ${activeClause}
      ORDER BY o.is_active DESC, o.name ASC
    `;

    return db.getAllSync<OwnerSummary>(sql);
  },

  getOwnerById(id: string): OwnerSummary | null {
    const db = getDatabase();
    const sql = `
      SELECT
        o.*,
        (SELECT COUNT(*) FROM commute_trips WHERE owner_id = o.id) as total_trips,
        (SELECT COALESCE(SUM(fare_paise), 0) FROM commute_trips WHERE owner_id = o.id) as total_charges_paise,
        (SELECT COALESCE(SUM(amount_paise), 0) FROM payments WHERE owner_id = o.id) as total_paid_paise,
        (
          (SELECT COALESCE(SUM(fare_paise), 0) FROM commute_trips WHERE owner_id = o.id) -
          (SELECT COALESCE(SUM(amount_paise), 0) FROM payments WHERE owner_id = o.id)
        ) as outstanding_balance_paise,
        (
          SELECT COUNT(*)
          FROM commute_trips ct
          WHERE ct.owner_id = o.id
            AND ct.fare_paise > 0
            AND ct.id NOT IN (
              SELECT pa.commute_trip_id
              FROM payment_allocations pa
              GROUP BY pa.commute_trip_id
              HAVING SUM(pa.allocated_amount_paise) >= ct.fare_paise
            )
        ) as unpaid_trips_count,
        (
          SELECT MAX(p.payment_date)
          FROM payments p
          WHERE p.owner_id = o.id
        ) as last_payment_date
      FROM carpool_owners o
      WHERE o.id = ?
    `;
    return db.getFirstSync<OwnerSummary>(sql, [id]);
  },

  createOwner(data: {
    name: string;
    phone?: string | null;
    default_morning_fare_paise: number;
    default_evening_fare_paise: number;
    notes?: string | null;
  }): CarpoolOwner {
    const db = getDatabase();
    const id = `owner-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    db.runSync(
      `INSERT INTO carpool_owners (
        id, name, phone, default_morning_fare_paise, default_evening_fare_paise,
        notes, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.name.trim(),
        data.phone?.trim() || null,
        data.default_morning_fare_paise,
        data.default_evening_fare_paise,
        data.notes?.trim() || null,
        1,
        now,
        now,
      ],
    );

    const created = db.getFirstSync<CarpoolOwner>('SELECT * FROM carpool_owners WHERE id = ?', [id])!;
    recordAuditLog('carpool_owners', id, 'create', null, created);
    return created;
  },

  updateOwner(
    id: string,
    data: {
      name: string;
      phone?: string | null;
      default_morning_fare_paise: number;
      default_evening_fare_paise: number;
      notes?: string | null;
    },
  ): CarpoolOwner {
    const db = getDatabase();
    const previous = db.getFirstSync<CarpoolOwner>('SELECT * FROM carpool_owners WHERE id = ?', [id]);
    const now = new Date().toISOString();

    db.runSync(
      `UPDATE carpool_owners
       SET name = ?, phone = ?, default_morning_fare_paise = ?, default_evening_fare_paise = ?,
           notes = ?, updated_at = ?
       WHERE id = ?`,
      [
        data.name.trim(),
        data.phone?.trim() || null,
        data.default_morning_fare_paise,
        data.default_evening_fare_paise,
        data.notes?.trim() || null,
        now,
        id,
      ],
    );

    const updated = db.getFirstSync<CarpoolOwner>('SELECT * FROM carpool_owners WHERE id = ?', [id])!;
    recordAuditLog('carpool_owners', id, 'update', previous, updated);
    return updated;
  },

  archiveOwner(id: string) {
    const db = getDatabase();
    const previous = db.getFirstSync<CarpoolOwner>('SELECT * FROM carpool_owners WHERE id = ?', [id]);
    const now = new Date().toISOString();

    db.runSync('UPDATE carpool_owners SET is_active = 0, updated_at = ? WHERE id = ?', [now, id]);
    recordAuditLog('carpool_owners', id, 'update', previous, { ...previous, is_active: 0 });
  },

  unarchiveOwner(id: string) {
    const db = getDatabase();
    const previous = db.getFirstSync<CarpoolOwner>('SELECT * FROM carpool_owners WHERE id = ?', [id]);
    const now = new Date().toISOString();

    db.runSync('UPDATE carpool_owners SET is_active = 1, updated_at = ? WHERE id = ?', [now, id]);
    recordAuditLog('carpool_owners', id, 'update', previous, { ...previous, is_active: 1 });
  },

  getOwnerTrips(ownerId: string, statusFilter: PaymentStatus | 'all' = 'all'): (CommuteTripDetail & { date: string })[] {
    const db = getDatabase();
    const sql = `
      SELECT
        t.*,
        d.date as date,
        o.name as owner_name,
        COALESCE(SUM(pa.allocated_amount_paise), 0) as allocated_paise,
        (t.fare_paise - COALESCE(SUM(pa.allocated_amount_paise), 0)) as remaining_paise,
        CASE
          WHEN COALESCE(SUM(pa.allocated_amount_paise), 0) = 0 THEN 'unpaid'
          WHEN COALESCE(SUM(pa.allocated_amount_paise), 0) < t.fare_paise THEN 'partially_paid'
          ELSE 'paid'
        END as payment_status
      FROM commute_trips t
      INNER JOIN commute_days d ON d.id = t.commute_day_id
      LEFT JOIN carpool_owners o ON o.id = t.owner_id
      LEFT JOIN payment_allocations pa ON pa.commute_trip_id = t.id
      WHERE t.owner_id = ?
      GROUP BY t.id
      ORDER BY d.date DESC, t.trip_type ASC
    `;

    const allTrips = db.getAllSync<CommuteTripDetail & { date: string }>(sql, [ownerId]);
    if (statusFilter === 'all')
      return allTrips;
    return allTrips.filter(t => t.payment_status === statusFilter);
  },

  getOwnerPayments(ownerId: string): PaymentDetail[] {
    const db = getDatabase();
    const sql = `
      SELECT
        p.*,
        o.name as owner_name,
        COALESCE(SUM(pa.allocated_amount_paise), 0) as allocated_paise,
        COUNT(pa.id) as allocations_count
      FROM payments p
      INNER JOIN carpool_owners o ON o.id = p.owner_id
      LEFT JOIN payment_allocations pa ON pa.payment_id = p.id
      WHERE p.owner_id = ?
      GROUP BY p.id
      ORDER BY p.payment_date DESC, p.created_at DESC
    `;
    return db.getAllSync<PaymentDetail>(sql, [ownerId]);
  },
};
