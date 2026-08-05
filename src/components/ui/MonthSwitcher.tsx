import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatMonthLabel, shiftMonthKey } from '../../lib/format';

interface MonthSwitcherProps {
  monthKey: string;
  onChange: (monthKey: string) => void;
}

export function MonthSwitcher({ monthKey, onChange }: MonthSwitcherProps) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
      <button
        onClick={() => onChange(shiftMonthKey(monthKey, -1))}
        className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
        aria-label="Previous month"
      >
        <ChevronLeft size={18} />
      </button>
      <span className="min-w-[10ch] text-center text-sm font-medium text-slate-700 dark:text-slate-200">
        {formatMonthLabel(monthKey)}
      </span>
      <button
        onClick={() => onChange(shiftMonthKey(monthKey, 1))}
        className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
        aria-label="Next month"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
