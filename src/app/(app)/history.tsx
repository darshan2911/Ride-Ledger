import type { CommuteType, PaymentStatus } from '@/db';
import { useRouter } from 'expo-router';
import {
  Calendar,
  Edit2,
  Moon,
  Search,
  Sun,
  Trash2,
  X,
} from 'lucide-react-native';
import * as React from 'react';
import { useState } from 'react';
import {
  Alert,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { showMessage } from 'react-native-flash-message';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommuteBadge } from '@/components/ui/commute-badge';
import { FocusAwareStatusBar } from '@/components/ui/focus-aware-status-bar';
import { Text } from '@/components/ui/text';
import { CommutesRepo } from '@/db';
import { formatDateWithDay, formatPaise, getTodayDateString, getYesterdayDateString } from '@/lib/currency';
import { useCommuteHistory } from '@/lib/hooks/use-rideledger';
import { useRideLedgerStore } from '@/lib/rideledger-store';

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const triggerRefresh = useRideLedgerStore(s => s.triggerRefresh);

  const todayStr = getTodayDateString();
  const yesterdayStr = getYesterdayDateString();

  const [search, setSearch] = useState('');
  const [commuteType, setCommuteType] = useState<CommuteType | 'all'>('all');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | 'all'>('all');
  const [selectedOwnerId] = useState<string | undefined>(undefined);

  const { commutes } = useCommuteHistory({
    search: search.trim() || undefined,
    commuteType,
    paymentStatus,
    ownerId: selectedOwnerId,
  });

  const handleDelete = (id: string, date: string) => {
    Alert.alert(
      'Delete Commute?',
      `Are you sure you want to remove the record for ${date}? Any associated payment allocations will be cleanly adjusted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            CommutesRepo.deleteCommute(id);
            triggerRefresh();
            showMessage({
              message: 'Commute Deleted',
              type: 'info',
            });
          },
        },
      ],
    );
  };

  return (
    <View
      style={{ paddingTop: insets.top }}
      className="flex-1 bg-neutral-50 dark:bg-neutral-950"
    >
      <FocusAwareStatusBar />

      {/* Header */}
      <View className="border-b border-neutral-200 bg-white px-5 py-4 dark:border-neutral-800 dark:bg-neutral-900">
        <Text className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
          Commute History
        </Text>
        <Text className="text-xs text-neutral-500">
          All recorded trips, notes & settlement status
        </Text>

        {/* Search Bar */}
        <View className="mt-3 flex-row items-center rounded-2xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 dark:border-neutral-700 dark:bg-neutral-800">
          <Search size={16} color="#71717a" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by notes or owner name..."
            placeholderTextColor="#a1a1aa"
            className="ml-2.5 flex-1 text-sm text-neutral-900 dark:text-white"
          />
          {search
            ? (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <X size={16} color="#71717a" />
                </TouchableOpacity>
              )
            : null}
        </View>

        {/* Commute Type Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingRight: 10 }}
          className="mt-3"
        >
          {(['all', 'carpool', 'own_vehicle', 'leave'] as const).map((type) => {
            const isSelected = commuteType === type;
            return (
              <TouchableOpacity
                key={type}
                onPress={() => setCommuteType(type)}
                className={`mr-2 rounded-xl border px-3.5 py-1.5 ${
                  isSelected
                    ? 'border-primary-600 bg-primary-50 dark:border-primary-500 dark:bg-primary-950/60'
                    : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
                }`}
              >
                <Text
                  className={`text-xs capitalize ${
                    isSelected
                      ? 'font-bold text-primary-950 dark:text-primary-100'
                      : 'font-medium text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  {type === 'own_vehicle' ? 'Own Bike' : type}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView className="flex-1 px-5 py-4" showsVerticalScrollIndicator={false}>
        {/* Results Count */}
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
            {commutes.length}
            {' '}
            Record
            {commutes.length !== 1 ? 's' : ''}
            {' '}
            Found
          </Text>
          {commuteType === 'carpool' && (
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={() => setPaymentStatus(paymentStatus === 'unpaid' ? 'all' : 'unpaid')}
                className={`rounded-lg border px-2 py-0.5 ${
                  paymentStatus === 'unpaid'
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-neutral-200'
                }`}
              >
                <Text className="text-[10px] font-bold text-amber-600">Pending Only</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Commutes List */}
        <View className="gap-3">
          {commutes.length === 0 ? (
            <View className="items-center rounded-2xl border border-dashed border-neutral-200 py-12 dark:border-neutral-800">
              <Calendar size={36} color="#a1a1aa" />
              <Text className="mt-2 font-bold text-neutral-700 dark:text-neutral-300">
                No matching commutes
              </Text>
              <Text className="mt-1 text-xs text-neutral-400">
                Try clearing filters or search query.
              </Text>
            </View>
          ) : (
            commutes.map((item) => {
              const morning = item.trips.find(t => t.trip_type === 'morning');
              const evening = item.trips.find(t => t.trip_type === 'evening');

              return (
                <View
                  key={item.id}
                  className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
                >
                  {/* Top line: Date, Badges & Actions */}
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-1.5">
                      <Text className="text-sm font-bold text-neutral-900 dark:text-white">
                        {formatDateWithDay(item.date)}
                      </Text>
                      {item.date === todayStr && (
                        <View className="rounded-sm bg-primary-100 px-1.5 py-0.5 dark:bg-primary-950/80">
                          <Text className="text-[10px] font-bold text-primary-700 dark:text-primary-300">Today</Text>
                        </View>
                      )}
                      {item.date === yesterdayStr && (
                        <View className="rounded-sm bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-800">
                          <Text className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400">Yesterday</Text>
                        </View>
                      )}
                      {item.date === todayStr && (
                        <View className="rounded-sm bg-primary-100 px-1.5 py-0.5 dark:bg-primary-950/80">
                          <Text className="text-[10px] font-bold text-primary-700 dark:text-primary-300">Today</Text>
                        </View>
                      )}
                      {item.date === yesterdayStr && (
                        <View className="rounded-sm bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-800">
                          <Text className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400">Yesterday</Text>
                        </View>
                      )}
                      <CommuteBadge type={item.commute_type} size="sm" />
                    </View>

                    <View className="flex-row items-center gap-1.5">
                      <TouchableOpacity
                        onPress={() => router.push(`/quick-log?date=${item.date}`)}
                        className="rounded-full bg-neutral-100 p-1.5 dark:bg-neutral-800"
                      >
                        <Edit2 size={13} color="#71717a" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDelete(item.id, item.date)}
                        className="rounded-full bg-neutral-100 p-1.5 dark:bg-neutral-800"
                      >
                        <Trash2 size={13} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Trip Details if Carpool */}
                  {item.commute_type === 'carpool' && (
                    <View className="mt-3 gap-2 rounded-xl bg-neutral-50 p-2.5 dark:bg-neutral-800/40">
                      {morning && (
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center">
                            <Sun size={14} color="#d97706" />
                            <Text className="ml-2 text-xs font-medium text-neutral-700 dark:text-neutral-300">
                              Morning:
                              {' '}
                              {morning.owner_name}
                            </Text>
                          </View>
                          <View className="flex-row items-center">
                            <Text className="mr-1.5 text-xs font-bold text-neutral-900 dark:text-white">
                              {formatPaise(morning.fare_paise)}
                            </Text>
                            <CommuteBadge type={morning.payment_status} size="sm" />
                          </View>
                        </View>
                      )}

                      {evening && (
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center">
                            <Moon size={14} color="#6366F1" />
                            <Text className="ml-2 text-xs font-medium text-neutral-700 dark:text-neutral-300">
                              Evening:
                              {' '}
                              {evening.owner_name}
                            </Text>
                          </View>
                          <View className="flex-row items-center">
                            <Text className="mr-1.5 text-xs font-bold text-neutral-900 dark:text-white">
                              {formatPaise(evening.fare_paise)}
                            </Text>
                            <CommuteBadge type={evening.payment_status} size="sm" />
                          </View>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Notes & Bottom summary */}
                  <View className="mt-2.5 flex-row items-center justify-between">
                    <Text className="mr-2 flex-1 text-xs text-neutral-400 italic" numberOfLines={1}>
                      {item.notes || 'No notes'}
                    </Text>

                    <View className="items-end">
                      <Text className="text-base font-black text-neutral-900 dark:text-white">
                        {formatPaise(item.total_fare_paise)}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View className="h-20" />
      </ScrollView>
    </View>
  );
}
