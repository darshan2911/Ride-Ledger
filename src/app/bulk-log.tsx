import type { CommuteType } from '@/db';
import { useRouter } from 'expo-router';
import {
  Bike,
  Calendar as CalendarIcon,
  Car,
  Check,
  CheckSquare,
  Home,
  Square,
  X,
} from 'lucide-react-native';
import * as React from 'react';
import { useState } from 'react';
import {
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { showMessage } from 'react-native-flash-message';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FocusAwareStatusBar } from '@/components/ui/focus-aware-status-bar';
import { Text } from '@/components/ui/text';
import { CommutesRepo } from '@/db';
import { formatDateFriendly, formatPaise, rupeesToPaise } from '@/lib/currency';
import { useOwners, useSettings, useUnloggedDates } from '@/lib/hooks/use-rideledger';
import { useRideLedgerStore } from '@/lib/rideledger-store';

export default function BulkLogScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const unloggedDates = useUnloggedDates();
  const { owners } = useOwners(false);
  const { settings } = useSettings();
  const triggerRefresh = useRideLedgerStore(s => s.triggerRefresh);

  const [selectedDates, setSelectedDates] = useState<string[]>(unloggedDates);
  const [commuteType, setCommuteType] = useState<CommuteType>('carpool');

  const defaultOwnerId = settings.default_owner_id || (owners.length > 0 ? owners[0].id : null);
  const [ownerId, setOwnerId] = useState<string | null>(defaultOwnerId);
  const [farePerDayStr, setFarePerDayStr] = useState('120');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleDate = (date: string) => {
    setSelectedDates(prev =>
      prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date],
    );
  };

  const selectAll = () => setSelectedDates(unloggedDates);
  const clearAll = () => setSelectedDates([]);

  const handleBulkSave = () => {
    if (selectedDates.length === 0) {
      showMessage({
        message: 'No dates selected',
        description: 'Please select at least one date to log.',
        type: 'warning',
      });
      return;
    }

    if (commuteType === 'carpool' && owners.length === 0) {
      showMessage({
        message: 'No Carpool Driver Available',
        description: 'Please add a carpool driver first or select Own Bike or Leave.',
        type: 'warning',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const farePaise = rupeesToPaise(farePerDayStr);
      const halfFarePaise = Math.round(farePaise / 2);

      const trips
        = commuteType === 'carpool'
          ? [
              { trip_type: 'morning' as const, owner_id: ownerId, fare_paise: halfFarePaise },
              { trip_type: 'evening' as const, owner_id: ownerId, fare_paise: halfFarePaise },
            ]
          : undefined;

      CommutesRepo.bulkLogPastDates(selectedDates, commuteType, trips, notes || undefined);
      triggerRefresh();

      showMessage({
        message: `Logged ${selectedDates.length} day(s) successfully!`,
        type: 'success',
      });
      router.back();
    }
    catch (error: any) {
      showMessage({
        message: 'Failed to bulk log commutes',
        description: error.message || 'Something went wrong',
        type: 'danger',
      });
    }
    finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View
      style={{ paddingTop: insets.top }}
      className="flex-1 bg-neutral-50 dark:bg-neutral-950"
    >
      <FocusAwareStatusBar />

      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-neutral-200 bg-white px-5 py-4 dark:border-neutral-800 dark:bg-neutral-900">
        <View>
          <Text className="text-xl font-bold text-neutral-900 dark:text-white">
            Bulk Past Logging
          </Text>
          <Text className="text-xs text-neutral-500">
            Log missed commutes for multiple days at once
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.back()}
          className="rounded-full bg-neutral-100 p-2 dark:bg-neutral-800"
        >
          <X size={20} color="#71717a" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-5 py-4" showsVerticalScrollIndicator={false}>
        {/* Unlogged Dates Selection */}
        <View className="mb-6 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="font-bold text-neutral-800 dark:text-neutral-200">
              Select Missed Dates (
              {selectedDates.length}
              /
              {unloggedDates.length}
              )
            </Text>
            <View className="flex-row gap-2">
              <TouchableOpacity onPress={selectAll} className="px-2 py-1">
                <Text className="text-xs font-semibold text-primary-600">Select All</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={clearAll} className="px-2 py-1">
                <Text className="text-xs font-semibold text-neutral-500">Clear</Text>
              </TouchableOpacity>
            </View>
          </View>

          {unloggedDates.length === 0
            ? (
                <View className="items-center py-4">
                  <Text className="text-sm text-neutral-500">
                    🎉 All recent working days are already logged!
                  </Text>
                </View>
              )
            : (
                <View className="gap-2">
                  {unloggedDates.map((d) => {
                    const isSelected = selectedDates.includes(d);
                    return (
                      <TouchableOpacity
                        key={d}
                        onPress={() => toggleDate(d)}
                        className={`flex-row items-center justify-between rounded-xl border p-3 ${
                          isSelected
                            ? 'dark:bg-primary-950/30 border-primary-600 bg-primary-50 dark:border-primary-500'
                            : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
                        }`}
                      >
                        <View className="flex-row items-center">
                          <CalendarIcon size={16} color={isSelected ? '#4F46E5' : '#71717a'} />
                          <Text
                            className={`ml-2 text-sm font-semibold ${
                              isSelected
                                ? 'text-primary-900 dark:text-primary-100'
                                : 'text-neutral-800 dark:text-neutral-200'
                            }`}
                          >
                            {formatDateFriendly(d)}
                            {' '}
                            (
                            {d}
                            )
                          </Text>
                        </View>
                        {isSelected
                          ? (
                              <CheckSquare size={18} color="#4F46E5" />
                            )
                          : (
                              <Square size={18} color="#a1a1aa" />
                            )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
        </View>

        {/* Commute Type */}
        <Text className="mb-2 text-xs font-semibold tracking-wider text-neutral-500 uppercase">
          Commute Details for Selected Dates
        </Text>

        <View className="mb-5 flex-row gap-2.5">
          <TouchableOpacity
            onPress={() => setCommuteType('carpool')}
            className={`flex-1 items-center rounded-2xl border p-3 ${
              commuteType === 'carpool'
                ? 'dark:bg-primary-950/30 border-primary-600 bg-primary-50'
                : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
            }`}
          >
            <Car size={20} color={commuteType === 'carpool' ? '#4F46E5' : '#71717a'} />
            <Text
              className={`mt-1.5 text-xs font-bold ${
                commuteType === 'carpool' ? 'text-primary-700' : 'text-neutral-600'
              }`}
            >
              Carpool
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setCommuteType('own_vehicle')}
            className={`flex-1 items-center rounded-2xl border p-3 ${
              commuteType === 'own_vehicle'
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30'
                : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
            }`}
          >
            <Bike size={20} color={commuteType === 'own_vehicle' ? '#2563eb' : '#71717a'} />
            <Text
              className={`mt-1.5 text-xs font-bold ${
                commuteType === 'own_vehicle' ? 'text-blue-700' : 'text-neutral-600'
              }`}
            >
              Own Bike
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setCommuteType('leave')}
            className={`flex-1 items-center rounded-2xl border p-3 ${
              commuteType === 'leave'
                ? 'border-neutral-600 bg-neutral-100 dark:bg-neutral-800'
                : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
            }`}
          >
            <Home size={20} color={commuteType === 'leave' ? '#18181b' : '#71717a'} />
            <Text
              className={`mt-1.5 text-xs font-bold ${
                commuteType === 'leave' ? 'text-neutral-900' : 'text-neutral-600'
              }`}
            >
              Leave
            </Text>
          </TouchableOpacity>
        </View>

        {commuteType === 'carpool' && (
          <View className="mb-5 gap-3 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <Text className="text-xs font-medium text-neutral-500">Carpool Owner</Text>
            {owners.length === 0 ? (
              <View className="rounded-xl border border-dashed border-amber-300 bg-amber-50/70 p-3 dark:border-amber-800/60 dark:bg-amber-950/20">
                <Text className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  No carpool drivers added yet
                </Text>
                <Text className="mt-0.5 text-[11px] text-amber-800/80 dark:text-amber-300/80">
                  Add a carpool driver to track balances and expenses.
                </Text>
                <TouchableOpacity
                  onPress={() => router.push('/owners/edit')}
                  className="mt-2.5 self-start rounded-lg bg-amber-600 px-3 py-1.5 active:bg-amber-700"
                >
                  <Text className="text-xs font-bold text-white">+ Add Driver</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="flex-row flex-wrap gap-2">
                {owners.map(owner => (
                  <TouchableOpacity
                    key={owner.id}
                    onPress={() => setOwnerId(owner.id)}
                    className={`rounded-xl border px-3 py-2 ${
                      ownerId === owner.id
                        ? 'dark:bg-primary-950/30 border-primary-600 bg-primary-50'
                        : 'border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        ownerId === owner.id ? 'text-primary-700' : 'text-neutral-700'
                      }`}
                    >
                      {owner.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View className="flex-row items-center justify-between pt-2">
              <Text className="text-xs font-medium text-neutral-500">Daily Round Fare (₹)</Text>
              <TextInput
                value={farePerDayStr}
                onChangeText={setFarePerDayStr}
                keyboardType="numeric"
                className="w-24 rounded-xl border border-neutral-200 bg-neutral-50 p-2 text-right font-bold dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </View>
          </View>
        )}

        <View className="mb-4">
          <Text className="mb-1 text-xs font-medium text-neutral-500">Notes (Optional)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. Regular weekly carpool"
            placeholderTextColor="#a1a1aa"
            className="rounded-2xl border border-neutral-200 bg-white p-3.5 text-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
          />
        </View>
      </ScrollView>

      {/* Action Button */}
      <View
        style={{ paddingBottom: Math.max(20, insets.bottom + 12) }}
        className="border-t border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
      >
        <TouchableOpacity
          onPress={handleBulkSave}
          disabled={isSubmitting || selectedDates.length === 0}
          className="flex-row items-center justify-center rounded-2xl bg-primary-600 py-4 shadow-md active:bg-primary-700 disabled:opacity-50"
        >
          <Check size={20} color="#ffffff" />
          <Text className="ml-2 text-base font-bold text-white">
            {isSubmitting
              ? 'Saving...'
              : `Save for ${selectedDates.length} Selected Day(s)`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
