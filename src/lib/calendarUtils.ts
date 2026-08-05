import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';

export const WEEK_STARTS_ON = 1 as const; // Monday

/** All days shown in a month grid, including the leading/trailing days that fill out full weeks. */
export function getMonthGrid(anchor: Date): Date[] {
  const gridStart = startOfWeek(startOfMonth(anchor), { weekStartsOn: WEEK_STARTS_ON });
  const gridEnd = endOfWeek(endOfMonth(anchor), { weekStartsOn: WEEK_STARTS_ON });
  return eachDayOfInterval({ start: gridStart, end: gridEnd });
}

export function getWeekDays(anchor: Date): Date[] {
  const weekStart = startOfWeek(anchor, { weekStartsOn: WEEK_STARTS_ON });
  const weekEnd = endOfWeek(anchor, { weekStartsOn: WEEK_STARTS_ON });
  return eachDayOfInterval({ start: weekStart, end: weekEnd });
}

/** Matches the yyyy-MM-dd format transactions and <input type="date"> both use. */
export function dateKey(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function shiftAnchor(anchor: Date, mode: 'month' | 'week', direction: 1 | -1): Date {
  if (mode === 'month') {
    return direction === 1 ? addMonths(anchor, 1) : subMonths(anchor, 1);
  }
  return direction === 1 ? addWeeks(anchor, 1) : subWeeks(anchor, 1);
}

export { isSameDay, isSameMonth, isToday, format, startOfWeek, endOfWeek };
