import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Archive,
  ArrowLeft,
  CheckCircle2,
  Clock,
  CreditCard,
  Edit2,
  Moon,
  Phone,
  RefreshCw,
  Sun,
} from 'lucide-react-native';
import * as React from 'react';
import { useState } from 'react';
import {
  Alert,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { showMessage } from 'react-native-flash-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CommuteBadge } from '@/components/ui/commute-badge';
import { FocusAwareStatusBar } from '@/components/ui/focus-aware-status-bar';
import { Text } from '@/components/ui/text';
import { OwnersRepo } from '@/db';
import { formatDateFriendly, formatPaise } from '@/lib/currency';
import { useOwner, useOwnerPayments, useOwnerTrips } from '@/lib/hooks/use-rideledger';
import { useRideLedgerStore } from '@/lib/rideledger-store';

export default function OwnerDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const { owner } = useOwner(params.id);
  const triggerRefresh = useRideLedgerStore(s => s.triggerRefresh);

  const [activeTab, setActiveTab] = useState<'unpaid' | 'all' | 'payments'>('unpaid');

  const unpaidTrips = useOwnerTrips(params.id, 'unpaid');
  const partiallyPaidTrips = useOwnerTrips(params.id, 'partially_paid');
  const allTrips = useOwnerTrips(params.id, 'all');
  const payments = useOwnerPayments(params.id);

  if (!owner) {
    return (
      <View
        style={{ paddingTop: insets.top }}
        className="flex-1 items-center justify-center bg-neutral-50 p-5 dark:bg-neutral-950"
      >
        <Text className="text-base text-neutral-500">Carpool owner not found.</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 rounded-xl bg-primary-600 px-4 py-2"
        >
          <Text className="font-bold text-white">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleToggleArchive = () => {
    Alert.alert(
      owner.is_active === 1 ? 'Archive Owner?' : 'Unarchive Owner?',
      owner.is_active === 1
        ? `Are you sure you want to archive ${owner.name}? Historical records and payments will remain safely intact.`
        : `Make ${owner.name} active again?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: owner.is_active === 1 ? 'Archive' : 'Unarchive',
          style: owner.is_active === 1 ? 'destructive' : 'default',
          onPress: () => {
            if (owner.is_active === 1) {
              OwnersRepo.archiveOwner(owner.id);
            }
            else {
              OwnersRepo.unarchiveOwner(owner.id);
            }
            triggerRefresh();
            showMessage({
              message: owner.is_active === 1 ? 'Owner Archived' : 'Owner Restored',
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
      <View className="flex-row items-center justify-between border-b border-neutral-200 bg-white px-5 py-4 dark:border-neutral-800 dark:bg-neutral-900">
        <TouchableOpacity
          onPress={() => router.back()}
          className="rounded-full bg-neutral-100 p-2 dark:bg-neutral-800"
        >
          <ArrowLeft size={18} color="#71717a" />
        </TouchableOpacity>

        <Text className="text-lg font-bold text-neutral-900 dark:text-white">
          {owner.name}
          ’s Account
        </Text>

        <View className="flex-row items-center space-x-1">
          <TouchableOpacity
            onPress={() => router.push(`/owners/edit?id=${owner.id}`)}
            className="rounded-full bg-neutral-100 p-2 dark:bg-neutral-800"
          >
            <Edit2 size={16} color="#71717a" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleToggleArchive}
            className="rounded-full bg-neutral-100 p-2 dark:bg-neutral-800"
          >
            <Archive size={16} color={owner.is_active === 1 ? '#71717a' : '#16a34a'} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-5 py-4" showsVerticalScrollIndicator={false}>
        {/* Outstanding Balance Banner */}
        <View className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
              Outstanding Balance
            </Text>
            {owner.unpaid_trips_count > 0
              ? (
                  <View className="rounded-full bg-amber-50 px-2.5 py-0.5 dark:bg-amber-950/40">
                    <Text className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      {owner.unpaid_trips_count}
                      {' '}
                      unpaid trip
                      {owner.unpaid_trips_count > 1 ? 's' : ''}
                    </Text>
                  </View>
                )
              : (
                  <View className="rounded-full bg-emerald-50 px-2.5 py-0.5 dark:bg-emerald-950/40">
                    <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      All Settled
                    </Text>
                  </View>
                )}
          </View>

          <Text
            className={`mt-2 text-4xl font-black tracking-tight ${
              owner.outstanding_balance_paise > 0
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-neutral-900 dark:text-white'
            }`}
          >
            {formatPaise(owner.outstanding_balance_paise)}
          </Text>

          {/* Quick Metrics */}
          <View className="mt-5 flex-row border-t border-neutral-100 pt-4 dark:border-neutral-800">
            <View className="flex-1">
              <Text className="text-[11px] text-neutral-400 uppercase">Lifetime Charges</Text>
              <Text className="mt-0.5 text-sm font-bold text-neutral-800 dark:text-neutral-200">
                {formatPaise(owner.total_charges_paise)}
              </Text>
            </View>

            <View className="flex-1">
              <Text className="text-[11px] text-neutral-400 uppercase">Total Settled</Text>
              <Text className="mt-0.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {formatPaise(owner.total_paid_paise)}
              </Text>
            </View>

            <View className="flex-1">
              <Text className="text-[11px] text-neutral-400 uppercase">Last Payment</Text>
              <Text className="mt-0.5 text-xs font-medium text-neutral-600 dark:text-neutral-300">
                {owner.last_payment_date ? formatDateFriendly(owner.last_payment_date) : 'Never'}
              </Text>
            </View>
          </View>

          {/* Record Payment CTA Button */}
          {owner.outstanding_balance_paise > 0 && (
            <TouchableOpacity
              onPress={() => router.push(`/payments/record?ownerId=${owner.id}`)}
              className="mt-5 flex-row items-center justify-center rounded-2xl bg-emerald-600 py-3.5 shadow-sm active:bg-emerald-700"
            >
              <CreditCard size={18} color="#ffffff" />
              <Text className="ml-2 text-sm font-bold text-white">
                Record Payment (
                {formatPaise(owner.outstanding_balance_paise)}
                )
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Info & Notes */}
        {(owner.phone || owner.notes) && (
          <View className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            {owner.phone && (
              <View className="mb-1 flex-row items-center">
                <Phone size={14} color="#71717a" />
                <Text className="ml-2 text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  {owner.phone}
                </Text>
              </View>
            )}
            {owner.notes && (
              <Text className="mt-1 text-xs text-neutral-500">{owner.notes}</Text>
            )}
          </View>
        )}

        {/* Tab Selector */}
        <View className="mt-6 mb-3 flex-row rounded-2xl bg-neutral-200/80 p-1 dark:bg-neutral-800">
          <TouchableOpacity
            onPress={() => setActiveTab('unpaid')}
            className={`flex-1 items-center rounded-xl py-2 ${
              activeTab === 'unpaid' ? 'bg-white shadow-sm dark:bg-neutral-700' : ''
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                activeTab === 'unpaid'
                  ? 'text-primary-600 dark:text-primary-300'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              Unpaid (
              {unpaidTrips.length + partiallyPaidTrips.length}
              )
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('all')}
            className={`flex-1 items-center rounded-xl py-2 ${
              activeTab === 'all' ? 'bg-white shadow-sm dark:bg-neutral-700' : ''
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                activeTab === 'all'
                  ? 'text-primary-600 dark:text-primary-300'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              All Trips (
              {allTrips.length}
              )
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('payments')}
            className={`flex-1 items-center rounded-xl py-2 ${
              activeTab === 'payments' ? 'bg-white shadow-sm dark:bg-neutral-700' : ''
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                activeTab === 'payments'
                  ? 'text-primary-600 dark:text-primary-300'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              Payments (
              {payments.length}
              )
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab 1: Unpaid Trips */}
        {activeTab === 'unpaid' && (
          <View className="space-y-2">
            {[...unpaidTrips, ...partiallyPaidTrips].length === 0
              ? (
                  <View className="items-center rounded-2xl border border-dashed border-neutral-200 p-6 py-8 dark:border-neutral-800">
                    <CheckCircle2 size={36} color="#10b981" />
                    <Text className="mt-2 font-bold text-neutral-800 dark:text-neutral-200">
                      Zero Outstanding Trips!
                    </Text>
                    <Text className="mt-1 text-xs text-neutral-500">
                      All commute trips with
                      {' '}
                      {owner.name}
                      {' '}
                      have been fully settled.
                    </Text>
                  </View>
                )
              : (
                  [...unpaidTrips, ...partiallyPaidTrips].map(t => (
                    <View
                      key={t.id}
                      className="flex-row items-center justify-between rounded-2xl border border-neutral-200 bg-white p-3.5 dark:border-neutral-800 dark:bg-neutral-900"
                    >
                      <View className="flex-row items-center">
                        <View
                          className={`rounded-xl p-2 ${
                            t.trip_type === 'morning' ? 'bg-amber-50 dark:bg-amber-950/40' : 'bg-indigo-50 dark:bg-indigo-950/40'
                          }`}
                        >
                          {t.trip_type === 'morning'
                            ? (
                                <Sun size={16} color="#d97706" />
                              )
                            : (
                                <Moon size={16} color="#4F46E5" />
                              )}
                        </View>
                        <View className="ml-3">
                          <Text className="text-xs font-bold text-neutral-900 dark:text-white">
                            {formatDateFriendly(t.date)}
                            {' '}
                            (
                            {t.date}
                            )
                          </Text>
                          <Text className="text-[11px] text-neutral-500 capitalize">
                            {t.trip_type}
                            {' '}
                            Trip
                          </Text>
                        </View>
                      </View>

                      <View className="items-end">
                        <Text className="text-sm font-bold text-amber-600 dark:text-amber-400">
                          {formatPaise(t.remaining_paise)}
                        </Text>
                        <CommuteBadge type={t.payment_status} size="sm" />
                      </View>
                    </View>
                  ))
                )}
          </View>
        )}

        {/* Tab 2: All Trips */}
        {activeTab === 'all' && (
          <View className="space-y-2">
            {allTrips.map(t => (
              <View
                key={t.id}
                className="flex-row items-center justify-between rounded-2xl border border-neutral-200 bg-white p-3.5 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <View className="flex-row items-center">
                  <View
                    className={`rounded-xl p-2 ${
                      t.trip_type === 'morning' ? 'bg-amber-50 dark:bg-amber-950/40' : 'bg-indigo-50 dark:bg-indigo-950/40'
                    }`}
                  >
                    {t.trip_type === 'morning'
                      ? (
                          <Sun size={16} color="#d97706" />
                        )
                      : (
                          <Moon size={16} color="#4F46E5" />
                        )}
                  </View>
                  <View className="ml-3">
                    <Text className="text-xs font-bold text-neutral-900 dark:text-white">
                      {formatDateFriendly(t.date)}
                      {' '}
                      (
                      {t.date}
                      )
                    </Text>
                    <Text className="text-[11px] text-neutral-500 capitalize">
                      {t.trip_type}
                      {' '}
                      Trip •
                      {formatPaise(t.fare_paise)}
                    </Text>
                  </View>
                </View>

                <CommuteBadge type={t.payment_status} size="sm" />
              </View>
            ))}
          </View>
        )}

        {/* Tab 3: Payments */}
        {activeTab === 'payments' && (
          <View className="space-y-2">
            {payments.length === 0
              ? (
                  <View className="items-center py-8">
                    <Text className="text-sm text-neutral-500">No payment records yet.</Text>
                  </View>
                )
              : (
                  payments.map(p => (
                    <View
                      key={p.id}
                      className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center">
                          <CreditCard size={16} color="#16a34a" />
                          <Text className="ml-2 text-sm font-bold text-neutral-900 dark:text-white">
                            {formatPaise(p.amount_paise)}
                          </Text>
                        </View>
                        <Text className="text-xs text-neutral-500">
                          {formatDateFriendly(p.payment_date)}
                        </Text>
                      </View>

                      <View className="mt-2 flex-row items-center justify-between border-t border-neutral-100 pt-2 dark:border-neutral-800">
                        <Text className="text-[11px] text-neutral-500 uppercase">
                          Method:
                          {' '}
                          {p.payment_method.replace('_', ' ')}
                        </Text>
                        <Text className="text-[11px] text-purple-600">
                          {p.allocations_count}
                          {' '}
                          trip(s) settled
                        </Text>
                      </View>
                    </View>
                  ))
                )}
          </View>
        )}

        <View className="h-24" />
      </ScrollView>
    </View>
  );
}
