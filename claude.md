# RideLedger Agent & Claude Guidelines (ECC)

> Personal Carpool & Commute Expense Management Application

## Tech Stack
- **Expo SDK 54** with React Native 0.81.5 & New Architecture
- **Expo Router 6** (File-based navigation under `src/app/`)
- **NativeWind / TailwindCSS** styling (`src/global.css`)
- **SQLite (`expo-sqlite`)** local database with audit logging
- **Zustand** reactive store for state refreshes
- **Android Native Kotlin**: Exact AlarmManager & `SYSTEM_ALERT_WINDOW` Overlay Popups

## Financial Rules
- **Paise Precision**: All monetary values in the database and calculations MUST be integers representing paise (`₹1 = 100 paise`).
- **Currency Helpers**: Always use `@/lib/currency`:
  - `formatPaise(paise: number)` -> `₹60`
  - `rupeesToPaise(rupees: string | number)` -> `6000`
  - `paiseToRupees(paise: number)` -> `60`

## Database Architecture
- Tables: `carpool_owners`, `commute_days`, `commute_trips`, `payments`, `payment_allocations`, `app_settings`, `audit_logs`.
- Repositories:
  - `src/db/repositories/commutes.repo.ts`
  - `src/db/repositories/owners.repo.ts`
  - `src/db/repositories/payments.repo.ts`
  - `src/db/repositories/analytics.repo.ts`
  - `src/db/repositories/settings.repo.ts`
  - `src/db/repositories/backup.repo.ts`
- **Zero Mock Data**: No hardcoded mock drivers or rides. Clean database initialization.

## UI & Safe Area Standards
- Status Bar: `FocusAwareStatusBar` with `paddingTop: insets.top` on top container.
- Bottom Bars: `paddingBottom: Math.max(20, insets.bottom + 12)`.
- Flash Messages: Mounted with `statusBarHeight={insets.top}` and `floating`.
- Cards: On cards with trailing buttons/icons, always use `flex-1 mr-2` on text containers and `shrink-0` on buttons to prevent clipping on small screen devices.

## Commands
```bash
# Development
pnpm start
pnpm expo run:android

# Quality & Verification
pnpm tsc --noEmit
pnpm lint --fix
pnpm test

# Standalone Release Build
cd android && ./gradlew assembleRelease -x lint -x lintVitalAnalyzeRelease -x lintVitalRelease
```
