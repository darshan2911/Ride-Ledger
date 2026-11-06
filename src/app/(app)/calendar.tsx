import { useRouter } from 'expo-router';
import {
  Calendar as CalendarIcon,
  Car,
  ChevronLeft,
  ChevronRight,
  Moon,
  Plus,
  Sun,
} from 'lucide-react-native';
import * as React from 'react';
import { useMemo, useState } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CommuteBadge } from '@/components/ui/commute-badge';
import { FocusAwareStatusBar } from '@/components/ui/focus-aware-status-bar';
import { Text } from '@/components/ui/text';
import { CommutesRepo } from '@/db';
import { formatDateFriendly, formatPaise, getTodayDateString } from '@/lib/currency';
import { useCalendarRange, useSettings } from '@/lib/hooks/use-rideledger';

export default function CalendarScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const todayStr = getTodayDateString();
  const { settings } = useSettings();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Range for calendar query
  const startMonthStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endMonthStr = `${year}-${String(month + 1).padStart(2, '0')}-31`;
  const calendarMap = useCalendarRange(startMonthStr, endMonthStr);

  // Month Navigation
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Compute days in month grid
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0=Sun, 1=Mon...
  // Shift to start week with Monday (0=Mon ... 6=Sun)
  const startCol = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

  const selectedCommute = useMemo(() => {
    return CommutesRepo.getCommuteByDate(selectedDate);
  }, [selectedDate, calendarMap]);

  return (
    <View
      style={{ paddingTop: insets.top }}
      className="flex-1 bg-neutral-50 dark:bg-neutral-950"
    >
      <FocusAwareStatusBar />

      {/* Header */}
      <View className="border-b border-neutral-200 bg-white px-5 py-4 dark:border-neutral-800 dark:bg-neutral-900">
        <Text className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
          Commute Calendar
        </Text>
        <Text className="text-xs text-neutral-500">
          Monthly visual commute schedule & status
        </Text>

        {/* Month Navigator */}
        <View className="mt-3 flex-row items-center justify-between">
          <TouchableOpacity
            onPress={prevMonth}
            className="rounded-full bg-neutral-100 p-2 dark:bg-neutral-800"
          >
            <ChevronLeft size={18} color="#71717a" />
          </TouchableOpacity>

          <Text className="text-base font-bold text-neutral-900 dark:text-white">
            {monthName}
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
        {/* Calendar Grid Container */}
        <View className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          {/* Day of Week Headers */}
          <View className="mb-2 flex-row">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <View key={day} className="flex-1 items-center py-1">
                <Text className="text-[11px] font-bold text-neutral-400 uppercase">
                  {day}
                </Text>
              </View>
            ))}
          </View>

          {/* Days Grid */}
          <View className="flex-row flex-wrap">
            {/* Empty slots before first day */}
            {Array.from({ length: startCol }).map((_, idx) => (
              <View key={`empty-${idx}`} className="h-11 w-[14.28%] p-0.5" />
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isSelected = selectedDate === dateStr;
              const isToday = todayStr === dateStr;

              const entry = calendarMap[dateStr];
              const dayDate = new Date(year, month, dayNum);
              const dayOfWeek = dayDate.getDay() === 0 ? 7 : dayDate.getDay();
              const isWorkingDay = settings.working_days.includes(dayOfWeek);
              const isPast = dayDate < new Date(`${todayStr}T00:00:00`);

              let dotColor = '';
              if (entry) {
                if (entry.commute_type === 'carpool')
                  dotColor = 'bg-emerald-500';
                else if (entry.commute_type === 'own_vehicle')
                  dotColor = 'bg-blue-500';
                else if (entry.commute_type === 'leave')
                  dotColor = 'bg-neutral-400';
              }
              else if (isWorkingDay && isPast) {
                dotColor = 'bg-amber-500'; // Unlogged missed day
              }

              return (
                <TouchableOpacity
                  key={dateStr}
                  onPress={() => setSelectedDate(dateStr)}
                  className={`h-11 w-[14.28%] items-center justify-center rounded-xl p-0.5 ${
                    isSelected
                      ? 'bg-primary-600'
                      : isToday
                        ? 'border border-primary-500/50'
                        : ''
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      isSelected
                        ? 'text-white'
                        : isToday
                          ? 'font-bold text-primary-600 dark:text-primary-400'
                          : 'text-neutral-800 dark:text-neutral-200'
                    }`}
                  >
                    {dayNum}
                  </Text>

                  {/* Indicator Dot */}
                  <View className="mt-0.5 size-1.5 items-center justify-center">
                    {dotColor
                      ? (
                          <View
                            className={`size-1.5 rounded-full ${
                              isSelected ? 'bg-white' : dotColor
                            }`}
                          />
                        )
                      : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Legend */}
        <View className="mt-3 flex-row items-center justify-around rounded-2xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
          <View className="flex-row items-center">
            <View className="mr-1.5 size-2 rounded-full bg-emerald-500" />
            <Text className="text-[10px] text-neutral-500">Carpool</Text>
          </View>
          <View className="flex-row items-center">
            <View className="mr-1.5 size-2 rounded-full bg-blue-500" />
            <Text className="text-[10px] text-neutral-500">Own Bike</Text>
          </View>
          <View className="flex-row items-center">
            <View className="mr-1.5 size-2 rounded-full bg-neutral-400" />
            <Text className="text-[10px] text-neutral-500">Leave</Text>
          </View>
          <View className="flex-row items-center">
            <View className="mr-1.5 size-2 rounded-full bg-amber-500" />
            <Text className="text-[10px] text-neutral-500">Unlogged</Text>
          </View>
        </View>

        {/* Selected Date Detail Card */}
        <View className="mt-5 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-xs font-semibold tracking-wider text-neutral-400 uppercase">
                Selected Date
              </Text>
              <Text className="text-lg font-bold text-neutral-900 dark:text-white">
                {formatDateFriendly(selectedDate)}
                {' '}
                (
                {selectedDate}
                )
              </Text>
            </View>

            {selectedCommute
              ? (
                  <CommuteBadge type={selectedCommute.commute_type} size="md" />
                )
              : (
                  <CommuteBadge type="not_logged" size="md" />
                )}
          </View>

          {selectedCommute
            ? (
                <View className="mt-4 gap-3 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                  {selectedCommute.commute_type === 'carpool' && (
                    <View className="gap-2">
                      {selectedCommute.trips.map(t => (
                        <View
                          key={t.id}
                          className="flex-row items-center justify-between rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800/40"
                        >
                          <View className="flex-row items-center">
                            {t.trip_type === 'morning'
                              ? (
                                  <Sun size={16} color="#d97706" />
                                )
                              : (
                                  <Moon size={16} color="#4F46E5" />
                                )}
                            <View className="ml-2.5">
                              <Text className="text-xs font-bold text-neutral-800 capitalize dark:text-neutral-200">
                                {t.trip_type}
                                {' '}
                                Trip
                              </Text>
                              <Text className="text-[11px] text-neutral-500">
                                Driver:
                                {' '}
                                {t.owner_name}
                              </Text>
                            </View>
                          </View>

                          <View className="items-end">
                            <Text className="text-sm font-bold text-neutral-900 dark:text-white">
                              {formatPaise(t.fare_paise)}
                            </Text>
                            <CommuteBadge type={t.payment_status} size="sm" />
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {selectedCommute.notes && (
                    <Text className="text-xs text-neutral-500 italic">
                      Note:
                      {' '}
                      {selectedCommute.notes}
                    </Text>
                  )}

                  <View className="flex-row items-center justify-between pt-2">
                    <Text className="text-xs text-neutral-400">Total Charge</Text>
                    <Text className="text-lg font-black text-neutral-900 dark:text-white">
                      {formatPaise(selectedCommute.total_fare_paise)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => router.push(`/quick-log?date=${selectedDate}`)}
                    className="mt-2 flex-row items-center justify-center rounded-2xl bg-neutral-100 py-3 dark:bg-neutral-800"
                  >
                    <Text className="text-xs font-bold text-primary-600 dark:text-primary-400">
                      Edit This Commute
                    </Text>
                  </TouchableOpacity>
                </View>
              )
            : (
                <View className="mt-4 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                  <Text className="text-xs text-neutral-500">
                    No commute recorded for this day.
                  </Text>

                  <TouchableOpacity
                    onPress={() => router.push(`/quick-log?date=${selectedDate}`)}
                    className="mt-3 flex-row items-center justify-center rounded-2xl bg-primary-600 py-3 active:bg-primary-700"
                  >
                    <Plus size={16} color="#ffffff" />
                    <Text className="ml-2 text-xs font-bold text-white">
                      Log For
                      {' '}
                      {selectedDate}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
        </View>

        <View className="h-20" />
      </ScrollView>
    </View>
  );
}
