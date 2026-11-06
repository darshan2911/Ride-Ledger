import type { PaymentMethod } from '@/db';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Calendar as CalendarIcon,
  CheckSquare,
  CreditCard,
  Square,
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
import { selectableCardStyles } from '@/components/ui/selectable-card';
import { Text } from '@/components/ui/text';
import { PaymentsRepo } from '@/db';
import { formatDateFriendly, formatPaise, getTodayDateString, paiseToRupees, rupeesToPaise } from '@/lib/currency';
import { useOwner, useOwners, useOwnerTrips } from '@/lib/hooks/use-rideledger';
import { useRideLedgerStore } from '@/lib/rideledger-store';

export default function RecordPaymentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ ownerId?: string }>();
  const { owners } = useOwners(false);
  const triggerRefresh = useRideLedgerStore(s => s.triggerRefresh);

  const [selectedOwnerId, setSelectedOwnerId] = useState<string>(
    params.ownerId || (owners.length > 0 ? owners[0].id : ''),
  );

  useEffect(() => {
    if (!selectedOwnerId && owners.length > 0) {
      const defaultOwner = owners.find(o => o.is_default) || owners[0];
      setSelectedOwnerId(params.ownerId || defaultOwner.id);
    }
  }, [owners, params.ownerId, selectedOwnerId]);

  const { owner } = useOwner(selectedOwnerId);
  const unpaidTrips = useOwnerTrips(selectedOwnerId, 'unpaid');
  const partiallyPaidTrips = useOwnerTrips(selectedOwnerId, 'partially_paid');
  const candidateTrips = [...unpaidTrips, ...partiallyPaidTrips];

  const [selectedTripIds, setSelectedTripIds] = useState<string[]>([]);
  const [paymentDate, setPaymentDate] = useState(getTodayDateString());
  const [amountStr, setAmountStr] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-select all trips and compute total pending when owner changes
  useEffect(() => {
    if (owner) {
      const allIds = candidateTrips.map(t => t.id);
      setSelectedTripIds(allIds);
      const totalPendingPaise = candidateTrips.reduce((sum, t) => sum + t.remaining_paise, 0);
      setAmountStr(String(paiseToRupees(totalPendingPaise)));
    }
  }, [selectedOwnerId, candidateTrips.length]);

  const toggleTripSelection = (tripId: string) => {
    setSelectedTripIds((prev) => {
      const updated = prev.includes(tripId)
        ? prev.filter(id => id !== tripId)
        : [...prev, tripId];

      const selectedTripsSum = candidateTrips
        .filter(t => updated.includes(t.id))
        .reduce((sum, t) => sum + t.remaining_paise, 0);
      setAmountStr(String(paiseToRupees(selectedTripsSum)));
      return updated;
    });
  };

  const handleSelectAll = () => {
    const allIds = candidateTrips.map(t => t.id);
    setSelectedTripIds(allIds);
    const totalPendingPaise = candidateTrips.reduce((sum, t) => sum + t.remaining_paise, 0);
    setAmountStr(String(paiseToRupees(totalPendingPaise)));
  };

  const handleClearSelection = () => {
    setSelectedTripIds([]);
    setAmountStr('0');
  };

  const handleConfirmPayment = () => {
    // Edge Case EC-D4: Future payment date validation
    if (paymentDate > getTodayDateString()) {
      showMessage({
        message: 'Invalid Payment Date',
        description: 'Payment date cannot be in the future.',
        type: 'warning',
      });
      return;
    }

    const amountPaise = rupeesToPaise(amountStr);
    if (amountPaise <= 0) {
      showMessage({
        message: 'Invalid Amount',
        description: 'Please enter a valid payment amount greater than ₹0.',
        type: 'warning',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      PaymentsRepo.recordPayment({
        owner_id: selectedOwnerId,
        amount_paise: amountPaise,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        trip_ids: selectedTripIds.length > 0 ? selectedTripIds : undefined,
        notes: notes.trim() || undefined,
      });

      triggerRefresh();
      showMessage({
        message: 'Payment Recorded! 💰',
        description: `Settled ${formatPaise(amountPaise)} for ${owner?.name}`,
        type: 'success',
      });
      router.back();
    }
    catch (error: any) {
      showMessage({
        message: 'Payment Failed',
        description: error.message || 'Error recording payment',
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

      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-neutral-200 bg-white px-5 py-4 dark:border-neutral-800 dark:bg-neutral-900">
        <View>
          <Text className="text-xl font-bold text-neutral-900 dark:text-white">
            Record Payment
          </Text>
          <Text className="text-xs text-neutral-500">
            Settle outstanding carpool balance
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.back()}
          className="rounded-full bg-neutral-100 p-2 dark:bg-neutral-800"
        >
          <X size={20} color="#71717a" />
        </TouchableOpacity>
      </View>

      {owners.length === 0 ? (
        <View className="flex-1 items-center justify-center p-8 text-center">
          <View className="size-16 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-950/60">
            <User size={30} color="#FF6C00" />
          </View>
          <Text className="mt-4 text-lg font-bold text-neutral-900 dark:text-white">
            No Carpool Owners Found
          </Text>
          <Text className="mt-1.5 max-w-[280px] text-center text-xs text-neutral-500">
            You haven’t added any carpool drivers yet. Add your driver first to record carpool trips and settlements.
          </Text>
          <TouchableOpacity
            onPress={() => router.replace('/owners/edit')}
            className="mt-6 flex-row items-center rounded-2xl bg-primary-600 px-6 py-3.5 shadow-sm active:bg-primary-700"
          >
            <Text className="text-sm font-bold text-white">+ Add Carpool Owner</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView className="flex-1 px-5 py-4" showsVerticalScrollIndicator={false}>
            {/* Carpool Owner Selector */}
            <Text className="mb-2 text-xs font-semibold tracking-wider text-neutral-500 uppercase">
              Carpool Owner
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5 flex-row">
              {owners.map((o) => {
                const isSelected = selectedOwnerId === o.id;
                return (
                  <TouchableOpacity
                    key={o.id}
                    onPress={() => setSelectedOwnerId(o.id)}
                    className={`mr-2 flex-row items-center rounded-2xl border px-4 py-3 ${selectableCardStyles.container(
                      isSelected,
                    )}`}
                  >
                    <User size={16} color={isSelected ? '#FF6C00' : '#71717a'} />
                    <View className="ml-2.5">
                      <Text
                        className={`text-sm font-bold ${selectableCardStyles.title(isSelected)}`}
                      >
                        {o.name}
                      </Text>
                      <Text
                        className={`text-xs ${selectableCardStyles.subtitle(isSelected)}`}
                      >
                        Pending:
                        {' '}
                        {formatPaise(o.outstanding_balance_paise)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Amount Input Card */}
            <View className="mb-5 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <Text className="text-xs font-medium text-neutral-500">Amount Paid (₹)</Text>
              <View className="mt-2 flex-row items-center border-b border-neutral-200 pb-2 dark:border-neutral-700">
                <Text className="mr-2 text-3xl font-extrabold text-neutral-900 dark:text-white">
                  ₹
                </Text>
                <TextInput
                  value={amountStr}
                  onChangeText={setAmountStr}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#a1a1aa"
                  className="flex-1 text-3xl font-extrabold text-neutral-900 dark:text-white"
                />
              </View>
              <View className="mt-3 flex-row items-center justify-between">
                <Text className="text-xs text-neutral-500">
                  Total Outstanding:
                  {' '}
                  {formatPaise(owner?.outstanding_balance_paise || 0)}
                </Text>
                <TouchableOpacity
                  onPress={() => setAmountStr(String(paiseToRupees(owner?.outstanding_balance_paise || 0)))}
                >
                  <Text className="text-xs font-bold text-primary-600">Pay Full Amount</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Payment Method & Date */}
            <View className="mb-5 gap-4 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <View>
                <Text className="mb-2 text-xs font-medium text-neutral-500">Payment Method</Text>
                <View className="flex-row gap-2">
                  {(['upi', 'cash', 'bank_transfer'] as PaymentMethod[]).map(method => (
                    <TouchableOpacity
                      key={method}
                      onPress={() => setPaymentMethod(method)}
                      className={`flex-1 items-center rounded-xl border py-2.5 ${selectableCardStyles.container(
                        paymentMethod === method,
                      )}`}
                    >
                      <Text
                        className={`text-xs font-bold uppercase ${selectableCardStyles.title(
                          paymentMethod === method,
                        )}`}
                      >
                        {method.replace('_', ' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View className="flex-row items-center justify-between border-t border-neutral-100 pt-2 dark:border-neutral-800">
                <View className="flex-row items-center">
                  <CalendarIcon size={16} color="#FF6C00" />
                  <Text className="ml-2 text-xs font-medium text-neutral-600 dark:text-neutral-400">
                    Payment Date
                  </Text>
                </View>
                <TextInput
                  value={paymentDate}
                  onChangeText={setPaymentDate}
                  className="rounded-lg border border-neutral-200 px-3 py-1 text-xs font-semibold text-neutral-900 dark:border-neutral-700 dark:text-white"
                />
              </View>
            </View>

            {/* Outstanding Trips Allocation List */}
            <View className="mb-5 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-sm font-bold text-neutral-900 dark:text-white">
                  Allocate to Trips (
                  {selectedTripIds.length}
                  /
                  {candidateTrips.length}
                  )
                </Text>
                <View className="flex-row items-center gap-2">
                  <TouchableOpacity onPress={handleSelectAll}>
                    <Text className="text-xs font-semibold text-primary-600">Select All</Text>
                  </TouchableOpacity>
                  <Text className="text-xs text-neutral-400">|</Text>
                  <TouchableOpacity onPress={handleClearSelection}>
                    <Text className="text-xs font-semibold text-neutral-500">Clear</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {candidateTrips.length === 0
                ? (
                    <View className="items-center py-4">
                      <Text className="text-sm text-neutral-500">
                        No unpaid trips found for
                        {' '}
                        {owner?.name}
                        .
                      </Text>
                    </View>
                  )
                : (
                    <View className="gap-2">
                      {candidateTrips.map((t) => {
                        const isSelected = selectedTripIds.includes(t.id);
                        return (
                          <TouchableOpacity
                            key={t.id}
                            onPress={() => toggleTripSelection(t.id)}
                            className={`flex-row items-center justify-between rounded-xl border p-3 ${selectableCardStyles.container(
                              isSelected,
                            )}`}
                          >
                            <View className="flex-row items-center">
                              {isSelected
                                ? (
                                    <CheckSquare size={18} color="#FF6C00" />
                                  )
                                : (
                                    <Square size={18} color="#a1a1aa" />
                                  )}
                              <View className="ml-3">
                                <Text
                                  className={`text-xs font-bold ${selectableCardStyles.title(
                                    isSelected,
                                  )}`}
                                >
                                  {formatDateFriendly(t.date)}
                                  {' '}
                                  (
                                  {t.date}
                                  )
                                </Text>
                                <Text
                                  className={`text-[11px] capitalize ${selectableCardStyles.subtitle(
                                    isSelected,
                                  )}`}
                                >
                                  {t.trip_type}
                                  {' '}
                                  Trip
                                </Text>
                              </View>
                            </View>

                            <View className="items-end">
                              <Text
                                className={`text-sm font-bold ${selectableCardStyles.amount(
                                  isSelected,
                                )} text-neutral-900 dark:text-white`}
                              >
                                {formatPaise(t.remaining_paise)}
                              </Text>
                              {t.allocated_paise > 0 && (
                                <Text
                                  className={`text-[10px] font-medium ${
                                    isSelected
                                      ? 'text-primary-800 dark:text-primary-200'
                                      : 'text-purple-600 dark:text-purple-400'
                                  }`}
                                >
                                  Paid:
                                  {' '}
                                  {formatPaise(t.allocated_paise)}
                                </Text>
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
            </View>

            {/* Notes */}
            <View className="mb-6">
              <Text className="mb-1 text-xs font-medium text-neutral-500">Payment Notes (Optional)</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="e.g. Paid via Google Pay / UPI Ref ID"
                placeholderTextColor="#a1a1aa"
                className="rounded-2xl border border-neutral-200 bg-white p-3.5 text-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
              />
            </View>

            <View className="h-24" />
          </ScrollView>

          {/* Submit Button */}
          <View
            style={{ paddingBottom: Math.max(20, insets.bottom + 12) }}
            className="border-t border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <TouchableOpacity
              onPress={handleConfirmPayment}
              disabled={isSubmitting}
              className="flex-row items-center justify-center rounded-2xl bg-emerald-600 py-4 shadow-md active:bg-emerald-700"
            >
              <CreditCard size={20} color="#ffffff" />
              <Text className="ml-2 text-base font-bold text-white">
                {isSubmitting ? 'Recording...' : `Confirm Payment of ${formatPaise(rupeesToPaise(amountStr))}`}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}
