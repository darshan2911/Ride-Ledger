import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure foreground notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

export const REMINDER_CATEGORY_ID = 'COMMUTE_CHECK_IN';
export const ACTION_LOG_COMMUTE = 'LOG_COMMUTE';
export const ACTION_REMIND_LATER = 'REMIND_LATER';

export async function setupNotificationChannelsAndCategories(): Promise<void> {
  if (Platform.OS !== 'android')
    return;

  // 1. Android Notification Channel with High Importance
  await Notifications.setNotificationChannelAsync('commute-reminders', {
    name: 'Daily Commute Reminders',
    description: 'Notifications asking to log your daily commute and carpool expenses',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF6C00',
    sound: 'default',
    enableVibrate: true,
    showBadge: true,
  });

  // 2. Actionable Notification Category
  await Notifications.setNotificationCategoryAsync(REMINDER_CATEGORY_ID, [
    {
      identifier: ACTION_LOG_COMMUTE,
      buttonTitle: 'Log Commute 🚗',
      options: {
        opensAppToForeground: true,
      },
    },
    {
      identifier: ACTION_REMIND_LATER,
      buttonTitle: 'Remind Later ⏰',
      options: {
        opensAppToForeground: false,
      },
    },
  ]);
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

export async function scheduleDailyReminder(_hour: number, _minute: number): Promise<string> {
  await setupNotificationChannelsAndCategories();

  // Cancel any existing expo-scheduled notifications to avoid duplicates with native AlarmManager
  await cancelAllCommuteReminders();

  return 'native-alarm-delegated';
}

export async function cancelAllCommuteReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function triggerImmediateTestNotification(): Promise<string> {
  await setupNotificationChannelsAndCategories();
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'How was your commute today? 🚗',
      body: 'Tap to log your carpool or commute in 5 seconds and keep expenses accurate.',
      data: { action: 'quick-log', route: '/quick-log' },
      categoryIdentifier: REMINDER_CATEGORY_ID,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: {
      channelId: 'commute-reminders',
      seconds: 1,
    } as any,
  });
  return id;
}
