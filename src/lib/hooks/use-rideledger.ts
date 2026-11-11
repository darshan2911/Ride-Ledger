import type { AppSettings, CommuteDayWithTrips, CommuteType, DashboardStats, MonthAnalytics, OwnerSummary, PaymentStatus } from '../../db';
import { useMemo } from 'react';
import {
  AnalyticsRepo,
  CommutesRepo,
  OwnersRepo,
  SettingsRepo,
} from '../../db';
import { useRideLedgerStore } from '../rideledger-store';

export function useDashboard(): { stats: DashboardStats; refresh: () => void } {
  const refreshIndex = useRideLedgerStore(s => s.refreshIndex);
  const triggerRefresh = useRideLedgerStore(s => s.triggerRefresh);

  const stats = useMemo(() => {
    return AnalyticsRepo.getDashboardStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshIndex]);

  return { stats, refresh: triggerRefresh };
}

export function useOwners(includeArchived = false): { owners: OwnerSummary[]; refresh: () => void } {
  const refreshIndex = useRideLedgerStore(s => s.refreshIndex);
  const triggerRefresh = useRideLedgerStore(s => s.triggerRefresh);

  const owners = useMemo(() => {
    return OwnersRepo.getAllOwners(includeArchived);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeArchived, refreshIndex]);

  return { owners, refresh: triggerRefresh };
}

export function useOwner(id: string) {
  const refreshIndex = useRideLedgerStore(s => s.refreshIndex);
  const triggerRefresh = useRideLedgerStore(s => s.triggerRefresh);

  const owner = useMemo(() => {
    return OwnersRepo.getOwnerById(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, refreshIndex]);

  return { owner, refresh: triggerRefresh };
}

export function useOwnerTrips(ownerId: string, statusFilter: PaymentStatus | 'all' = 'all') {
  const refreshIndex = useRideLedgerStore(s => s.refreshIndex);

  const trips = useMemo(() => {
    return OwnersRepo.getOwnerTrips(ownerId, statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId, statusFilter, refreshIndex]);

  return trips;
}

export function useOwnerPayments(ownerId: string) {
  const refreshIndex = useRideLedgerStore(s => s.refreshIndex);

  const payments = useMemo(() => {
    return OwnersRepo.getOwnerPayments(ownerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId, refreshIndex]);

  return payments;
}

export function useCommuteHistory(filter?: {
  startDate?: string;
  endDate?: string;
  ownerId?: string;
  commuteType?: CommuteType | 'all';
  paymentStatus?: PaymentStatus | 'all';
  search?: string;
}): { commutes: CommuteDayWithTrips[]; refresh: () => void } {
  const refreshIndex = useRideLedgerStore(s => s.refreshIndex);
  const triggerRefresh = useRideLedgerStore(s => s.triggerRefresh);

  const commutes = useMemo(() => {
    return CommutesRepo.getCommuteHistory(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filter?.startDate,
    filter?.endDate,
    filter?.ownerId,
    filter?.commuteType,
    filter?.paymentStatus,
    filter?.search,
    refreshIndex,
  ]);

  return { commutes, refresh: triggerRefresh };
}

export function useCalendarRange(startDate: string, endDate: string) {
  const refreshIndex = useRideLedgerStore(s => s.refreshIndex);

  const calendarData = useMemo(() => {
    return CommutesRepo.getCalendarRange(startDate, endDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, refreshIndex]);

  return calendarData;
}

export function useSettings(): { settings: AppSettings; update: (data: Partial<AppSettings>) => void } {
  const refreshIndex = useRideLedgerStore(s => s.refreshIndex);
  const triggerRefresh = useRideLedgerStore(s => s.triggerRefresh);

  const settings = useMemo(() => {
    return SettingsRepo.getSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshIndex]);

  const update = (data: Partial<AppSettings>) => {
    SettingsRepo.updateSettings(data);
    triggerRefresh();
  };

  return { settings, update };
}

export function useAnalytics(yearMonth: string): MonthAnalytics {
  const refreshIndex = useRideLedgerStore(s => s.refreshIndex);

  const analytics = useMemo(() => {
    return AnalyticsRepo.getMonthAnalytics(yearMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearMonth, refreshIndex]);

  return analytics;
}

export function useUnloggedDates() {
  const refreshIndex = useRideLedgerStore(s => s.refreshIndex);

  const unlogged = useMemo(() => {
    return CommutesRepo.getUnloggedDates(14);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshIndex]);

  return unlogged;
}
