<p align="center">
  <img src="./assets/icon.png" width="128" height="128" alt="RideLedger Logo" style="border-radius: 28px;" />
</p>

<h1 align="center">RideLedger</h1>

<p align="center">
  <strong>Intelligent Personal Carpool & Commute Expense Tracker</strong><br />
  <em>Eliminate manual notes tracking, automatically balance carpool accounts, and settle rides effortlessly.</em>
</p>

<p align="center">
  <a href="#core-features">Features</a> •
  <a href="#architecture--tech-stack">Tech Stack</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#overlay--reminder-setup">Overlay Setup</a> •
  <a href="#project-structure">Project Structure</a> •
  <a href="#data-integrity--financial-engine">Financial Engine</a>
</p>

---

## 🎯 The Problem RideLedger Solves

If you carpool to work and pay drivers on a weekly or bi-weekly cycle, tracking rides in notes apps is frustrating and error-prone:
- Your commute changes daily (both ways, morning only, evening only, taking your own bike, or work-from-home/leave).
- Different drivers drive on different days or different shifts (e.g., Raj in the morning for ₹60, Amit in the evening for ₹70).
- When settlement day comes every 7–15 days, you have to manually calculate past dates and owe balances.

**RideLedger completely eliminates this headache.** It wakes up at your preferred daily reminder time, pops up an interactive Quick Log overlay directly over whatever app you are using, tracks exact balances per driver, and manages settlements in seconds.

---

## ✨ Core Features

### 1. 🚀 Native Android Display Over Other Apps (Overlay Pop-up)
- **Automatic Pop-up**: Pops up the Quick Log interface directly over any screen or background app when your daily reminder fires.
- **Reliable Android Alarm Engine**: Uses Android's `AlarmManager.setExactAndAllowWhileIdle()` to guarantee wakeups even when the app is closed, minimized, or the phone is in Doze mode.
- **Reboot Persistence**: Automatically re-arms exact daily alarms across device reboots via `RECEIVE_BOOT_COMPLETED`.
- **Actionable Heads-Up Companion**: High-priority notification with a FullScreenIntent fallback and a 1-tap `Log Commute` button.
- **In-App Testing**: Test your pop-up with a 5-second countdown button in Settings.

### 2. ⚡ 5-Second Daily Commute Logging
- **Multi-Option Logging**:
  - **Carpool**: Select morning, evening, or both trips with individual drivers and fares.
  - **Own Bike / Vehicle**: Recorded with ₹0 carpool charge.
  - **Leave / Off**: Recorded with ₹0 carpool charge.
- **Split Drivers per Day**: Assign Raj for Morning (₹60) and Amit for Evening (₹70)—RideLedger calculates separate balances automatically.
- **Editable Previous Records**: Edit past entries or log back-dated commutes without breaking audit trails.
- **Missed Commute Detector & Bulk Logger**: Identifies unlogged working days and lets you record up to 14 days in a single tap.

### 3. 👥 Carpool Driver & Ledger Management
- Dedicated profiles for each driver (**Raj**, **Amit**, **Suresh**, etc.) with default morning and evening fares.
- Real-time balance calculations: Total lifetime charges, total amount settled, pending unpaid trips, and last payment date.
- Safe archiving: Inactive drivers can be archived without deleting historical financial records.

### 4. 💳 Settlement & FIFO Payment Engine
- Settle outstanding balances with 1 tap using **UPI**, **Cash**, **Bank Transfer**, or **Other**.
- Full or partial payment support: Uses a First-In-First-Out (FIFO) algorithm to mark oldest unpaid trips as paid first.
- Pre-filled settlement amounts and direct links into payment logging.

### 5. 📅 Interactive Calendar & History
- Visual color-coded monthly calendar:
  - 🟣 **Purple**: Carpool Commute
  - 🔵 **Blue**: Own Bike / Vehicle
  - ⚪ **Grey**: Leave / Day Off
- Complete searchable transaction history with filters by date, commute type, and driver.

### 6. 📊 Analytics & Visual Breakdown
- Monthly spend trends, average daily commute cost, and carpool vs bike distribution.
- Driver-wise expense distribution.
- Complete monthly expense totals and carpool frequency counters.

### 7. 💾 Offline JSON & CSV Backup
- **JSON Backup**: Export and restore your complete SQLite database (commutes, trips, drivers, payments, settings).
- **CSV Export**: Export clean commute history for Excel, Google Sheets, or Apple Numbers.
- **Clean Slate Reset**: 1-click option to clear test records while preserving your driver profiles.

---

## 🛠️ Architecture & Tech Stack

