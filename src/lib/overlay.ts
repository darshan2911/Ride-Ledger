import { NativeModules, Platform } from 'react-native';

const { RideLedgerOverlay } = NativeModules;

export type OverlayAlarmStatus = {
  isEnabled: boolean;
  hour: number;
  minute: number;
  canDrawOverlays: boolean;
  canScheduleExactAlarms: boolean;
};

export const OverlayManager = {
  /**
   * Checks whether the user has granted the "Display over other apps" (SYSTEM_ALERT_WINDOW) permission.
   */
  async canDrawOverlays(): Promise<boolean> {
    if (Platform.OS !== 'android' || !RideLedgerOverlay?.canDrawOverlays) {
      return false;
    }
    try {
      return await RideLedgerOverlay.canDrawOverlays();
    }
    catch (e) {
      console.warn('Failed to check canDrawOverlays:', e);
      return false;
    }
  },

  /**
   * Opens Android Settings directly to the "Display over other apps" page for RideLedger.
   */
  async openOverlaySettings(): Promise<boolean> {
    if (Platform.OS !== 'android' || !RideLedgerOverlay?.openOverlaySettings) {
      return false;
    }
    try {
      return await RideLedgerOverlay.openOverlaySettings();
    }
    catch (e) {
      console.warn('Failed to open overlay settings:', e);
      return false;
    }
  },

  /**
   * Schedules the daily exact alarm at the given hour and minute.
   * Rescheduled across reboots via native BOOT_COMPLETED receiver.
   */
  async scheduleDailyAlarm(hour: number, minute: number): Promise<boolean> {
    if (Platform.OS !== 'android' || !RideLedgerOverlay?.scheduleDailyAlarm) {
      return false;
    }
    try {
      return await RideLedgerOverlay.scheduleDailyAlarm(hour, minute);
    }
    catch (e) {
      console.warn('Failed to schedule daily alarm:', e);
      return false;
    }
  },

  /**
   * Cancels the scheduled daily alarm.
   */
  async cancelDailyAlarm(): Promise<boolean> {
    if (Platform.OS !== 'android' || !RideLedgerOverlay?.cancelDailyAlarm) {
      return false;
    }
    try {
      return await RideLedgerOverlay.cancelDailyAlarm();
    }
    catch (e) {
      console.warn('Failed to cancel daily alarm:', e);
      return false;
    }
  },

  /**
   * Triggers an exact test alarm after delaySeconds (default: 5s).
   * Even when the app is minimized or phone is on home screen/another app,
   * it pops up RideLedger directly to the Quick Log interface.
   */
  async triggerTestAlarm(delaySeconds: number = 5): Promise<boolean> {
    if (Platform.OS !== 'android' || !RideLedgerOverlay?.triggerTestAlarm) {
      return false;
    }
    try {
      return await RideLedgerOverlay.triggerTestAlarm(delaySeconds);
    }
    catch (e) {
      console.warn('Failed to trigger test alarm:', e);
      return false;
    }
  },

  /**
   * Retrieves current alarm and overlay permission status from Android.
   */
  async getAlarmStatus(): Promise<OverlayAlarmStatus> {
    if (Platform.OS !== 'android' || !RideLedgerOverlay?.getAlarmStatus) {
      return {
        isEnabled: false,
        hour: 21,
        minute: 0,
        canDrawOverlays: false,
        canScheduleExactAlarms: false,
      };
    }
    try {
      return await RideLedgerOverlay.getAlarmStatus();
    }
    catch (e) {
      console.warn('Failed to get alarm status:', e);
      return {
        isEnabled: false,
        hour: 21,
        minute: 0,
        canDrawOverlays: false,
        canScheduleExactAlarms: false,
      };
    }
  },

  /**
   * Syncs today's commute status with native Android SharedPreferences and dismisses notification if logged.
   */
  async markTodayLogged(dateStr: string, isLogged: boolean): Promise<boolean> {
    if (Platform.OS !== 'android' || !RideLedgerOverlay?.markTodayLogged) {
      return false;
    }
    try {
      return await RideLedgerOverlay.markTodayLogged(dateStr, isLogged);
    }
    catch (e) {
      console.warn('Failed to mark today logged natively:', e);
      return false;
    }
  },

  /**
   * Dismisses any active commute reminder check-in notification.
   */
  async dismissReminderNotification(): Promise<boolean> {
    if (Platform.OS !== 'android' || !RideLedgerOverlay?.dismissReminderNotification) {
      return false;
    }
    try {
      return await RideLedgerOverlay.dismissReminderNotification();
    }
    catch (e) {
      console.warn('Failed to dismiss reminder notification:', e);
      return false;
    }
  },

  /**
   * Checks whether the specified date is marked as logged in Android.
   */
  async isTodayLogged(dateStr: string): Promise<boolean> {
    if (Platform.OS !== 'android' || !RideLedgerOverlay?.isTodayLogged) {
      return false;
    }
    try {
      return await RideLedgerOverlay.isTodayLogged(dateStr);
    }
    catch (e) {
      console.warn('Failed to check if date logged:', e);
      return false;
    }
  },
};
