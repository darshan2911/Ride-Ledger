import * as React from 'react';
import { View } from 'react-native';
import { Text } from './text';

type CommuteBadgeProps = {
  type: 'carpool' | 'own_vehicle' | 'leave' | 'other' | 'not_logged' | 'week_off' | 'unpaid' | 'partially_paid' | 'paid';
  size?: 'sm' | 'md';
};

export function CommuteBadge({ type, size = 'sm' }: CommuteBadgeProps) {
  const getBadgeConfig = () => {
    switch (type) {
      case 'carpool':
        return {
          label: 'Carpool',
          bg: 'bg-indigo-50 dark:bg-indigo-950/40',
          text: 'text-indigo-700 dark:text-indigo-300',
          border: 'border-indigo-200 dark:border-indigo-800',
        };
      case 'own_vehicle':
        return {
          label: 'Own Bike/Vehicle',
          bg: 'bg-blue-50 dark:bg-blue-950/40',
          text: 'text-blue-700 dark:text-blue-300',
          border: 'border-blue-200 dark:border-blue-800',
        };
      case 'leave':
        return {
          label: 'Leave / Off',
          bg: 'bg-neutral-100 dark:bg-neutral-800',
          text: 'text-neutral-600 dark:text-neutral-400',
          border: 'border-neutral-200 dark:border-neutral-700',
        };
      case 'week_off':
        return {
          label: 'Week Off',
          bg: 'bg-emerald-50 dark:bg-emerald-950/40',
          text: 'text-emerald-700 dark:text-emerald-300',
          border: 'border-emerald-200 dark:border-emerald-800',
        };
      case 'not_logged':
        return {
          label: 'Not Logged',
          bg: 'bg-amber-50 dark:bg-amber-950/40',
          text: 'text-amber-700 dark:text-amber-400',
          border: 'border-amber-200 dark:border-amber-800',
        };
      case 'unpaid':
        return {
          label: 'Pending',
          bg: 'bg-amber-50 dark:bg-amber-950/40',
          text: 'text-amber-700 dark:text-amber-400',
          border: 'border-amber-200 dark:border-amber-800',
        };
      case 'partially_paid':
        return {
          label: 'Partially Paid',
          bg: 'bg-purple-50 dark:bg-purple-950/40',
          text: 'text-purple-700 dark:text-purple-400',
          border: 'border-purple-200 dark:border-purple-800',
        };
      case 'paid':
        return {
          label: 'Settled',
          bg: 'bg-emerald-50 dark:bg-emerald-950/40',
          text: 'text-emerald-700 dark:text-emerald-400',
          border: 'border-emerald-200 dark:border-emerald-800',
        };
      default:
        return {
          label: 'Other',
          bg: 'bg-neutral-100 dark:bg-neutral-800',
          text: 'text-neutral-600 dark:text-neutral-400',
          border: 'border-neutral-200 dark:border-neutral-700',
        };
    }
  };

  const config = getBadgeConfig();
  const py = size === 'sm' ? 'py-0.5' : 'py-1';
  const px = size === 'sm' ? 'px-2' : 'px-2.5';
  const textSize = size === 'sm' ? 'text-[11px]' : 'text-xs';

  return (
    <View
      className={`items-center justify-center rounded-full border ${px} ${py} ${config.bg} ${config.border}`}
    >
      <Text className={`font-semibold ${textSize} ${config.text}`}>
        {config.label}
      </Text>
    </View>
  );
}
