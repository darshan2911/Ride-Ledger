# RideLedger Agent Directives (ECC)

See [CLAUDE.md](file:///Users/darshanpatel/Documents/Demo%20Projects/RideLedger/CLAUDE.md) and [.cursorrules](file:///Users/darshanpatel/Documents/Demo%20Projects/RideLedger/.cursorrules) for detailed conventions.

## Primary Principles
1. **Always store money in integer paise (`₹1 = 100 paise`)**.
2. **Never commit mock data or seed dummy data on app initialization**.
3. **Always preserve edge-to-edge safe area insets on Android & iOS (`useSafeAreaInsets`)**.
4. **Always ensure buttons and text containers on cards use `flex-1 mr-2` and `shrink-0` to support narrow Android screens**.
5. **Always verify compilation with `pnpm tsc --noEmit` and run `pnpm test`**.
