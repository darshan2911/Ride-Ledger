import { useRouter } from 'expo-router';
import {
  Archive,
  ArrowLeft,
  ChevronRight,
  Phone,
  Plus,
  User,
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
import { Text } from '@/components/ui/text';
import { formatPaise } from '@/lib/currency';
import { useOwners } from '@/lib/hooks/use-rideledger';

export default function OwnersListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showArchived, setShowArchived] = useState(false);
  const { owners } = useOwners(showArchived);

  return (
    <View
      style={{ paddingTop: insets.top }}
      className="flex-1 bg-neutral-50 dark:bg-neutral-950"
    >
      <FocusAwareStatusBar />

      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-neutral-200 bg-white px-5 py-4 dark:border-neutral-800 dark:bg-neutral-900">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-3 rounded-full bg-neutral-100 p-2 dark:bg-neutral-800"
          >
            <ArrowLeft size={18} color="#71717a" />
          </TouchableOpacity>
          <View>
            <Text className="text-xl font-bold text-neutral-900 dark:text-white">
              Carpool Owners
            </Text>
            <Text className="text-xs text-neutral-500">
              Manage drivers, default fares & accounts
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/owners/edit')}
          className="flex-row items-center rounded-xl bg-primary-600 px-3 py-2 shadow-sm"
        >
          <Plus size={16} color="#ffffff" />
          <Text className="ml-1 text-xs font-bold text-white">Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-5 py-4" showsVerticalScrollIndicator={false}>
        {/* Filter Toggle for Archived */}
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
            {owners.length}
            {' '}
            {showArchived ? 'Total' : 'Active'}
            {' '}
            Owners
          </Text>
          <TouchableOpacity
            onPress={() => setShowArchived(prev => !prev)}
            className="flex-row items-center"
          >
            <Archive size={14} color="#71717a" />
            <Text className="ml-1 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
              {showArchived ? 'Hide Archived' : 'Show Archived'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Owners List Cards */}
        <View className="gap-3">
          {owners.map(owner => (
            <TouchableOpacity
              key={owner.id}
              onPress={() => router.push(`/owners/${owner.id}`)}
              className="flex-row items-center justify-between rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
            >
              <View className="flex-1 flex-row items-center">
                <View className="dark:bg-primary-950/60 size-12 items-center justify-center rounded-2xl bg-primary-100">
                  <Text className="text-lg font-bold text-primary-700 dark:text-primary-300">
                    {owner.name.charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View className="ml-3.5 flex-1">
                  <View className="flex-row items-center">
                    <Text className="text-base font-bold text-neutral-900 dark:text-white">
                      {owner.name}
                    </Text>
                    {owner.is_active === 0 && (
                      <View className="ml-2 rounded-md bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-800">
                        <Text className="text-[10px] font-semibold text-neutral-500">
                          Archived
                        </Text>
                      </View>
                    )}
                  </View>

                  <View className="mt-1 flex-row items-center">
                    <Text className="text-xs text-neutral-500">
                      Standard:
                      {' '}
                      {formatPaise(owner.default_morning_fare_paise)}
                      {' '}
                      /
                      {' '}
                      {formatPaise(owner.default_evening_fare_paise)}
                    </Text>
                  </View>
                </View>
              </View>

              <View className="items-end pl-3">
                <Text
                  className={`text-base font-extrabold ${
                    owner.outstanding_balance_paise > 0
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {formatPaise(owner.outstanding_balance_paise)}
                </Text>
                <Text className="text-[11px] text-neutral-400">
                  {owner.unpaid_trips_count}
                  {' '}
                  unpaid
                </Text>
              </View>

              <ChevronRight size={18} color="#a1a1aa" className="ml-2" />
            </TouchableOpacity>
          ))}
        </View>

        <View className="h-20" />
      </ScrollView>
    </View>
  );
}
