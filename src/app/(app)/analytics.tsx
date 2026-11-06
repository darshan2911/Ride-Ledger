import { useRouter } from 'expo-router';
import {
  Award,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Moon,
  PieChart,
  Sun,
  TrendingUp,
  Users,
} from 'lucide-react-native';
import * as React from 'react';
import { useState } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FocusAwareStatusBar } from '@/components/ui/focus-aware-status-bar';
import { StatCard } from '@/components/ui/stat-card';
import { Text } from '@/components/ui/text';
import { formatPaise, getTodayDateString } from '@/lib/currency';
import { useAnalytics } from '@/lib/hooks/use-rideledger';

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const todayStr = getTodayDateString();
  const [yearMonth, setYearMonth] = useState(todayStr.slice(0, 7)); // YYYY-MM

  const analytics = useAnalytics(yearMonth);

  // Month navigation
  const [year, month] = yearMonth.split('-').map(Number);
  const prevMonth = () => {
    const d = new Date(year, month - 2, 1);
    setYearMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const nextMonth = () => {
    const d = new Date(year, month, 1);
    setYearMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const monthLabel = new Date(year, month - 1, 1).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <View
      style={{ paddingTop: insets.top }}
      className="flex-1 bg-neutral-50 dark:bg-neutral-950"
    >
      <FocusAwareStatusBar />

      {/* Header */}
      <View className="border-b border-neutral-200 bg-white px-5 py-4 dark:border-neutral-800 dark:bg-neutral-900">
        <Text className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
          Expense Analytics
        </Text>
        <Text className="text-xs text-neutral-500">
          Monthly breakdown, spending trends & driver share
        </Text>

        {/* Month Selector */}
        <View className="mt-3 flex-row items-center justify-between">
          <TouchableOpacity
            onPress={prevMonth}
            className="rounded-full bg-neutral-100 p-2 dark:bg-neutral-800"
          >
            <ChevronLeft size={18} color="#71717a" />
          </TouchableOpacity>

          <Text className="text-base font-bold text-neutral-900 dark:text-white">
            {monthLabel}
          </Text>

          <TouchableOpacity
            onPress={nextMonth}
            className="rounded-full bg-neutral-100 p-2 dark:bg-neutral-800"
          >
            <ChevronRight size={18} color="#71717a" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-5 py-4" showsVerticalScrollIndicator={false}>
        {/* Top 2 Metric Cards */}
        <View className="mb-4 flex-row gap-3">
          <View className="flex-1">
            <StatCard
              title="Month Expense"
              value={formatPaise(analytics.total_carpool_expense_paise)}
              subtitle={`${analytics.carpool_days} carpool days`}
              variant="primary"
              icon={<TrendingUp size={18} color="#4F46E5" />}
            />
          </View>

          <View className="flex-1">
            <StatCard
              title="Daily Average"
              value={formatPaise(analytics.avg_daily_expense_paise)}
              subtitle="Per carpool day"
              variant="default"
              icon={<BarChart3 size={18} color="#71717a" />}
            />
          </View>
        </View>

        {/* Year Expense & Outstanding */}
        <View className="mb-5 flex-row gap-3">
          <View className="flex-1">
            <StatCard
              title="Year-to-Date"
              value={formatPaise(analytics.total_year_expense_paise)}
              subtitle={`Total in ${year}`}
              variant="default"
            />
          </View>

          <View className="flex-1">
            <StatCard
              title="Paid This Month"
              value={formatPaise(analytics.total_paid_paise)}
              subtitle="Settled to owners"
              variant="success"
            />
          </View>
        </View>

        {/* Morning vs Evening Split */}
        <View className="mb-5 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <Text className="mb-3 text-xs font-semibold tracking-wider text-neutral-500 uppercase">
            Morning vs Evening Commute Spend
          </Text>

          <View className="mb-3 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="rounded-lg bg-amber-50 p-2 dark:bg-amber-950/40">
                <Sun size={18} color="#d97706" />
              </View>
              <View className="ml-3">
                <Text className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  Morning Trips
                </Text>
                <Text className="text-xs text-neutral-400">Home → Office</Text>
              </View>
            </View>
            <Text className="text-base font-bold text-neutral-900 dark:text-white">
              {formatPaise(analytics.morning_expense_paise)}
            </Text>
          </View>

          <View className="flex-row items-center justify-between border-t border-neutral-100 pt-2 dark:border-neutral-800">
            <View className="flex-row items-center">
              <View className="rounded-lg bg-indigo-50 p-2 dark:bg-indigo-950/40">
                <Moon size={18} color="#4F46E5" />
              </View>
              <View className="ml-3">
                <Text className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  Evening Trips
                </Text>
                <Text className="text-xs text-neutral-400">Office → Home</Text>
              </View>
            </View>
            <Text className="text-base font-bold text-neutral-900 dark:text-white">
              {formatPaise(analytics.evening_expense_paise)}
            </Text>
          </View>
        </View>

        {/* Driver / Owner Distribution */}
        <View className="mb-5 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
              Driver Distribution (
              {monthLabel}
              )
            </Text>
            {analytics.most_frequent_owner_name && (
              <View className="dark:bg-primary-950/40 flex-row items-center rounded-lg bg-primary-50 px-2 py-0.5">
                <Award size={13} color="#4F46E5" />
                <Text className="ml-1 text-[11px] font-bold text-primary-700 dark:text-primary-300">
                  Top:
                  {' '}
                  {analytics.most_frequent_owner_name}
                </Text>
              </View>
            )}
          </View>

          {analytics.owner_distribution.length === 0 ? (
            <View className="items-center py-4">
              <Text className="text-xs text-neutral-400">No carpool trips logged this month.</Text>
            </View>
          ) : (
            <View className="gap-3">
              {analytics.owner_distribution.map((driver) => {
                const percent
                  = analytics.total_carpool_expense_paise > 0
                    ? Math.round(
                        (driver.total_fare_paise / analytics.total_carpool_expense_paise) * 100,
                      )
                    : 0;

                return (
                  <View key={driver.owner_id}>
                    <View className="mb-1 flex-row items-center justify-between">
                      <Text className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                        {driver.owner_name}
                        {' '}
                        (
                        {driver.total_trips}
                        {' '}
                        trips)
                      </Text>
                      <Text className="text-xs font-bold text-neutral-900 dark:text-white">
                        {formatPaise(driver.total_fare_paise)}
                        {' '}
                        (
                        {percent}
                        %)
                      </Text>
                    </View>

                    {/* Progress Bar */}
                    <View className="h-2 w-full rounded-full bg-neutral-100 dark:bg-neutral-800">
                      <View
                        className="h-2 rounded-full bg-primary-600"
                        style={{ width: `${Math.min(100, Math.max(5, percent))}%` }}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Days Breakdown */}
        <View className="mb-6 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <Text className="mb-3 text-xs font-semibold tracking-wider text-neutral-500 uppercase">
            Commute Mode Breakdown
          </Text>

          <View className="flex-row justify-between">
            <View className="flex-1 items-center">
              <Text className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {analytics.carpool_days}
              </Text>
              <Text className="mt-1 text-xs text-neutral-500">Carpool Days</Text>
            </View>

            <View className="flex-1 items-center border-x border-neutral-100 dark:border-neutral-800">
              <Text className="text-2xl font-black text-blue-600 dark:text-blue-400">
                {analytics.own_vehicle_days}
              </Text>
              <Text className="mt-1 text-xs text-neutral-500">Own Bike</Text>
            </View>

            <View className="flex-1 items-center">
              <Text className="text-2xl font-black text-neutral-600 dark:text-neutral-300">
                {analytics.leave_days}
              </Text>
              <Text className="mt-1 text-xs text-neutral-500">Leave / Off</Text>
            </View>
          </View>
        </View>

        <View className="h-20" />
      </ScrollView>
    </View>
  );
}
