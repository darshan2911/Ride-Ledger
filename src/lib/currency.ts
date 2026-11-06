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

export function formatDateFriendly(dateStr: string): string {
  const today = getTodayDateString();
  if (dateStr === today)
    return 'Today';

  const d = new Date(`${dateStr}T00:00:00`);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(
    yesterday.getDate(),
  ).padStart(2, '0')}`;

  if (dateStr === yesterdayStr)
    return 'Yesterday';

  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}

export function formatDateFull(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
