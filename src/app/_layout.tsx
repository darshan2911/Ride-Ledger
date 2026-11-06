import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { ThemeProvider } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as React from 'react';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import FlashMessage from 'react-native-flash-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeConfig } from '@/components/ui/use-theme-config';
import { initDatabase } from '@/db';
import { APIProvider } from '@/lib/api';
import { loadSelectedTheme } from '@/lib/hooks/use-selected-theme';
import { setupNotificationChannelsAndCategories } from '@/lib/notifications';
// Import global CSS file
import '../global.css';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(app)',
};

// Initialize SQLite Database and theme
try {
  initDatabase();
}
catch (error) {
  console.error('Failed to initialize RideLedger SQLite DB:', error);
}

loadSelectedTheme();
SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({
  duration: 500,
  fade: true,
});

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    setupNotificationChannelsAndCategories();

    // Listen for notification taps and actionable responses
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.route) {
        router.push(data.route as any);
      }
    });

    return () => subscription.remove();
  }, [router]);

  return (
    <Providers>
      <Stack>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen
          name="quick-log"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="bulk-log"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen name="owners/index" options={{ headerShown: false }} />
        <Stack.Screen name="owners/[id]" options={{ headerShown: false }} />
        <Stack.Screen
          name="owners/edit"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="payments/record"
          options={{ presentation: 'modal', headerShown: false }}
        />
      </Stack>
    </Providers>
  );
}

function SafeFlashMessage() {
  const insets = useSafeAreaInsets();
  return (
    <FlashMessage
      position="top"
      statusBarHeight={insets.top}
      floating
    />
  );
}

function Providers({ children }: { children: React.ReactNode }) {
  const theme = useThemeConfig();
  return (
    <GestureHandlerRootView
      style={styles.container}
      className={theme.dark ? `dark` : undefined}
    >
      <KeyboardProvider>
        <ThemeProvider value={theme}>
          <APIProvider>
            <BottomSheetModalProvider>
              {children}
              <SafeFlashMessage />
            </BottomSheetModalProvider>
          </APIProvider>
        </ThemeProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
