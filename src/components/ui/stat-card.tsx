import * as React from 'react';
import { View } from 'react-native';
import { Text } from './text';

type StatCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
};

export function StatCard({ title, value, subtitle, icon, variant = 'default' }: StatCardProps) {
  const getBorderColor = () => {
    switch (variant) {
      case 'primary':
        return 'border-primary-500/20';
      case 'success':
        return 'border-green-500/20';
      case 'warning':
        return 'border-amber-500/20';
      case 'danger':
        return 'border-red-500/20';
      default:
        return 'border-neutral-200 dark:border-neutral-800';
    }
  };

  const getValueColor = () => {
    switch (variant) {
      case 'primary':
        return 'text-primary-600 dark:text-primary-400';
      case 'success':
        return 'text-green-600 dark:text-green-400';
      case 'warning':
        return 'text-amber-600 dark:text-amber-400';
      case 'danger':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-neutral-900 dark:text-neutral-100';
    }
  };

  return (
    <View
      className={`rounded-2xl border bg-white p-4 shadow-sm dark:bg-neutral-900 ${getBorderColor()}`}
    >
      <View className="flex-row items-center justify-between gap-1.5">
        <Text
          numberOfLines={1}
          className="mr-1 flex-1 text-[11px] font-bold tracking-wide text-neutral-500 uppercase dark:text-neutral-400"
        >
          {title}
        </Text>
        {icon && <View className="shrink-0 opacity-80">{icon}</View>}
      </View>
      <Text className={`mt-2 text-2xl font-bold tracking-tight ${getValueColor()}`}>
        {value}
      </Text>
      {subtitle && (
        <Text className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          {subtitle}
        </Text>
      )}
    </View>
  );
}
