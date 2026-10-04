export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
] as const;

export const MONTH_SHORT_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
] as const;

/**
 * Format date to "12 May 2003" style
 */
export function formatDateDisplay(dateInput?: string | Date | null): string {
  if (!dateInput) return '—';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) {
      // If it's a string like YYYY-MM-DD
      if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
        const [year, month, day] = dateInput.split('-');
        const monthIdx = parseInt(month, 10) - 1;
        const monthName = MONTH_NAMES[monthIdx] || month;
        return `${parseInt(day, 10)} ${monthName} ${year}`;
      }
      return String(dateInput);
    }
    const day = d.getUTCDate();
    const month = MONTH_NAMES[d.getUTCMonth()];
    const year = d.getUTCFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return String(dateInput);
  }
}

/**
 * Parse YYYY-MM-DD into { day: string, month: string, year: string }
 */
export function parseDateParts(dateString?: string): { day: string; month: string; year: string } {
  if (!dateString) return { day: '', month: '', year: '' };
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const month = MONTH_NAMES[monthIndex] || '';
    const day = String(parseInt(parts[2], 10));
    return { day, month, year };
  }
  return { day: '', month: '', year: '' };
}

/**
 * Build YYYY-MM-DD from { day, month, year }
 */
export function buildIsoDate(day: string | number, month: string, year: string | number): string {
  const d = String(day).padStart(2, '0');
  const monthIdx = MONTH_NAMES.indexOf(month as any);
  if (monthIdx === -1) return '';
  const m = String(monthIdx + 1).padStart(2, '0');
  const y = String(year);
  return `${y}-${m}-${d}`;
}

/**
 * Format number into Indian Rupee style "₹2,40,000"
 */
export function formatIndianCurrency(amount?: number | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  const rounded = Math.round(amount);
  return '₹' + rounded.toLocaleString('en-IN');
}

/**
 * Format marks with % suffix e.g. "84.5%"
 */
export function formatMarks(marks?: number | null): string {
  if (marks === undefined || marks === null || isNaN(marks)) return '—';
  // At most one decimal place
  const rounded = Math.round(marks * 10) / 10;
  return `${rounded}%`;
}

/**
 * Mask ID number to "Aadhaar ending 4521" or "ID ending 4521"
 */
export function maskIdNumber(idLast4?: string | null, label: string = 'ID'): string {
  if (!idLast4) return '—';
  const clean = String(idLast4).trim();
  const last4 = clean.length > 4 ? clean.slice(-4) : clean;
  return `${label} ending ${last4}`;
}
