import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, Moon, Phone, Sun, User, X } from 'lucide-react-native';
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
import { OwnersRepo } from '@/db';
import { paiseToRupees, rupeesToPaise } from '@/lib/currency';
import { useOwner, useSettings } from '@/lib/hooks/use-rideledger';
import { useRideLedgerStore } from '@/lib/rideledger-store';

export default function EditOwnerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const isEditing = Boolean(params.id);

  const { owner } = useOwner(params.id || '');
  const { settings, update: updateSettings } = useSettings();
  const triggerRefresh = useRideLedgerStore(s => s.triggerRefresh);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [morningFareStr, setMorningFareStr] = useState('60');
  const [eveningFareStr, setEveningFareStr] = useState('60');
  const [notes, setNotes] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (owner && isEditing) {
      setName(owner.name);
      setPhone(owner.phone || '');
      setMorningFareStr(String(paiseToRupees(owner.default_morning_fare_paise)));
      setEveningFareStr(String(paiseToRupees(owner.default_evening_fare_paise)));
      setNotes(owner.notes || '');
      setIsDefault(settings.default_owner_id === owner.id);
    }
  }, [owner, isEditing, settings.default_owner_id]);

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      showMessage({
        message: 'Name Required',
        description: 'Please enter the carpool owner’s name.',
        type: 'warning',
      });
      return;
    }

    // Edge Case EC-C2: Prevent duplicate owner names
    const allOwners = OwnersRepo.getAllOwners(true);
    const hasDuplicate = allOwners.some(
      o => o.name.toLowerCase() === trimmedName.toLowerCase() && o.id !== params.id,
    );
    if (hasDuplicate) {
      showMessage({
        message: 'Duplicate Driver Name',
        description: `A driver named "${trimmedName}" already exists. Please choose a distinct name.`,
        type: 'warning',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const morningFarePaise = rupeesToPaise(morningFareStr);
      const eveningFarePaise = rupeesToPaise(eveningFareStr);

      if (morningFarePaise < 0 || eveningFarePaise < 0) {
        showMessage({
          message: 'Invalid Fare',
          description: 'Fares cannot be negative.',
          type: 'warning',
        });
        setIsSubmitting(false);
        return;
      }

      let savedOwnerId = params.id;

      if (isEditing && params.id) {
        OwnersRepo.updateOwner(params.id, {
          name: trimmedName,
          phone: phone.trim() || null,
          default_morning_fare_paise: morningFarePaise,
          default_evening_fare_paise: eveningFarePaise,
          notes: notes.trim() || null,
        });
      }
      else {
        const created = OwnersRepo.createOwner({
          name: trimmedName,
          phone: phone.trim() || null,
          default_morning_fare_paise: morningFarePaise,
          default_evening_fare_paise: eveningFarePaise,
          notes: notes.trim() || null,
        });
        savedOwnerId = created.id;
      }

      if (isDefault && savedOwnerId) {
        updateSettings({ default_owner_id: savedOwnerId });
      }
      else if (!isDefault && settings.default_owner_id === savedOwnerId) {
        updateSettings({ default_owner_id: null });
      }

      triggerRefresh();
      showMessage({
        message: isEditing ? 'Owner Updated' : 'Owner Added',
        description: `${name} has been saved successfully.`,
        type: 'success',
      });
      router.back();
    }
    catch (error: any) {
      showMessage({
        message: 'Failed to save owner',
        description: error.message || 'Error occurred',
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
        <Text className="text-xl font-bold text-neutral-900 dark:text-white">
          {isEditing ? 'Edit Carpool Owner' : 'Add Carpool Owner'}
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="rounded-full bg-neutral-100 p-2 dark:bg-neutral-800"
        >
          <X size={20} color="#71717a" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-5 py-4" showsVerticalScrollIndicator={false}>
        {/* Name Input */}
        <View className="mb-4">
          <Text className="mb-1.5 text-xs font-semibold tracking-wider text-neutral-500 uppercase">
            Owner / Driver Name *
          </Text>
          <View className="flex-row items-center rounded-2xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
            <User size={18} color="#71717a" />
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Raj or Amit"
              placeholderTextColor="#a1a1aa"
              className="ml-3 flex-1 text-base font-medium text-neutral-900 dark:text-white"
            />
          </View>
        </View>

        {/* Phone Input */}
        <View className="mb-4">
          <Text className="mb-1.5 text-xs font-semibold tracking-wider text-neutral-500 uppercase">
            Phone Number (Optional)
          </Text>
          <View className="flex-row items-center rounded-2xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
            <Phone size={18} color="#71717a" />
            <TextInput
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="+91 98765 43210"
              placeholderTextColor="#a1a1aa"
              className="ml-3 flex-1 text-base text-neutral-900 dark:text-white"
            />
          </View>
        </View>

        {/* Default Fares */}
        <View className="mb-4 gap-4 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <Text className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
            Standard Default Fares
          </Text>

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Sun size={18} color="#d97706" />
              <Text className="ml-2.5 text-sm font-medium text-neutral-800 dark:text-neutral-200">
                Morning Fare (₹)
              </Text>
            </View>
            <TextInput
              value={morningFareStr}
              onChangeText={setMorningFareStr}
              keyboardType="numeric"
              className="w-24 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-right font-bold text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
          </View>

          <View className="flex-row items-center justify-between border-t border-neutral-100 pt-3 dark:border-neutral-800">
            <View className="flex-row items-center">
              <Moon size={18} color="#6366F1" />
              <Text className="ml-2.5 text-sm font-medium text-neutral-800 dark:text-neutral-200">
                Evening Fare (₹)
              </Text>
            </View>
            <TextInput
              value={eveningFareStr}
              onChangeText={setEveningFareStr}
              keyboardType="numeric"
              className="w-24 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-right font-bold text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
          </View>
        </View>

        {/* Set as Default Owner Toggle */}
        <TouchableOpacity
          onPress={() => setIsDefault(prev => !prev)}
          className={`mb-4 flex-row items-center justify-between rounded-2xl border p-4 ${
            isDefault
              ? 'border-primary-600 bg-primary-50 dark:border-primary-500 dark:bg-primary-950/60'
              : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
          }`}
        >
          <View className="mr-3 flex-1">
            <Text
              className={`text-sm font-bold ${
                isDefault
                  ? 'text-primary-950 dark:text-primary-100'
                  : 'text-neutral-900 dark:text-white'
              }`}
            >
              Primary / Default Carpool Driver
            </Text>
            <Text
              className={`mt-0.5 text-xs ${
                isDefault
                  ? 'font-medium text-primary-800 dark:text-primary-200/90'
                  : 'text-neutral-500 dark:text-neutral-400'
              }`}
            >
              Auto-selected when opening quick commute logger
            </Text>
          </View>
          <View
            className={`size-6 shrink-0 items-center justify-center rounded-md border ${
              isDefault
                ? 'border-primary-600 bg-primary-600 dark:border-primary-500 dark:bg-primary-500'
                : 'border-neutral-300 bg-transparent dark:border-neutral-700'
            }`}
          >
            {isDefault && <Check size={14} color="#ffffff" />}
          </View>
        </TouchableOpacity>

        {/* Notes */}
        <View className="mb-6">
          <Text className="mb-1.5 text-xs font-semibold tracking-wider text-neutral-500 uppercase">
            Notes / Route Details
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            placeholder="e.g. Meets at Sector 18 metro, Hyundai Creta"
            placeholderTextColor="#a1a1aa"
            className="rounded-2xl border border-neutral-200 bg-white p-3.5 text-sm text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
          />
        </View>
      </ScrollView>

      {/* Save Button */}
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
            {isSubmitting ? 'Saving...' : 'Save Owner'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
