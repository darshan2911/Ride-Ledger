import type { Payment, PaymentDetail, PaymentMethod } from '../types';
import { getDatabase, recordAuditLog } from '../database';

export type RecordPaymentInput = {
  owner_id: string;
  amount_paise: number;
  payment_date: string; // YYYY-MM-DD
  payment_method: PaymentMethod;
  notes?: string | null;
  // If specific trips are chosen, allocate to them in order. If empty, allocate FIFO (oldest unpaid first).
  trip_ids?: string[];
};

export const PaymentsRepo = {
  recordPayment(input: RecordPaymentInput): PaymentDetail {
    const db = getDatabase();
    const now = new Date().toISOString();
    const paymentId = `pay-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    let result: PaymentDetail;

    db.withTransactionSync(() => {
      // 1. Insert Payment
      db.runSync(
        `INSERT INTO payments (id, owner_id, amount_paise, payment_date, payment_method, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          paymentId,
          input.owner_id,
          input.amount_paise,
          input.payment_date,
          input.payment_method,
          input.notes?.trim() || null,
          now,
          now,
        ],
      );

      // 2. Fetch candidate unpaid or partially-paid trips for this owner
      const unpaidTripsSql = `
        SELECT
          t.id,
          t.fare_paise,
          d.date as trip_date,
          COALESCE(SUM(pa.allocated_amount_paise), 0) as already_allocated
        FROM commute_trips t
        INNER JOIN commute_days d ON d.id = t.commute_day_id
        LEFT JOIN payment_allocations pa ON pa.commute_trip_id = t.id
        WHERE t.owner_id = ?
        GROUP BY t.id
        HAVING (t.fare_paise - COALESCE(SUM(pa.allocated_amount_paise), 0)) > 0
        ORDER BY d.date ASC, t.created_at ASC
      `;

      let candidateTrips = db.getAllSync<{
        id: string;
        fare_paise: number;
        trip_date: string;
        already_allocated: number;
      }>(unpaidTripsSql, [input.owner_id]);

      // If user provided a specific list of trip_ids, filter and prioritize those
      if (input.trip_ids && input.trip_ids.length > 0) {
        const idSet = new Set(input.trip_ids);
        candidateTrips = candidateTrips.filter(t => idSet.has(t.id));
      }

      // 3. Allocate payment amount to trips
      let remainingPaymentPaise = input.amount_paise;

      for (const trip of candidateTrips) {
        if (remainingPaymentPaise <= 0)
          break;

        const neededForTrip = trip.fare_paise - trip.already_allocated;
        const allocationAmount = Math.min(remainingPaymentPaise, neededForTrip);

        if (allocationAmount > 0) {
          const allocationId = `alloc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          db.runSync(
            `INSERT INTO payment_allocations (id, payment_id, commute_trip_id, allocated_amount_paise, created_at)
             VALUES (?, ?, ?, ?, ?)`,
            [allocationId, paymentId, trip.id, allocationAmount, now],
          );
          remainingPaymentPaise -= allocationAmount;
        }
      }

      result = this.getPaymentById(paymentId)!;
      recordAuditLog('payments', paymentId, 'create', null, result);
    });

    return result!;
  },

  deletePayment(id: string) {
    const db = getDatabase();
    db.withTransactionSync(() => {
      const existing = db.getFirstSync<Payment>('SELECT * FROM payments WHERE id = ?', [id]);
      if (existing) {
        db.runSync('DELETE FROM payments WHERE id = ?', [id]);
        recordAuditLog('payments', id, 'delete', existing, null);
      }
    });
  },

  getPaymentById(id: string): (PaymentDetail & {
    allocated_trips: {
      commute_trip_id: string;
      trip_type: string;
      date: string;
      fare_paise: number;
      allocated_amount_paise: number;
    }[];
  }) | null {
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
      WHERE p.id = ?
      GROUP BY p.id
    `;

    const payment = db.getFirstSync<PaymentDetail>(sql, [id]);
    if (!payment)
      return null;

    const tripsSql = `
      SELECT
        pa.commute_trip_id,
        t.trip_type,
        d.date,
        t.fare_paise,
        pa.allocated_amount_paise
      FROM payment_allocations pa
      INNER JOIN commute_trips t ON t.id = pa.commute_trip_id
      INNER JOIN commute_days d ON d.id = t.commute_day_id
      WHERE pa.payment_id = ?
      ORDER BY d.date ASC
    `;
    const allocated_trips = db.getAllSync<{
      commute_trip_id: string;
      trip_type: string;
      date: string;
      fare_paise: number;
      allocated_amount_paise: number;
    }>(tripsSql, [id]);

    return {
      ...payment,
      allocated_trips,
    };
  },

  getAllPayments(ownerId?: string): PaymentDetail[] {
    const db = getDatabase();
    const where = ownerId ? 'WHERE p.owner_id = ?' : '';
    const params = ownerId ? [ownerId] : [];

    const sql = `
      SELECT
        p.*,
        o.name as owner_name,
        COALESCE(SUM(pa.allocated_amount_paise), 0) as allocated_paise,
        COUNT(pa.id) as allocations_count
      FROM payments p
      INNER JOIN carpool_owners o ON o.id = p.owner_id
      LEFT JOIN payment_allocations pa ON pa.payment_id = p.id
      ${where}
      GROUP BY p.id
      ORDER BY p.payment_date DESC, p.created_at DESC
    `;
    return db.getAllSync<PaymentDetail>(sql, params);
  },
};
