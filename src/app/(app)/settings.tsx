import type { AppStateStatus } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Layers,
  RotateCcw,
  Send,
  Sparkles,
  Upload,
  Users,
} from 'lucide-react-native';
import * as React from 'react';
import { useEffect, useState } from 'react';
import {
  Alert,
  AppState,
  ScrollView,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { showMessage } from 'react-native-flash-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FocusAwareStatusBar } from '@/components/ui/focus-aware-status-bar';
import { Text } from '@/components/ui/text';
import { BackupRepo, CommutesRepo } from '@/db';
import { useSettings } from '@/lib/hooks/use-rideledger';
import { useSelectedTheme } from '@/lib/hooks/use-selected-theme';
import {
  cancelAllCommuteReminders,
  requestNotificationPermissions,
  scheduleDailyReminder,
  triggerImmediateTestNotification,
} from '@/lib/notifications';
import { OverlayManager } from '@/lib/overlay';
import { useRideLedgerStore } from '@/lib/rideledger-store';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { settings, update: updateSettings } = useSettings();
  const triggerRefresh = useRideLedgerStore(s => s.triggerRefresh);
  const { selectedTheme, setSelectedTheme } = useSelectedTheme();

  const [reminderEnabled, setReminderEnabled] = useState(settings.reminder_enabled);
  const [reminderHourStr, setReminderHourStr] = useState(String(settings.reminder_hour));
  const [reminderMinuteStr, setReminderMinuteStr] = useState(
    String(settings.reminder_minute).padStart(2, '0'),
  );
  const [canDrawOverlays, setCanDrawOverlays] = useState(false);
  const [isTestingOverlay, setIsTestingOverlay] = useState(false);

  const checkOverlayPermission = async () => {
    const granted = await OverlayManager.canDrawOverlays();
    setCanDrawOverlays(granted);
  };

  useEffect(() => {
    checkOverlayPermission();

    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        checkOverlayPermission();
      }
    });

    return () => sub.remove();
  }, []);

  const handleToggleReminder = async (enabled: boolean) => {
    setReminderEnabled(enabled);
    updateSettings({ reminder_enabled: enabled });

    if (enabled) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        showMessage({
          message: 'Notification Permission Denied',
          description: 'Please enable notifications in Android Settings for daily reminders.',
          type: 'warning',
        });
        setReminderEnabled(false);
        updateSettings({ reminder_enabled: false });
        return;
      }

      const h = Number(reminderHourStr) || 21;
      const m = Number(reminderMinuteStr) || 0;
      await scheduleDailyReminder(h, m);
      await OverlayManager.scheduleDailyAlarm(h, m);
      showMessage({
        message: 'Daily Reminders & Overlay Armed! 🔔',
        description: `Set for ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
        type: 'success',
      });
    }
    else {
      await cancelAllCommuteReminders();
      await OverlayManager.cancelDailyAlarm();
      showMessage({
        message: 'Reminders Disabled',
        type: 'info',
      });
    }
  };

  const handleSaveReminderTime = async () => {
    const h = Number.parseInt(reminderHourStr, 10);
    const m = Number.parseInt(reminderMinuteStr, 10);

    if (Number.isNaN(h) || h < 0 || h > 23 || Number.isNaN(m) || m < 0 || m > 59) {
      showMessage({
        message: 'Invalid Time',
        description: 'Hour must be 0-23 and minute 0-59 (24-hour format).',
        type: 'warning',
      });
      return;
    }

    updateSettings({ reminder_hour: h, reminder_minute: m });

    if (reminderEnabled) {
      await scheduleDailyReminder(h, m);
      await OverlayManager.scheduleDailyAlarm(h, m);
      showMessage({
        message: 'Reminder Time Updated! ⏰',
        description: `Reminder will trigger daily at ${String(h).padStart(2, '0')}:${String(
          m,
        ).padStart(2, '0')}`,
        type: 'success',
      });
    }
  };

  const handleRequestOverlay = async () => {
    await OverlayManager.openOverlaySettings();
  };

  const handleTestOverlay = async () => {
    if (!canDrawOverlays) {
      Alert.alert(
        'Overlay Permission Needed',
        'To have RideLedger pop up over other apps when the alarm fires, please enable "Allow display over other apps" in Android settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: handleRequestOverlay },
        ],
      );
      return;
    }

    setIsTestingOverlay(true);
    try {
      await OverlayManager.triggerTestAlarm(5);
      showMessage({
        message: 'Overlay Pop-up Triggered (5s) 🚀',
        description: 'Switch to your home screen or another app now! RideLedger will pop up directly over it in 5s.',
        type: 'success',
        duration: 5000,
      });
    }
    catch (e: any) {
      Alert.alert('Overlay Error', e.message);
    }
    finally {
      setIsTestingOverlay(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          'Permission Needed',
          'Please allow notifications in Android system settings.',
        );
        return;
      }
      await triggerImmediateTestNotification();
      showMessage({
        message: 'Test Notification Dispatched 🔔',
        description: 'Look at your Android notification shade to test quick logging action.',
        type: 'success',
      });
    }
    catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleExportJson = async () => {
    try {
      const backupData = BackupRepo.exportDatabaseToJson();
      const jsonStr = JSON.stringify(backupData, null, 2);
      const fileUri = `${FileSystem.documentDirectory}RideLedger-Backup-${Date.now()}.json`;

      await FileSystem.writeAsStringAsync(fileUri, jsonStr, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export RideLedger Backup',
        });
      }
      else {
        showMessage({
          message: 'Saved to device storage',
          description: fileUri,
          type: 'info',
        });
      }
    }
    catch (e: any) {
      Alert.alert('Export Failed', e.message);
    }
  };

  const handleExportCsv = async () => {
    try {
      const csvStr = BackupRepo.exportCommuteHistoryToCsv();
      const fileUri = `${FileSystem.documentDirectory}RideLedger-History-${Date.now()}.csv`;

      await FileSystem.writeAsStringAsync(fileUri, csvStr, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Commute History CSV',
        });
      }
    }
    catch (e: any) {
      Alert.alert('Export Failed', e.message);
    }
  };

  const handleImportJson = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0)
        return;

      const fileUri = result.assets[0].uri;
      const fileContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const parsed = JSON.parse(fileContent);

      Alert.alert(
        'Restore Backup?',
        'Restoring data will replace current records with the backup. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore',
            style: 'destructive',
            onPress: () => {
              const res = BackupRepo.importDatabaseFromJson(parsed);
              if (res.success) {
                triggerRefresh();
                showMessage({
                  message: 'Backup Restored Successfully!',
                  type: 'success',
                });
              }
              else {
                Alert.alert('Restore Error', res.message);
              }
            },
          },
        ],
      );
    }
    catch (e: any) {
      Alert.alert('Import Failed', e.message);
    }
  };

  const handleResetCleanSlate = () => {
    Alert.alert(
      'Reset Commute History',
      'This will clear all recorded commute trips and payments, returning all driver balances to ₹0 so you can start logging fresh. Your carpool drivers will be preserved. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset to Clean Slate',
          style: 'destructive',
          onPress: () => {
            CommutesRepo.clearAllCommutesAndPayments();
            triggerRefresh();
            showMessage({
              message: 'Database Reset to Clean Slate! ✨',
              description: 'All test trips and payments have been removed. Ready for your real commute!',
              type: 'success',
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
          Settings
        </Text>
        <Text className="text-xs text-neutral-500">
          Daily reminders, backup, carpool drivers & appearance
        </Text>
      </View>

      <ScrollView className="flex-1 px-5 py-4" showsVerticalScrollIndicator={false}>
        {/* Daily Commute Reminder Config */}
        <View className="mb-5 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="dark:bg-primary-950/40 rounded-xl bg-primary-50 p-2">
                <Bell size={20} color="#4F46E5" />
              </View>
              <View className="ml-3">
                <Text className="text-sm font-bold text-neutral-900 dark:text-white">
                  Daily Commute Reminder
                </Text>
                <Text className="text-xs text-neutral-500">
                  Reliable Android background check-in
                </Text>
              </View>
            </View>

            <Switch
              value={reminderEnabled}
              onValueChange={handleToggleReminder}
              trackColor={{ false: '#e4e4e7', true: '#4F46E5' }}
            />
          </View>

          {reminderEnabled && (
            <View className="mt-4 border-t border-neutral-100 pt-4 dark:border-neutral-800">
              <Text className="mb-2 text-xs font-semibold tracking-wider text-neutral-400 uppercase">
                Preferred Reminder Time (24h format)
              </Text>

              <View className="flex-row items-center gap-2">
                <View className="flex-row items-center rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800">
                  <TextInput
                    value={reminderHourStr}
                    onChangeText={setReminderHourStr}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="21"
                    placeholderTextColor="#a1a1aa"
                    className="w-8 text-center text-base font-bold text-neutral-900 dark:text-white"
                  />
                  <Text className="font-bold text-neutral-400">:</Text>
                  <TextInput
                    value={reminderMinuteStr}
                    onChangeText={setReminderMinuteStr}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="00"
                    placeholderTextColor="#a1a1aa"
                    className="w-8 text-center text-base font-bold text-neutral-900 dark:text-white"
                  />
                </View>

                <TouchableOpacity
                  onPress={handleSaveReminderTime}
                  className="rounded-xl bg-primary-600 px-3.5 py-2.5 active:bg-primary-700"
                >
                  <Text className="text-xs font-bold text-white">Save Time</Text>
                </TouchableOpacity>
              </View>

              {/* Test Notification Button */}
              <TouchableOpacity
                onPress={handleTestNotification}
                className="mt-3 flex-row items-center justify-center rounded-xl bg-neutral-100 py-2.5 dark:bg-neutral-800"
              >
                <Send size={14} color="#4F46E5" />
                <Text className="ml-2 text-xs font-bold text-primary-600 dark:text-primary-400">
                  Trigger Test Notification Now
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Display Over Other Apps (Overlay Pop-up) */}
        <View className="mb-5 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <View className="flex-row items-center justify-between">
            <View className="mr-2 flex-1 flex-row items-center">
              <View className="rounded-xl bg-purple-50 p-2 dark:bg-purple-950/40">
                <Layers size={20} color="#9333ea" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-sm font-bold text-neutral-900 dark:text-white">
                  Display Over Other Apps
                </Text>
                <Text className="text-xs text-neutral-500">
                  Pops up Quick Log directly over any screen
                </Text>
              </View>
            </View>

            {/* Permission Status Pill */}
            <View
              className={`flex-row items-center rounded-full px-2.5 py-1 ${
                canDrawOverlays
                  ? 'bg-emerald-50 dark:bg-emerald-950/40'
                  : 'bg-amber-50 dark:bg-amber-950/40'
              }`}
            >
              {canDrawOverlays ? (
                <>
                  <CheckCircle2 size={12} color="#10b981" />
                  <Text className="ml-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    Active
                  </Text>
                </>
              ) : (
                <>
                  <AlertCircle size={12} color="#f59e0b" />
                  <Text className="ml-1 text-xs font-bold text-amber-700 dark:text-amber-300">
                    Permission Needed
                  </Text>
                </>
              )}
            </View>
          </View>

          <Text className="mt-3 text-xs/relaxed text-neutral-600 dark:text-neutral-400">
            Allows RideLedger to automatically pop up the Quick Log interface directly over whatever app you are using when your commute reminder fires.
          </Text>

          <View className="mt-4 gap-2.5">
            {!canDrawOverlays && (
              <TouchableOpacity
                onPress={handleRequestOverlay}
                className="flex-row items-center justify-center rounded-2xl bg-purple-600 py-3 active:bg-purple-700"
              >
                <ExternalLink size={16} color="#ffffff" />
                <Text className="ml-2 text-xs font-bold text-white">
                  Grant "Display Over Other Apps" Permission
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleTestOverlay}
              disabled={isTestingOverlay}
              className="flex-row items-center justify-center rounded-2xl border border-purple-200 bg-purple-50 py-3 active:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/30"
            >
              <Sparkles size={16} color="#9333ea" />
              <Text className="ml-2 text-xs font-bold text-purple-700 dark:text-purple-300">
                {isTestingOverlay ? 'Triggering...' : 'Test Overlay Pop-up (5s Delay)'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Carpool Drivers Section */}
        <View className="mb-5 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="rounded-xl bg-emerald-50 p-2 dark:bg-emerald-950/40">
                <Users size={20} color="#10b981" />
              </View>
              <View className="ml-3">
                <Text className="text-sm font-bold text-neutral-900 dark:text-white">
                  Carpool Drivers
                </Text>
                <Text className="text-xs text-neutral-500">
                  Default fares, active drivers & balances
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => router.push('/owners')}
              className="rounded-xl bg-neutral-100 px-3 py-1.5 dark:bg-neutral-800"
            >
              <Text className="text-xs font-bold text-primary-600">Manage</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Data Backup & Export Section */}
        <View className="mb-5 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <Text className="mb-3 text-xs font-semibold tracking-wider text-neutral-400 uppercase">
            Offline Backup & Export
          </Text>

          <View className="gap-2.5">
            <TouchableOpacity
              onPress={handleExportJson}
              className="flex-row items-center justify-between rounded-2xl border border-neutral-200 bg-neutral-50 p-3.5 dark:border-neutral-800 dark:bg-neutral-800/50"
            >
              <View className="flex-row items-center">
                <Download size={18} color="#4F46E5" />
                <View className="ml-3">
                  <Text className="text-xs font-bold text-neutral-900 dark:text-white">
                    Export Full Database (JSON)
                  </Text>
                  <Text className="text-[11px] text-neutral-500">
                    Saves all trips, payments & drivers locally
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleExportCsv}
              className="flex-row items-center justify-between rounded-2xl border border-neutral-200 bg-neutral-50 p-3.5 dark:border-neutral-800 dark:bg-neutral-800/50"
            >
              <View className="flex-row items-center">
                <FileSpreadsheet size={18} color="#10b981" />
                <View className="ml-3">
                  <Text className="text-xs font-bold text-neutral-900 dark:text-white">
                    Export Commute History (CSV)
                  </Text>
                  <Text className="text-[11px] text-neutral-500">
                    Open in Excel, Google Sheets, or Numbers
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleImportJson}
              className="flex-row items-center justify-between rounded-2xl border border-neutral-200 bg-neutral-50 p-3.5 dark:border-neutral-800 dark:bg-neutral-800/50"
            >
              <View className="flex-row items-center">
                <Upload size={18} color="#d97706" />
                <View className="ml-3">
                  <Text className="text-xs font-bold text-neutral-900 dark:text-white">
                    Restore from JSON Backup
                  </Text>
                  <Text className="text-[11px] text-neutral-500">
                    Import and validate existing backup file
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Database Clean Slate / Reset Section */}
        <View className="mb-5 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <Text className="mb-3 text-xs font-semibold tracking-wider text-neutral-400 uppercase">
            Reset Commute History
          </Text>

          <TouchableOpacity
            onPress={handleResetCleanSlate}
            className="flex-row items-center justify-between rounded-2xl border border-red-200 bg-red-50/50 p-3.5 active:bg-red-100/60 dark:border-red-900/40 dark:bg-red-950/20"
          >
            <View className="flex-row items-center">
              <RotateCcw size={18} color="#ef4444" />
              <View className="ml-3">
                <Text className="text-xs font-bold text-red-600 dark:text-red-400">
                  Reset to Clean Slate (Ready to Use)
                </Text>
                <Text className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Clears all logged trips & resets balances to ₹0
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Theme Preference */}
        <View className="mb-6 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <Text className="mb-3 text-xs font-semibold tracking-wider text-neutral-400 uppercase">
            Appearance
          </Text>

          <View className="flex-row gap-2">
            {(['system', 'light', 'dark'] as const).map((t) => {
              const isSelected = selectedTheme === t;
              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => setSelectedTheme(t)}
                  className={`flex-1 items-center rounded-xl border py-2.5 capitalize ${
                    isSelected
                      ? 'dark:bg-primary-950/40 border-primary-600 bg-primary-50'
                      : 'border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      isSelected ? 'text-primary-700 dark:text-primary-300' : 'text-neutral-600'
                    }`}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View className="h-20" />
      </ScrollView>
    </View>
  );
}
