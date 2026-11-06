import type { ReactNode } from 'react';
import { Check } from 'lucide-react-native';
import * as React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Text } from './text';

export const selectableCardStyles = {
  container: (isSelected: boolean) =>
    isSelected
      ? 'border-primary-600 bg-primary-50 dark:border-primary-500 dark:bg-primary-950/60'
      : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900',
  title: (isSelected: boolean) =>
    isSelected
      ? 'text-primary-950 dark:text-primary-100'
      : 'text-neutral-900 dark:text-neutral-100',
  subtitle: (isSelected: boolean) =>
    isSelected
      ? 'text-primary-800 dark:text-primary-200/90'
      : 'text-neutral-500 dark:text-neutral-400',
  amount: (isSelected: boolean) =>
    isSelected
      ? 'text-primary-950 dark:text-white'
      : 'text-neutral-900 dark:text-white',
  chip: (isSelected: boolean) =>
    isSelected
      ? 'border-primary-600 bg-primary-600 text-white dark:border-primary-500 dark:bg-primary-500 dark:text-white'
      : 'border-neutral-200 bg-neutral-100 text-neutral-700 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-300',
  chipText: (isSelected: boolean) =>
    isSelected ? 'text-white font-bold' : 'text-neutral-700 dark:text-neutral-300 font-medium',
  checkbox: (isSelected: boolean) =>
    isSelected
      ? 'border-primary-600 bg-primary-600 dark:border-primary-500 dark:bg-primary-500'
      : 'border-neutral-300 dark:border-neutral-700 bg-transparent',
};

type SelectableCardProps = {
  selected: boolean;
  onPress: () => void;
  title: string;
  subtitle?: string;
  amount?: string;
  icon?: ReactNode;
  showCheckbox?: boolean;
  className?: string;
  children?: ReactNode;
};

export function SelectableCard({
  selected,
  onPress,
  title,
  subtitle,
  amount,
  icon,
  showCheckbox = false,
  className = '',
  children,
}: SelectableCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      className={`flex-row items-center justify-between rounded-2xl border p-4 shadow-sm ${selectableCardStyles.container(
        selected,
      )} ${className}`}
    >
      <View className="mr-3 flex-1 flex-row items-center">
        {icon && <View className="mr-3 shrink-0">{icon}</View>}
        <View className="flex-1">
          <Text className={`text-sm font-bold ${selectableCardStyles.title(selected)}`}>
            {title}
          </Text>
          {subtitle && (
            <Text className={`mt-0.5 text-xs ${selectableCardStyles.subtitle(selected)}`}>
              {subtitle}
            </Text>
          )}
          {children}
        </View>
      </View>

      <View className="shrink-0 flex-row items-center gap-3">
        {amount && (
          <Text className={`text-sm font-black ${selectableCardStyles.amount(selected)}`}>
            {amount}
          </Text>
        )}
        {showCheckbox && (
          <View
            className={`size-6 items-center justify-center rounded-md border ${selectableCardStyles.checkbox(
              selected,
            )}`}
          >
            {selected && <Check size={14} color="#ffffff" />}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
