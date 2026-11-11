package com.rideledger.development

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.database.sqlite.SQLiteDatabase
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import androidx.core.app.NotificationCompat
import java.io.File
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

class CommuteReminderReceiver : BroadcastReceiver() {

    companion object {
        const val ACTION_COMMUTE_REMINDER = "com.rideledger.ACTION_COMMUTE_REMINDER"
        const val CHANNEL_ID = "commute_overlay_reminder_channel"
        const val NOTIFICATION_ID = 9001
        const val PREFS_NAME = "RideLedgerPrefs"
        const val TAG = "CommuteReminderReceiver"

        fun getTodayDateString(): String {
            return SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
        }

        fun isDateLogged(context: Context, dateStr: String): Boolean {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val cachedDate = prefs.getString("last_logged_commute_date", null)
            if (cachedDate == dateStr) {
                return true
            }

            // Also check SQLite databases directly for maximum accuracy
            val dbCandidates = listOf(
                context.getDatabasePath("rideledger.db"),
                File(context.filesDir, "SQLite/rideledger.db"),
                File(context.noBackupFilesDir, "SQLite/rideledger.db")
            )

            for (dbFile in dbCandidates) {
                if (dbFile.exists()) {
                    try {
                        val db = SQLiteDatabase.openDatabase(dbFile.path, null, SQLiteDatabase.OPEN_READONLY)
                        val cursor = db.rawQuery("SELECT COUNT(*) FROM commute_days WHERE date = ?", arrayOf(dateStr))
                        var count = 0
                        if (cursor.moveToFirst()) {
                            count = cursor.getInt(0)
                        }
                        cursor.close()
                        db.close()
                        if (count > 0) {
                            return true
                        }
                    } catch (e: Exception) {
                        Log.w(TAG, "Error checking db file at ${dbFile.path}: ${e.message}")
                    }
                }
            }
            return false
        }

        fun markDateLogged(context: Context, dateStr: String, isLogged: Boolean) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            if (isLogged) {
                prefs.edit().putString("last_logged_commute_date", dateStr).apply()
            } else {
                if (prefs.getString("last_logged_commute_date", null) == dateStr) {
                    prefs.edit().remove("last_logged_commute_date").apply()
                }
            }
        }

