import type { CommuteType, DashboardStats, MonthAnalytics } from '../types';
import { getTodayDateString } from '@/lib/currency';
import { getDatabase } from '../database';
import { CommutesRepo } from './commutes.repo';
import { OwnersRepo } from './owners.repo';

export const AnalyticsRepo = {
  getDashboardStats(): DashboardStats {
    const db = getDatabase();
    const todayStr = getTodayDateString();
    const currentMonthPrefix = todayStr.slice(0, 7); // 'YYYY-MM'

    // 1. Today's commute
    const todayCommute = CommutesRepo.getCommuteByDate(todayStr);
    const today_status = todayCommute ? todayCommute.commute_type : 'not_logged';
    const today_expense_paise = todayCommute ? todayCommute.total_fare_paise : 0;
    const today_trips_count = todayCommute ? todayCommute.trips.length : 0;

    // 2. Owners summary and total outstanding
    const owners = OwnersRepo.getAllOwners(false);
    const total_outstanding_paise = owners.reduce(
      (sum, o) => sum + Math.max(0, o.outstanding_balance_paise),
      0,
    );

    // 3. Month expense
    const monthChargesRow = db.getFirstSync<{ total: number }>(
      `SELECT COALESCE(SUM(t.fare_paise), 0) as total
       FROM commute_trips t
       INNER JOIN commute_days d ON d.id = t.commute_day_id
       WHERE d.date LIKE ?`,
      [`${currentMonthPrefix}%`],
    );
    const month_expense_paise = monthChargesRow?.total ?? 0;

    // 4. Month payments
    const monthPaidRow = db.getFirstSync<{ total: number }>(
      `SELECT COALESCE(SUM(amount_paise), 0) as total
       FROM payments
       WHERE payment_date LIKE ?`,
      [`${currentMonthPrefix}%`],
    );
    const month_paid_paise = monthPaidRow?.total ?? 0;

    // 5. Month commute types breakdown
    const dayCounts = db.getAllSync<{ commute_type: string; count: number }>(
      `SELECT commute_type, COUNT(*) as count
       FROM commute_days
       WHERE date LIKE ?
       GROUP BY commute_type`,
      [`${currentMonthPrefix}%`],
    );

    let month_carpool_days = 0;
    let month_own_vehicle_days = 0;
    let month_leave_days = 0;

    for (const item of dayCounts) {
      if (item.commute_type === 'carpool')
        month_carpool_days = item.count;
      if (item.commute_type === 'own_vehicle')
        month_own_vehicle_days = item.count;
      if (item.commute_type === 'leave')
        month_leave_days = item.count;
    }

    // 6. Unlogged past days
    const unloggedDates = CommutesRepo.getUnloggedDates(7);
    const unlogged_past_days_count = unloggedDates.length;

    // 7. Recent commutes
    const recent_commutes = CommutesRepo.getCommuteHistory().slice(0, 5);

    return {
      today_status,
      today_expense_paise,
      today_trips_count,
      total_outstanding_paise,
      month_expense_paise,
      month_paid_paise,
      month_carpool_days,
      month_own_vehicle_days,
      month_leave_days,
      unlogged_past_days_count,
      owners,
      recent_commutes,
    };
  },

  getMonthAnalytics(yearMonth: string): MonthAnalytics {
    const db = getDatabase();
    const yearPrefix = yearMonth.slice(0, 4);

    // Month Carpool Expense
    const monthExpenseRow = db.getFirstSync<{ total: number }>(
      `SELECT COALESCE(SUM(t.fare_paise), 0) as total
       FROM commute_trips t
       INNER JOIN commute_days d ON d.id = t.commute_day_id
       WHERE d.date LIKE ?`,
      [`${yearMonth}%`],
    );
    const total_carpool_expense_paise = monthExpenseRow?.total ?? 0;

    // Year Expense
    const yearExpenseRow = db.getFirstSync<{ total: number }>(
      `SELECT COALESCE(SUM(t.fare_paise), 0) as total
       FROM commute_trips t
       INNER JOIN commute_days d ON d.id = t.commute_day_id
       WHERE d.date LIKE ?`,
      [`${yearPrefix}%`],
    );
    const total_year_expense_paise = yearExpenseRow?.total ?? 0;

    // Total Paid this month
    const paidRow = db.getFirstSync<{ total: number }>(
      `SELECT COALESCE(SUM(amount_paise), 0) as total
       FROM payments
       WHERE payment_date LIKE ?`,
      [`${yearMonth}%`],
    );
    const total_paid_paise = paidRow?.total ?? 0;

    // Total outstanding across all owners
    const owners = OwnersRepo.getAllOwners(true);
    const total_outstanding_paise = owners.reduce(
      (sum, o) => sum + Math.max(0, o.outstanding_balance_paise),
      0,
    );

    // Day counts
    const dayCounts = db.getAllSync<{ commute_type: string; count: number }>(
      `SELECT commute_type, COUNT(*) as count
       FROM commute_days
       WHERE date LIKE ?
       GROUP BY commute_type`,
      [`${yearMonth}%`],
    );
    let carpool_days = 0;
    let own_vehicle_days = 0;
    let leave_days = 0;
    for (const d of dayCounts) {
      if (d.commute_type === 'carpool')
        carpool_days = d.count;
      if (d.commute_type === 'own_vehicle')
        own_vehicle_days = d.count;
      if (d.commute_type === 'leave')
        leave_days = d.count;
    }

    const avg_daily_expense_paise = carpool_days > 0 ? Math.round(total_carpool_expense_paise / carpool_days) : 0;

    // Morning vs Evening
    const morningRow = db.getFirstSync<{ total: number }>(
      `SELECT COALESCE(SUM(t.fare_paise), 0) as total
       FROM commute_trips t
       INNER JOIN commute_days d ON d.id = t.commute_day_id
       WHERE d.date LIKE ? AND t.trip_type = 'morning'`,
      [`${yearMonth}%`],
    );
    const morning_expense_paise = morningRow?.total ?? 0;

    const eveningRow = db.getFirstSync<{ total: number }>(
      `SELECT COALESCE(SUM(t.fare_paise), 0) as total
       FROM commute_trips t
       INNER JOIN commute_days d ON d.id = t.commute_day_id
       WHERE d.date LIKE ? AND t.trip_type = 'evening'`,
      [`${yearMonth}%`],
    );
    const evening_expense_paise = eveningRow?.total ?? 0;

    // Owner distribution
    const ownerDistribution = db.getAllSync<{
      owner_id: string;
      owner_name: string;
      total_trips: number;
      total_fare_paise: number;
    }>(
      `SELECT
         o.id as owner_id,
         o.name as owner_name,
         COUNT(t.id) as total_trips,
         COALESCE(SUM(t.fare_paise), 0) as total_fare_paise
       FROM commute_trips t
       INNER JOIN commute_days d ON d.id = t.commute_day_id
       INNER JOIN carpool_owners o ON o.id = t.owner_id
       WHERE d.date LIKE ?
       GROUP BY o.id
       ORDER BY total_trips DESC, total_fare_paise DESC`,
      [`${yearMonth}%`],
    );

    const most_frequent_owner_name = ownerDistribution.length > 0 ? ownerDistribution[0].owner_name : null;

    // Daily trend
    const dailyTrend = db.getAllSync<{
      date: string;
      fare_paise: number;
      commute_type: CommuteType;
    }>(
      `SELECT
         d.date,
         d.commute_type,
         COALESCE(SUM(t.fare_paise), 0) as fare_paise
       FROM commute_days d
       LEFT JOIN commute_trips t ON t.commute_day_id = d.id
       WHERE d.date LIKE ?
       GROUP BY d.id
       ORDER BY d.date ASC`,
      [`${yearMonth}%`],
    );

    return {
      total_carpool_expense_paise,
      total_year_expense_paise,
      avg_daily_expense_paise,
      total_paid_paise,
      total_outstanding_paise,
      carpool_days,
      own_vehicle_days,
      leave_days,
      morning_expense_paise,
      evening_expense_paise,
      most_frequent_owner_name,
      owner_distribution: ownerDistribution,
      daily_trend: dailyTrend,
    };
  },
};
