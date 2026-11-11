/**
 * Financial calculation and currency formatting utilities
 * Integer paise representation: ₹1.00 = 100 paise
 */

export function formatPaise(paise: number, symbol = '₹'): string {
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = Math.floor(absPaise / 100);
  const remainder = absPaise % 100;

  let formatted = '';
  if (remainder === 0) {
    formatted = `${symbol}${rupees.toLocaleString('en-IN')}`;
  }
  else {
    const fraction = remainder.toString().padStart(2, '0');
    formatted = `${symbol}${rupees.toLocaleString('en-IN')}.${fraction}`;
  }

  return isNegative ? `-${formatted}` : formatted;
}

export function paiseToRupees(paise: number): number {
  return Number((paise / 100).toFixed(2));
}

export function rupeesToPaise(rupees: number | string): number {
  const num = typeof rupees === 'string' ? Number.parseFloat(rupees) : rupees;
  if (Number.isNaN(num) || num < 0)
    return 0;
  return Math.round(num * 100);
}

export function getTodayDateString(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function getYesterdayDateString(): string {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yyyy = y.getFullYear();
  const mm = String(y.getMonth() + 1).padStart(2, '0');
  const dd = String(y.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Formats a date string (YYYY-MM-DD) into:
 * "Wed, Nov 11, 2026"
 */
export function formatDateWithDay(dateStr: string): string {
  if (!dateStr)
    return '';
  const [yyyy, mm, dd] = dateStr.split('-').map(Number);
  const d = new Date(yyyy, mm - 1, dd);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Formats a date string (YYYY-MM-DD) into compact day + date:
 * "Wed, Nov 11"
 */
export function formatDateShortWithDay(dateStr: string): string {
  if (!dateStr)
    return '';
  const [yyyy, mm, dd] = dateStr.split('-').map(Number);
  const d = new Date(yyyy, mm - 1, dd);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateFriendly(dateStr: string): string {
  const today = getTodayDateString();
  if (dateStr === today)
    return 'Today';

  const yesterday = getYesterdayDateString();
  if (dateStr === yesterday)
    return 'Yesterday';

  return formatDateWithDay(dateStr);
}

export function formatDateFull(dateStr: string): string {
  return formatDateWithDay(dateStr);
}
