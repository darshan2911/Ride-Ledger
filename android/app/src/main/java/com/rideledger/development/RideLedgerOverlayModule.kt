package com.rideledger.development

import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class RideLedgerOverlayModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "RideLedgerOverlay"

    @ReactMethod
    fun canDrawOverlays(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                promise.resolve(Settings.canDrawOverlays(reactContext))
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("CAN_DRAW_OVERLAYS_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun openOverlaySettings(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:${reactContext.packageName}")
                ).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactContext.startActivity(intent)
                promise.resolve(true)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            // Fallback to general manage overlay permission settings if package URI fails
            try {
                val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactContext.startActivity(intent)
                promise.resolve(true)
            } catch (fallbackError: Exception) {
                promise.reject("OPEN_OVERLAY_SETTINGS_ERROR", fallbackError.message, fallbackError)
            }
        }
    }

    @ReactMethod
    fun scheduleDailyAlarm(hour: Double, minute: Double, promise: Promise) {
        try {
            val h = hour.toInt()
            val m = minute.toInt()

            val prefs = reactContext.getSharedPreferences(CommuteReminderReceiver.PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit()
                .putBoolean("reminder_enabled", true)
                .putInt("reminder_hour", h)
                .putInt("reminder_minute", m)
                .apply()

            CommuteReminderReceiver.scheduleAlarm(reactContext, h, m)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SCHEDULE_ALARM_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun cancelDailyAlarm(promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences(CommuteReminderReceiver.PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit()
                .putBoolean("reminder_enabled", false)
                .apply()

            CommuteReminderReceiver.cancelAlarm(reactContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CANCEL_ALARM_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun triggerTestAlarm(delaySeconds: Double, promise: Promise) {
        try {
            val delay = if (delaySeconds <= 0) 5 else delaySeconds.toInt()
            CommuteReminderReceiver.scheduleAlarm(
                reactContext,
                hour = 0,
                minute = 0,
                isTest = true,
                delaySeconds = delay
            )
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("TEST_ALARM_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getAlarmStatus(promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences(CommuteReminderReceiver.PREFS_NAME, Context.MODE_PRIVATE)
            val isEnabled = prefs.getBoolean("reminder_enabled", true)
            val hour = prefs.getInt("reminder_hour", 21)
            val minute = prefs.getInt("reminder_minute", 0)

            val canDraw = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Settings.canDrawOverlays(reactContext)
            } else {
                true
            }

            val alarmManager = reactContext.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
            val canScheduleExact = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                alarmManager?.canScheduleExactAlarms() ?: false
            } else {
                true
            }

            val map = Arguments.createMap().apply {
                putBoolean("isEnabled", isEnabled)
                putInt("hour", hour)
                putInt("minute", minute)
                putBoolean("canDrawOverlays", canDraw)
                putBoolean("canScheduleExactAlarms", canScheduleExact)
            }

            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("GET_STATUS_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun markTodayLogged(dateStr: String, isLogged: Boolean, promise: Promise) {
        try {
            CommuteReminderReceiver.markDateLogged(reactContext, dateStr, isLogged)
            if (isLogged) {
                CommuteReminderReceiver.dismissNotification(reactContext)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("MARK_LOGGED_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun dismissReminderNotification(promise: Promise) {
        try {
            CommuteReminderReceiver.dismissNotification(reactContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("DISMISS_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun isTodayLogged(dateStr: String, promise: Promise) {
        try {
            val logged = CommuteReminderReceiver.isDateLogged(reactContext, dateStr)
            promise.resolve(logged)
        } catch (e: Exception) {
            promise.reject("CHECK_LOGGED_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun setWorkingDays(workingDays: String, promise: Promise) {
        try {
            CommuteReminderReceiver.setWorkingDays(reactContext, workingDays)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SET_WORKING_DAYS_ERROR", e.message, e)
        }
    }
}

