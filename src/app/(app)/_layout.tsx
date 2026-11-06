import { Tabs } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import {
  BarChart3,
  Calendar,
  Clock,
  Home,
  Settings,
} from 'lucide-react-native';
import * as React from 'react';
import { useCallback, useEffect } from 'react';

export default function TabLayout() {
  const hideSplash = useCallback(async () => {
    try {
      await SplashScreen.hideAsync();
    }
    catch {}
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      hideSplash();
    }, 500);
    return () => clearTimeout(timer);
  }, [hideSplash]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#a1a1aa',
        tabBarStyle: {
          borderTopColor: '#f4f4f5',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size || 20} color={color} />,
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => <Clock size={size || 20} color={color} />,
        }}
      />

      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, size }) => <Calendar size={size || 20} color={color} />,
        }}
      />

      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, size }) => <BarChart3 size={size || 20} color={color} />,
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings size={size || 20} color={color} />,
        }}
      />

      {/* Hide style demo tab from tab bar */}
      <Tabs.Screen
        name="style"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