- **Framework**: [React Native 0.79](https://reactnative.dev/) with [Expo SDK 53](https://expo.dev/)
- **Routing**: [Expo Router v5](https://docs.expo.dev/router/introduction/) (file-based navigation with typed routes)
- **Database**: Local-First Embedded SQLite via [`expo-sqlite`](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- **Native Android Module**: Custom Kotlin Module (`RideLedgerOverlayModule.kt`) and Broadcast Receiver (`CommuteReminderReceiver.kt`)
- **Styling**: [NativeWind v4](https://www.nativewind.dev/) (Tailwind CSS) with native Flexbox `gap-*` spacing
- **Financial Precision**: All currency stored and computed in integer paise (`₹1 = 100 paise`), eliminating IEEE 754 floating-point rounding errors
- **UI Components**: Lucide Icons, bottom-sheet modals, flash messages, and edge-to-edge safe area handling

---

## 📱 Getting Started

### Prerequisites

- Node.js (v18 or v20 LTS recommended)
- [pnpm](https://pnpm.io/) (`corepack enable && corepack prepare pnpm@latest --activate`)
- Android Studio with Android SDK 35 (Android 15) and command-line tools
- Android device or emulator with developer options and USB debugging enabled

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/darshan2911/Ride-Ledger.git
   cd Ride-Ledger
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Start the Metro development server**:
   ```bash
   pnpm start --port 8082
   ```

4. **Run on Android**:
   ```bash
   # Make sure your device/emulator is connected
   adb devices

   # Build and install debug APK
   pnpm expo run:android --port 8082
   ```

---

## ⚙️ Overlay & Reminder Setup

To enable RideLedger to pop up over other apps when the reminder triggers:

1. Open **RideLedger** and navigate to the **Settings** tab.
2. In the **Display Over Other Apps** card, tap **Grant "Display Over Other Apps" Permission**.
3. Toggle the permission switch to **Allowed** in Android settings.
4. Return to RideLedger: the permission status badge will turn green (**Active**).
5. Tap **Test Overlay Pop-up (5s Delay)**, immediately switch to your home screen or another app, and watch RideLedger pop up over the screen ready for quick logging!

---

## 📂 Project Structure

```
RideLedger/
├── assets/                          # App icon, adaptive icon, splash screen, logo
├── android/                         # Native Android project
│   └── app/src/main/java/com/rideledger/development/
│       ├── MainActivity.kt          # Handles deep links & wake locks
│       ├── MainApplication.kt      # Registers custom native packages
│       ├── RideLedgerOverlayModule.kt  # Native bridge for overlay & alarms
│       ├── CommuteReminderReceiver.kt  # AlarmManager broadcast receiver
│       └── RideLedgerPackage.kt     # React Native package declaration
├── src/
│   ├── app/
│   │   ├── (app)/                   # Bottom tab navigator
│   │   │   ├── index.tsx            # Home Dashboard
│   │   │   ├── history.tsx          # Commute History & Filters
│   │   │   ├── calendar.tsx         # Interactive Monthly Commute Calendar
│   │   │   ├── analytics.tsx        # Spend Analytics & Driver Breakdown
│   │   │   └── settings.tsx         # Reminders, Overlay, Backup & Theme
│   │   ├── quick-log.tsx            # Standalone / Overlay Quick Log modal
│   │   ├── bulk-log.tsx             # Multi-day missed commute logger
│   │   ├── owners/                  # Driver management & individual ledgers
│   │   └── payments/                # Payment recording & FIFO allocations
│   ├── db/
│   │   ├── database.ts              # SQLite connection & schema initialization
│   │   ├── schema.ts                # Table definitions & indexes
│   │   ├── types.ts                 # Type definitions
│   │   └── repositories/            # Modular repos (commutes, owners, payments, etc.)
│   ├── lib/
│   │   ├── currency.ts              # Integer paise math & formatting
│   │   ├── notifications.ts         # Expo notifications scheduling
│   │   ├── overlay.ts               # Type-safe wrapper for native overlay module
│   │   └── hooks/                   # React query / hooks for store & state
└── __tests__/                       # Jest unit & financial integrity tests
```

---

## 💰 Data Integrity & Financial Engine

- **Integer Paise Representation**: All fares, totals, and balances are stored as integer paise in the SQLite database (e.g., ₹60 is stored as `6000`).
- **FIFO Settlement**: Payments are allocated to the oldest unpaid trips first. A trip's status progresses deterministically from `unpaid` → `partially_paid` → `paid`.
- **Audit Trails**: Changes to driver fares, payments, and trip edits record audit logs for reconciliation.

---

## 🧪 Testing & Verification

Run tests, type checks, and linting with:

```bash
# Run Jest financial & component tests
pnpm test

# Run TypeScript type check
pnpm type-check

# Run ESLint
pnpm lint
```

---

## 📄 License

This application is built for personal commute and expense tracking. Released under the [MIT License](LICENSE).
