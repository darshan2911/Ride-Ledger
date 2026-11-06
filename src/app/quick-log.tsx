import type { CommuteType, TripType } from '@/db';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Bike,
  Calendar as CalendarIcon,
  Car,
  Check,
  ChevronDown,
  Home,
  Moon,
  Sun,
  User,
  X,
} from 'lucide-react-native';
import * as React from 'react';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
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
import { formatPaise, getTodayDateString, rupeesToPaise } from '@/lib/currency';
import { useOwners, useSettings } from '@/lib/hooks/use-rideledger';
import { useRideLedgerStore } from '@/lib/rideledger-store';

export default function QuickLogScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ date?: string }>();
  const initialDate = params.date || getTodayDateString();

  const { owners } = useOwners(false);
  const { settings } = useSettings();
  const triggerRefresh = useRideLedgerStore(s => s.triggerRefresh);

  const [date, setDate] = useState(initialDate);
  const [commuteType, setCommuteType] = useState<CommuteType>('carpool');
  const [tripSelection, setTripSelection] = useState<'both' | 'morning' | 'evening' | 'neither'>('both');

  // Default owner from settings or first available
  const defaultOwnerId = settings.default_owner_id || (owners.length > 0 ? owners[0].id : null);

  const [morningOwnerId, setMorningOwnerId] = useState<string | null>(defaultOwnerId);
  const [morningFareStr, setMorningFareStr] = useState('60');

  const [eveningOwnerId, setEveningOwnerId] = useState<string | null>(defaultOwnerId);
  const [eveningFareStr, setEveningFareStr] = useState('60');

  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync default fares when owner changes
  useEffect(() => {
    if (morningOwnerId) {
      const owner = owners.find(o => o.id === morningOwnerId);
      if (owner) {
        setMorningFareStr(String(owner.default_morning_fare_paise / 100));
      }
    }
  }, [morningOwnerId, owners]);

  useEffect(() => {
    if (eveningOwnerId) {
      const owner = owners.find(o => o.id === eveningOwnerId);
      if (owner) {
        setEveningFareStr(String(owner.default_evening_fare_paise / 100));
      }
    }
  }, [eveningOwnerId, owners]);

  // Load existing log for this date if present
  useEffect(() => {
    const existing = CommutesRepo.getCommuteByDate(date);
    if (existing) {
      setCommuteType(existing.commute_type);
      setNotes(existing.notes || '');

      const morning = existing.trips.find(t => t.trip_type === 'morning');
      const evening = existing.trips.find(t => t.trip_type === 'evening');

      if (morning && evening) {
        setTripSelection('both');
        setMorningOwnerId(morning.owner_id || null);
        setMorningFareStr(String(morning.fare_paise / 100));
        setEveningOwnerId(evening.owner_id || null);
        setEveningFareStr(String(evening.fare_paise / 100));
      }
      else if (morning) {
        setTripSelection('morning');
        setMorningOwnerId(morning.owner_id || null);
        setMorningFareStr(String(morning.fare_paise / 100));
      }
      else if (evening) {
        setTripSelection('evening');
        setEveningOwnerId(evening.owner_id || null);
        setEveningFareStr(String(evening.fare_paise / 100));
      }
      else {
        setTripSelection('neither');
      }
    }
  }, [date]);

  // Calculate live total
  const morningFarePaise = rupeesToPaise(morningFareStr);
  const eveningFarePaise = rupeesToPaise(eveningFareStr);

  let calculatedTotalPaise = 0;
  if (commuteType === 'carpool') {
    if (tripSelection === 'both') {
      calculatedTotalPaise = morningFarePaise + eveningFarePaise;
    }
    else if (tripSelection === 'morning') {
      calculatedTotalPaise = morningFarePaise;
    }
    else if (tripSelection === 'evening') {
      calculatedTotalPaise = eveningFarePaise;
    }
  }

  const handleSave = () => {
    setIsSubmitting(true);
    try {
      const tripsToRecord: { trip_type: TripType; owner_id?: string | null; fare_paise: number }[] = [];

      if (commuteType === 'carpool') {
        if (tripSelection === 'both' || tripSelection === 'morning') {
          tripsToRecord.push({
            trip_type: 'morning',
            owner_id: morningOwnerId,
            fare_paise: morningFarePaise,
          });
        }
        if (tripSelection === 'both' || tripSelection === 'evening') {
          tripsToRecord.push({
            trip_type: 'evening',
            owner_id: eveningOwnerId,
            fare_paise: eveningFarePaise,
          });
        }
      }

      CommutesRepo.logCommute({
        date,
        commute_type: commuteType,
        trips: tripsToRecord,
        notes: notes.trim() || undefined,
      });

      triggerRefresh();
      showMessage({
        message: 'Commute Logged Successfully! 🚗',
        description:
          commuteType === 'carpool'
            ? `Recorded ${formatPaise(calculatedTotalPaise)} for ${date}`
            : `Recorded as ${commuteType.replace('_', ' ')} for ${date}`,
        type: 'success',
        icon: 'success',
      });

      router.back();
    }
    catch (error: any) {
      showMessage({
        message: 'Failed to save commute',
        description: error.message || 'Something went wrong',
        type: 'danger',
      });
    }
    finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ paddingTop: insets.top }}
      className="flex-1 bg-neutral-50 dark:bg-neutral-950"
    >
      <FocusAwareStatusBar />

      {/* Top Header */}
      <View className="flex-row items-center justify-between border-b border-neutral-200 bg-white px-5 py-4 dark:border-neutral-800 dark:bg-neutral-900">
        <View>
          <Text className="text-xl font-bold text-neutral-900 dark:text-white">
            Log Commute
          </Text>
          <Text className="text-xs text-neutral-500 dark:text-neutral-400">
            {date === getTodayDateString() ? 'Today, ' : ''}
            {date}
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
        {/* Date Selector Row */}
        <View className="mb-5 flex-row items-center justify-between rounded-2xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
          <View className="flex-row items-center">
            <CalendarIcon size={18} color="#4F46E5" />
            <Text className="ml-2 font-medium text-neutral-700 dark:text-neutral-300">
              Date:
            </Text>
          </View>
          <View className="flex-row items-center space-x-2">
            <TouchableOpacity
              onPress={() => setDate(getTodayDateString())}
              className={`rounded-lg px-2.5 py-1 ${
                date === getTodayDateString()
                  ? 'bg-primary-600'
                  : 'bg-neutral-100 dark:bg-neutral-800'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  date === getTodayDateString()
                    ? 'text-white'
                    : 'text-neutral-600 dark:text-neutral-300'
                }`}
              >
                Today
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                const y = new Date();
                y.setDate(y.getDate() - 1);
                setDate(y.toISOString().slice(0, 10));
              }}
              className={`rounded-lg px-2.5 py-1 ${
                date !== getTodayDateString()
                  ? 'bg-primary-600'
                  : 'bg-neutral-100 dark:bg-neutral-800'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  date !== getTodayDateString()
                    ? 'text-white'
                    : 'text-neutral-600 dark:text-neutral-300'
                }`}
              >
                Yesterday
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Question: How did you commute today? */}
        <Text className="mb-3 text-sm font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
          How did you commute?
        </Text>

        <View className="mb-6 flex-row flex-wrap gap-2">
          {/* 1. Carpool */}
          <TouchableOpacity
            onPress={() => setCommuteType('carpool')}
            className={`min-w-[45%] flex-1 flex-row items-center rounded-2xl border p-3.5 ${
              commuteType === 'carpool'
                ? 'dark:bg-primary-950/30 border-primary-600 bg-primary-50 dark:border-primary-500'
                : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
            }`}
          >
            <View
              className={`rounded-xl p-2 ${
                commuteType === 'carpool' ? 'bg-primary-600' : 'bg-neutral-100 dark:bg-neutral-800'
              }`}
            >
              <Car size={18} color={commuteType === 'carpool' ? '#ffffff' : '#71717a'} />
            </View>
            <View className="ml-3">
              <Text
                className={`font-semibold ${
                  commuteType === 'carpool'
                    ? 'text-primary-950 dark:text-primary-100'
                    : 'text-neutral-800 dark:text-neutral-200'
                }`}
              >
                Carpool
              </Text>
              <Text className="text-xs text-neutral-500">Shared ride</Text>
            </View>
          </TouchableOpacity>

          {/* 2. Own Bike / Vehicle */}
          <TouchableOpacity
            onPress={() => setCommuteType('own_vehicle')}
            className={`min-w-[45%] flex-1 flex-row items-center rounded-2xl border p-3.5 ${
              commuteType === 'own_vehicle'
                ? 'border-blue-600 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/30'
                : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
            }`}
          >
            <View
              className={`rounded-xl p-2 ${
                commuteType === 'own_vehicle' ? 'bg-blue-600' : 'bg-neutral-100 dark:bg-neutral-800'
              }`}
            >
              <Bike size={18} color={commuteType === 'own_vehicle' ? '#ffffff' : '#71717a'} />
            </View>
            <View className="ml-3">
              <Text
                className={`font-semibold ${
                  commuteType === 'own_vehicle'
                    ? 'text-blue-950 dark:text-blue-100'
                    : 'text-neutral-800 dark:text-neutral-200'
                }`}
              >
                Own Bike
              </Text>
              <Text className="text-xs text-neutral-500">₹0 expense</Text>
            </View>
          </TouchableOpacity>

          {/* 3. Leave / Off */}
          <TouchableOpacity
            onPress={() => setCommuteType('leave')}
            className={`min-w-[45%] flex-1 flex-row items-center rounded-2xl border p-3.5 ${
              commuteType === 'leave'
                ? 'border-neutral-600 bg-neutral-100 dark:border-neutral-400 dark:bg-neutral-800'
                : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
            }`}
          >
            <View
              className={`rounded-xl p-2 ${
                commuteType === 'leave' ? 'bg-neutral-600' : 'bg-neutral-100 dark:bg-neutral-800'
              }`}
            >
              <Home size={18} color={commuteType === 'leave' ? '#ffffff' : '#71717a'} />
            </View>
            <View className="ml-3">
              <Text
                className={`font-semibold ${
                  commuteType === 'leave'
                    ? 'text-neutral-900 dark:text-white'
                    : 'text-neutral-800 dark:text-neutral-200'
                }`}
              >
                Leave / Off
              </Text>
              <Text className="text-xs text-neutral-500">No commute</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* If Carpool Selected: Trip Breakdown */}
        {commuteType === 'carpool' && (
          <View className="space-y-4">
            <Text className="text-sm font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
              Which trips did you take?
            </Text>

            {/* Trip Segment Buttons */}
            <View className="flex-row rounded-2xl bg-neutral-200/80 p-1 dark:bg-neutral-800">
              <TouchableOpacity
                onPress={() => setTripSelection('both')}
                className={`flex-1 items-center justify-center rounded-xl py-2.5 ${
                  tripSelection === 'both' ? 'bg-white shadow-sm dark:bg-neutral-700' : ''
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    tripSelection === 'both'
                      ? 'text-primary-600 dark:text-primary-300'
                      : 'text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  Both (₹120)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setTripSelection('morning')}
                className={`flex-1 items-center justify-center rounded-xl py-2.5 ${
                  tripSelection === 'morning' ? 'bg-white shadow-sm dark:bg-neutral-700' : ''
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    tripSelection === 'morning'
                      ? 'text-primary-600 dark:text-primary-300'
                      : 'text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  Morning Only
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setTripSelection('evening')}
                className={`flex-1 items-center justify-center rounded-xl py-2.5 ${
                  tripSelection === 'evening' ? 'bg-white shadow-sm dark:bg-neutral-700' : ''
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    tripSelection === 'evening'
                      ? 'text-primary-600 dark:text-primary-300'
                      : 'text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  Evening Only
                </Text>
              </TouchableOpacity>
            </View>

            {/* Morning Trip Config */}
            {(tripSelection === 'both' || tripSelection === 'morning') && (
              <View className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <View className="rounded-lg bg-amber-50 p-1.5 dark:bg-amber-950/40">
                      <Sun size={16} color="#d97706" />
                    </View>
                    <Text className="ml-2 font-bold text-neutral-800 dark:text-neutral-200">
                      Morning Trip
                    </Text>
                  </View>
                  <Text className="text-xs text-neutral-500">Home → Office</Text>
                </View>

                {/* Owner Selection for Morning */}
                <Text className="mt-3 mb-1.5 text-xs font-medium text-neutral-500">
                  Carpool Owner
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {owners.map((owner) => {
                    const isSelected = morningOwnerId === owner.id;
                    return (
                      <TouchableOpacity
                        key={owner.id}
                        onPress={() => setMorningOwnerId(owner.id)}
                        className={`flex-row items-center rounded-xl border px-3 py-2 ${
                          isSelected
                            ? 'dark:bg-primary-950/30 border-primary-600 bg-primary-50 dark:border-primary-500'
                            : 'border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800/60'
                        }`}
                      >
                        <User size={13} color={isSelected ? '#4F46E5' : '#71717a'} />
                        <Text
                          className={`ml-1.5 text-xs font-semibold ${
                            isSelected
                              ? 'text-primary-700 dark:text-primary-300'
                              : 'text-neutral-700 dark:text-neutral-300'
                          }`}
                        >
                          {owner.name}
                        </Text>
                        {isSelected && <Check size={12} color="#4F46E5" className="ml-1" />}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Fare Input for Morning */}
                <View className="mt-3 flex-row items-center justify-between">
                  <Text className="text-xs font-medium text-neutral-500">Morning Fare (₹)</Text>
                  <View className="w-24 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1.5 dark:border-neutral-700 dark:bg-neutral-800">
                    <TextInput
                      value={morningFareStr}
                      onChangeText={setMorningFareStr}
                      keyboardType="numeric"
                      className="text-right font-bold text-neutral-900 dark:text-white"
                      placeholder="60"
                      placeholderTextColor="#a1a1aa"
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Evening Trip Config */}
            {(tripSelection === 'both' || tripSelection === 'evening') && (
              <View className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <View className="rounded-lg bg-indigo-50 p-1.5 dark:bg-indigo-950/40">
                      <Moon size={16} color="#4F46E5" />
                    </View>
                    <Text className="ml-2 font-bold text-neutral-800 dark:text-neutral-200">
                      Evening Trip
                    </Text>
                  </View>
                  <Text className="text-xs text-neutral-500">Office → Home</Text>
                </View>

                {/* Owner Selection for Evening */}
                <Text className="mt-3 mb-1.5 text-xs font-medium text-neutral-500">
                  Carpool Owner
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {owners.map((owner) => {
                    const isSelected = eveningOwnerId === owner.id;
                    return (
                      <TouchableOpacity
                        key={owner.id}
                        onPress={() => setEveningOwnerId(owner.id)}
                        className={`flex-row items-center rounded-xl border px-3 py-2 ${
                          isSelected
                            ? 'dark:bg-primary-950/30 border-primary-600 bg-primary-50 dark:border-primary-500'
                            : 'border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800/60'
                        }`}
                      >
                        <User size={13} color={isSelected ? '#4F46E5' : '#71717a'} />
                        <Text
                          className={`ml-1.5 text-xs font-semibold ${
                            isSelected
                              ? 'text-primary-700 dark:text-primary-300'
                              : 'text-neutral-700 dark:text-neutral-300'
                          }`}
                        >
                          {owner.name}
                        </Text>
                        {isSelected && <Check size={12} color="#4F46E5" className="ml-1" />}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Fare Input for Evening */}
                <View className="mt-3 flex-row items-center justify-between">
                  <Text className="text-xs font-medium text-neutral-500">Evening Fare (₹)</Text>
                  <View className="w-24 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1.5 dark:border-neutral-700 dark:bg-neutral-800">
                    <TextInput
                      value={eveningFareStr}
                      onChangeText={setEveningFareStr}
                      keyboardType="numeric"
                      className="text-right font-bold text-neutral-900 dark:text-white"
                      placeholder="60"
                      placeholderTextColor="#a1a1aa"
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Total Fare Summary Banner */}
            <View className="flex-row items-center justify-between rounded-2xl bg-primary-600 p-4 shadow-sm">
              <View>
                <Text className="text-xs font-semibold tracking-wider text-primary-100 uppercase">
                  Total Carpool Expense
                </Text>
                <Text className="text-xs text-primary-200">
                  {tripSelection === 'both'
                    ? 'Morning + Evening'
                    : tripSelection === 'morning'
                      ? 'Morning only'
                      : 'Evening only'}
                </Text>
              </View>
              <Text className="text-2xl font-black text-white">
                {formatPaise(calculatedTotalPaise)}
              </Text>
            </View>
          </View>
        )}

        {/* Optional Notes */}
        <View className="mt-4">
          <Text className="mb-1.5 text-xs font-medium text-neutral-500">
            Notes (Optional)
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. Late shift, split toll, rainy day"
            placeholderTextColor="#a1a1aa"
            className="rounded-2xl border border-neutral-200 bg-white p-3.5 text-sm text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
          />
        </View>

        <View className="h-28" />
      </ScrollView>

      {/* Floating Save Button */}
      <View
        style={{ paddingBottom: Math.max(20, insets.bottom + 12) }}
        className="border-t border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
      >
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSubmitting}
          className="flex-row items-center justify-center rounded-2xl bg-primary-600 py-4 shadow-md active:bg-primary-700"
        >
          <Check size={20} color="#ffffff" />
          <Text className="ml-2 text-base font-bold text-white">
            {isSubmitting ? 'Saving...' : 'Save Commute'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
