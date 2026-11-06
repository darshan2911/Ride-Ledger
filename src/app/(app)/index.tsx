import { useRouter } from 'expo-router';
import {
  AlertCircle,
  Calendar,
  Car,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Moon,
  Plus,
  Sun,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react-native';
import * as React from 'react';
import {
  Image,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CommuteBadge } from '@/components/ui/commute-badge';
import { FocusAwareStatusBar } from '@/components/ui/focus-aware-status-bar';
import { StatCard } from '@/components/ui/stat-card';
import { Text } from '@/components/ui/text';
import { formatDateFriendly, formatPaise, getTodayDateString } from '@/lib/currency';
import { useDashboard } from '@/lib/hooks/use-rideledger';

export default function HomeDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { stats, refresh } = useDashboard();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    refresh();
    setTimeout(() => setRefreshing(false), 300);
  }, [refresh]);

  const todayStr = getTodayDateString();

  return (
    <View
      style={{ paddingTop: insets.top }}
      className="flex-1 bg-neutral-50 dark:bg-neutral-950"
    >
      <FocusAwareStatusBar />

      {/* Top App Bar */}
      <View className="flex-row items-center justify-between border-b border-neutral-200 bg-white px-5 py-4 dark:border-neutral-800 dark:bg-neutral-900">
        <View className="flex-row items-center">
          <Image
            source={require('../../../assets/logo.png')}
            className="mr-3 size-11 rounded-2xl"
            resizeMode="cover"
          />
          <View>
            <Text className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
              RideLedger
            </Text>
            <Text className="text-xs text-neutral-500">
              Personal Commute & Carpool Tracker
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/owners')}
          className="flex-row items-center rounded-xl bg-neutral-100 px-3 py-1.5 dark:bg-neutral-800"
        >
          <Users size={15} color="#4F46E5" />
          <Text className="ml-1.5 text-xs font-bold text-neutral-800 dark:text-neutral-200">
            Owners
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-5 py-4"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Missed Logging Alert Banner */}
        {stats.unlogged_past_days_count > 0 && (
          <View className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/60 dark:bg-amber-950/30">
            <View className="flex-row items-start">
              <AlertCircle size={20} color="#d97706" className="mt-0.5" />
              <View className="ml-3 flex-1">
                <Text className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  {stats.unlogged_past_days_count}
                  {' '}
                  Missed Commute
                  {stats.unlogged_past_days_count > 1 ? 's' : ''}
                  {' '}
                  Detected
                </Text>
                <Text className="mt-0.5 text-xs text-amber-800/80 dark:text-amber-300/80">
                  You haven’t recorded your commute for recent working days.
                </Text>

                <View className="mt-3 flex-row gap-2.5">
                  <TouchableOpacity
                    onPress={() => router.push('/bulk-log')}
                    className="rounded-lg bg-amber-600 px-3 py-1.5 active:bg-amber-700"
                  >
                    <Text className="text-xs font-bold text-white">Bulk Log Now</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => router.push('/quick-log')}
                    className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 dark:bg-neutral-900"
                  >
                    <Text className="text-xs font-bold text-amber-800 dark:text-amber-200">
                      Single Day
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Today's Commute Status Card */}
        <View className="mb-5 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="rounded-xl bg-primary-50 p-2 dark:bg-primary-900/30">
                <Car size={20} color="#4F46E5" />
              </View>
              <View className="ml-3">
                <Text className="text-xs font-semibold tracking-wider text-neutral-400 uppercase">
                  Today’s Commute
                </Text>
                <Text className="text-base font-bold text-neutral-900 dark:text-white">
                  {formatDateFriendly(todayStr)}
                </Text>
              </View>
            </View>

            <CommuteBadge type={stats.today_status} size="md" />
          </View>

          {stats.today_status === 'not_logged'
            ? (
                <View className="mt-4 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                  <Text className="text-xs text-neutral-500">
                    You haven’t recorded today’s trip yet. Takes ~5 seconds!
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push('/quick-log')}
                    className="mt-3 flex-row items-center justify-center rounded-2xl bg-primary-600 py-3 active:bg-primary-700"
                  >
                    <Plus size={18} color="#ffffff" />
                    <Text className="ml-2 text-sm font-bold text-white">Log Today’s Commute</Text>
                  </TouchableOpacity>
                </View>
              )
            : (
                <View className="mt-4 flex-row items-center justify-between border-t border-neutral-100 pt-3 dark:border-neutral-800">
                  <View>
                    <Text className="text-xs text-neutral-400">Expense Today</Text>
                    <Text className="text-lg font-extrabold text-neutral-900 dark:text-white">
                      {formatPaise(stats.today_expense_paise)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => router.push(`/quick-log?date=${todayStr}`)}
                    className="rounded-xl bg-neutral-100 px-3 py-1.5 dark:bg-neutral-800"
                  >
                    <Text className="text-xs font-bold text-primary-600 dark:text-primary-400">
                      Edit Entry
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
        </View>

        {/* Financial Overview Stat Grid */}
        <View className="mb-5 flex-row gap-3">
          <View className="flex-1">
            <StatCard
              title="Outstanding"
              value={formatPaise(stats.total_outstanding_paise)}
              subtitle="Pending to carpool owners"
              variant={stats.total_outstanding_paise > 0 ? 'warning' : 'success'}
              icon={<CreditCard size={18} color={stats.total_outstanding_paise > 0 ? '#f59e0b' : '#10b981'} />}
            />
          </View>

          <View className="flex-1">
            <StatCard
              title="This Month"
              value={formatPaise(stats.month_expense_paise)}
              subtitle={`${stats.month_carpool_days} carpool days`}
              variant="primary"
              icon={<TrendingUp size={18} color="#4F46E5" />}
            />
          </View>
        </View>

        {/* Quick Action Buttons */}
        <View className="mb-6 flex-row gap-3">
          <TouchableOpacity
            onPress={() => router.push('/quick-log')}
            className="flex-1 flex-row items-center justify-center rounded-2xl bg-primary-600 py-3.5 shadow-sm active:bg-primary-700"
          >
            <Plus size={18} color="#ffffff" />
            <Text className="ml-1.5 text-xs font-bold text-white">Log Commute</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              if (stats.owners.length === 0) {
                router.push('/owners/edit');
              }
              else {
                router.push('/payments/record');
              }
            }}
            className="flex-1 flex-row items-center justify-center rounded-2xl bg-emerald-600 py-3.5 shadow-sm active:bg-emerald-700"
          >
            <CreditCard size={18} color="#ffffff" />
            <Text className="ml-1.5 text-xs font-bold text-white">Record Payment</Text>
          </TouchableOpacity>
        </View>

        {/* Outstanding Carpool Owners Section */}
        <View className="mb-6">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
              Carpool Owner Balances
            </Text>
            {stats.owners.length > 0 && (
              <TouchableOpacity onPress={() => router.push('/owners')}>
                <Text className="text-xs font-bold text-primary-600">View All</Text>
              </TouchableOpacity>
            )}
          </View>

          <View className="gap-3">
            {stats.owners.length === 0 ? (
              <View className="items-center rounded-3xl border border-dashed border-neutral-300 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
                <View className="size-12 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-900/30">
                  <Users size={24} color="#FF6C00" />
                </View>
                <Text className="mt-3 text-sm font-bold text-neutral-900 dark:text-white">
                  No Carpool Owners Added
                </Text>
                <Text className="mt-1 max-w-[260px] text-center text-xs text-neutral-400">
                  Add your carpool drivers to calculate fares, split trips, and track balances.
                </Text>
                <TouchableOpacity
                  onPress={() => router.push('/owners/edit')}
                  className="mt-4 flex-row items-center rounded-xl bg-primary-600 px-4 py-2.5 shadow-sm active:bg-primary-700"
                >
                  <Plus size={16} color="#ffffff" />
                  <Text className="ml-1.5 text-xs font-bold text-white">Add Carpool Owner</Text>
                </TouchableOpacity>
              </View>
            ) : (
              stats.owners.map(owner => (
                <TouchableOpacity
                  key={owner.id}
                  onPress={() => router.push(`/owners/${owner.id}`)}
                  className="flex-row items-center justify-between rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <View className="flex-1 flex-row items-center">
                    <View className="size-10 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/40">
                      <Text className="text-base font-bold text-primary-700 dark:text-primary-300">
                        {owner.name.charAt(0)}
                      </Text>
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-sm font-bold text-neutral-900 dark:text-white">
                        {owner.name}
                      </Text>
                      <Text className="text-[11px] text-neutral-400">
                        {owner.unpaid_trips_count > 0
                          ? `${owner.unpaid_trips_count} unpaid trip${owner.unpaid_trips_count > 1 ? 's' : ''}`
                          : 'No pending trips'}
                      </Text>
                    </View>
                  </View>

                  <View className="items-end pl-3">
                    <Text
                      className={`text-base font-black ${
                        owner.outstanding_balance_paise > 0
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {formatPaise(owner.outstanding_balance_paise)}
                    </Text>
                    <Text className="text-[10px] text-neutral-400">
                      {owner.last_payment_date ? `Paid ${formatDateFriendly(owner.last_payment_date)}` : 'No payments yet'}
                    </Text>
                  </View>

                  <ChevronRight size={16} color="#a1a1aa" className="ml-2" />
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        {/* Recent Commute Activity */}
        <View className="mb-6">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
              Recent Commutes
            </Text>
            <TouchableOpacity onPress={() => router.push('/(app)/history')}>
              <Text className="text-xs font-bold text-primary-600">Full History</Text>
            </TouchableOpacity>
          </View>

          <View className="gap-2.5">
            {stats.recent_commutes.length === 0
              ? (
                  <View className="items-center rounded-2xl border border-dashed border-neutral-200 py-6 dark:border-neutral-800">
                    <Text className="text-xs text-neutral-400">No commute entries recorded yet.</Text>
                  </View>
                )
              : (
                  stats.recent_commutes.map((commute) => {
                    const morning = commute.trips.find(t => t.trip_type === 'morning');
                    const evening = commute.trips.find(t => t.trip_type === 'evening');

                    return (
                      <TouchableOpacity
                        key={commute.id}
                        onPress={() => router.push(`/quick-log?date=${commute.date}`)}
                        className="flex-row items-center justify-between rounded-2xl border border-neutral-200 bg-white p-3.5 dark:border-neutral-800 dark:bg-neutral-900"
                      >
                        <View className="flex-1">
                          <View className="flex-row items-center">
                            <Text className="mr-2 text-xs font-bold text-neutral-900 dark:text-white">
                              {formatDateFriendly(commute.date)}
                            </Text>
                            <CommuteBadge type={commute.commute_type} size="sm" />
                          </View>

                          {commute.commute_type === 'carpool' && (
                            <View className="mt-1 flex-row items-center gap-2">
                              {morning && (
                                <Text className="text-[11px] text-neutral-500">
                                  ☀️
                                  {' '}
                                  {morning.owner_name}
                                  {' '}
                                  (
                                  {formatPaise(morning.fare_paise)}
                                  )
                                </Text>
                              )}
                              {evening && (
                                <Text className="text-[11px] text-neutral-500">
                                  🌙
                                  {' '}
                                  {evening.owner_name}
                                  {' '}
                                  (
                                  {formatPaise(evening.fare_paise)}
                                  )
                                </Text>
                              )}
                            </View>
                          )}
                        </View>

                        <View className="items-end pl-2">
                          <Text className="text-sm font-bold text-neutral-900 dark:text-white">
                            {formatPaise(commute.total_fare_paise)}
                          </Text>
                          {commute.commute_type === 'carpool' && (
                            <CommuteBadge type={commute.payment_status} size="sm" />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
          </View>
        </View>

        <View className="h-16" />
      </ScrollView>
    </View>
  );
}