        fun setWorkingDays(context: Context, workingDaysStr: String) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putString("working_days", workingDaysStr).apply()
            Log.d(TAG, "Updated working_days in SharedPreferences: $workingDaysStr")
        }

        fun isTodayWorkingDay(context: Context): Boolean {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            var workingDaysStr = prefs.getString("working_days", null)

            // If not in SharedPreferences, check SQLite database directly
            if (workingDaysStr == null) {
                val dbCandidates = listOf(
                    context.getDatabasePath("rideledger.db"),
                    File(context.filesDir, "SQLite/rideledger.db"),
                    File(context.noBackupFilesDir, "SQLite/rideledger.db")
                )
                for (dbFile in dbCandidates) {
                    if (dbFile.exists()) {
                        try {
                            val db = SQLiteDatabase.openDatabase(dbFile.path, null, SQLiteDatabase.OPEN_READONLY)
                            val cursor = db.rawQuery("SELECT working_days FROM app_settings WHERE id = 'default'", null)
                            if (cursor.moveToFirst()) {
                                workingDaysStr = cursor.getString(0)
                            }
                            cursor.close()
                            db.close()
                            if (workingDaysStr != null) break
                        } catch (e: Exception) {
                            Log.w(TAG, "Error checking working_days in db: ${e.message}")
                        }
                    }
                }
            }

            val workingDaysList = (workingDaysStr ?: "1,2,3,4,5").split(",")
                .mapNotNull { it.trim().toIntOrNull() }

            val calendar = Calendar.getInstance()
            val dayOfWeek = calendar.get(Calendar.DAY_OF_WEEK) // 1=Sun, 2=Mon... 7=Sat
            val isoDay = if (dayOfWeek == Calendar.SUNDAY) 7 else dayOfWeek - 1 // 1=Mon ... 7=Sun

            return workingDaysList.contains(isoDay)
        }

        fun dismissNotification(context: Context) {
            try {
                val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
                notificationManager?.cancel(NOTIFICATION_ID)
                Log.d(TAG, "Dismissed commute reminder notification (ID $NOTIFICATION_ID)")
            } catch (e: Exception) {
                Log.w(TAG, "Failed to dismiss notification: ${e.message}")
            }
        }

        fun scheduleAlarm(context: Context, hour: Int, minute: Int, isTest: Boolean = false, delaySeconds: Int = 0) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return

            val intent = Intent(context, CommuteReminderReceiver::class.java).apply {
                action = ACTION_COMMUTE_REMINDER
                putExtra("is_test", isTest)
            }

            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }

            val requestCode = if (isTest) 9002 else 9001
            val pendingIntent = PendingIntent.getBroadcast(context, requestCode, intent, flags)

            val triggerTimeMillis: Long
            if (isTest && delaySeconds > 0) {
                triggerTimeMillis = System.currentTimeMillis() + (delaySeconds * 1000L)
            } else {
                val todayStr = getTodayDateString()
                val isTodayAlreadyLogged = isDateLogged(context, todayStr)

                val calendar = Calendar.getInstance().apply {
                    set(Calendar.HOUR_OF_DAY, hour)
                    set(Calendar.MINUTE, minute)
                    set(Calendar.SECOND, 0)
                    set(Calendar.MILLISECOND, 0)
                    // If today's reminder time has passed OR today's commute is already recorded, schedule for tomorrow!
                    if (timeInMillis <= System.currentTimeMillis() || isTodayAlreadyLogged) {
                        add(Calendar.DAY_OF_YEAR, 1)
                    }
                }
                triggerTimeMillis = calendar.timeInMillis
            }

            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setExactAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        triggerTimeMillis,
                        pendingIntent
                    )
                } else {
                    alarmManager.setExact(
                        AlarmManager.RTC_WAKEUP,
                        triggerTimeMillis,
                        pendingIntent
                    )
                }
                Log.d(TAG, "Scheduled alarm for $triggerTimeMillis (isTest=$isTest)")
            } catch (e: SecurityException) {
                Log.e(TAG, "SecurityException while scheduling exact alarm: ${e.message}")
            }
        }

        fun cancelAlarm(context: Context) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
            val intent = Intent(context, CommuteReminderReceiver::class.java).apply {
                action = ACTION_COMMUTE_REMINDER
            }
            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
            val pendingIntent = PendingIntent.getBroadcast(context, 9001, intent, flags)
            alarmManager.cancel(pendingIntent)
            dismissNotification(context)
            Log.d(TAG, "Cancelled commute alarm and dismissed notification")
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        Log.d(TAG, "onReceive triggered with action: $action")

        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        if (Intent.ACTION_BOOT_COMPLETED == action) {
            val isEnabled = prefs.getBoolean("reminder_enabled", true)
            val hour = prefs.getInt("reminder_hour", 21)
            val minute = prefs.getInt("reminder_minute", 0)
            if (isEnabled) {
                Log.d(TAG, "Device rebooted, rescheduling daily alarm at $hour:$minute")
                scheduleAlarm(context, hour, minute)
            }
            return
        }

        if (ACTION_COMMUTE_REMINDER == action) {
            val isTest = intent.getBooleanExtra("is_test", false)

            if (!isTest) {
                // Edge Case EC-W1: If today is a non-working day (week off), suppress popup & notification!
                if (!isTodayWorkingDay(context)) {
                    Log.d(TAG, "Today is a scheduled week off (non-working day)! Suppressing overlay popup & reminder notification.")
                    // Reschedule for tomorrow's configured time
                    val hour = prefs.getInt("reminder_hour", 21)
                    val minute = prefs.getInt("reminder_minute", 0)
                    val isEnabled = prefs.getBoolean("reminder_enabled", true)
                    if (isEnabled) {
                        scheduleAlarm(context, hour, minute)
                    }
                    return
                }

                // Edge Case EC-A1: If today's commute is ALREADY logged, suppress popup & notification!
                val todayStr = getTodayDateString()
                if (isDateLogged(context, todayStr)) {
                    Log.d(TAG, "Commute for today ($todayStr) has already been recorded! Suppressing overlay popup & notification.")
                    // Reschedule for tomorrow's configured time
                    val hour = prefs.getInt("reminder_hour", 21)
                    val minute = prefs.getInt("reminder_minute", 0)
                    val isEnabled = prefs.getBoolean("reminder_enabled", true)
                    if (isEnabled) {
                        scheduleAlarm(context, hour, minute)
                    }
                    return
                }
            }

            // 1. Acquire temporary wake lock to ensure CPU is active
            val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
            val wakeLock = powerManager?.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP,
                "RideLedger:CommuteWakeLock"
            )
            wakeLock?.acquire(5000L)

            // 2. If Display Over Other Apps (SYSTEM_ALERT_WINDOW) is granted, pop up the app directly!
            val canDrawOverlays = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Settings.canDrawOverlays(context)
            } else {
                true
            }

            Log.d(TAG, "Alarm fired. Settings.canDrawOverlays = $canDrawOverlays, isTest = $isTest")

            if (canDrawOverlays) {
                try {
                    val popupIntent = Intent(context, MainActivity::class.java).apply {
                        this.action = Intent.ACTION_VIEW
                        this.data = Uri.parse("RideLedger://quick-log")
                        this.flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                                Intent.FLAG_ACTIVITY_SINGLE_TOP or
                                Intent.FLAG_ACTIVITY_CLEAR_TOP
                        putExtra("from_overlay", true)
                        putExtra("route", "/quick-log")
                    }
                    context.startActivity(popupIntent)
                    Log.d(TAG, "Successfully launched MainActivity via overlay permission")
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to launch activity over other apps: ${e.message}", e)
                }
            }

            // 3. Always show High-Priority Notification with FullScreenIntent companion
            showNotification(context)

            // 4. Reschedule next day's alarm if this is a recurring daily alarm
            if (!isTest) {
                val hour = prefs.getInt("reminder_hour", 21)
                val minute = prefs.getInt("reminder_minute", 0)
                val isEnabled = prefs.getBoolean("reminder_enabled", true)
                if (isEnabled) {
                    scheduleAlarm(context, hour, minute)
                }
            }
        }
    }

    private fun showNotification(context: Context) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return

        // Create channel on Android 8.0+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Commute Reminder & Overlay",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Daily reminders to quickly log your carpool and commute expense"
                enableLights(true)
                enableVibration(true)
                setShowBadge(true)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            notificationManager.createNotificationChannel(channel)
        }

        val piFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }

        // Tap action: opens Quick Log
        val quickLogIntent = Intent(context, MainActivity::class.java).apply {
            action = Intent.ACTION_VIEW
            data = Uri.parse("RideLedger://quick-log")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("route", "/quick-log")
        }
        val quickLogPendingIntent = PendingIntent.getActivity(
            context,
            1001,
            quickLogIntent,
            piFlags
        )

        // Notification builder
        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.notification_icon)
            .setContentTitle("How was your commute today? 🚗")
            .setContentText("Tap to record your ride in 5 seconds.")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setAutoCancel(true)
            .setContentIntent(quickLogPendingIntent)
            .setFullScreenIntent(quickLogPendingIntent, true)
            .addAction(
                android.R.drawable.ic_menu_edit,
                "Log Commute",
                quickLogPendingIntent
            )

        notificationManager.notify(NOTIFICATION_ID, builder.build())
    }
}


