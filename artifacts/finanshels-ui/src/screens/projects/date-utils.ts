import type { Project } from './mock-data';

/** Parses "Due DD MMM YYYY" → Date at midnight. Returns null if unparseable. */
export function parseDueDate(dateStr: string): Date | null {
  const m = dateStr.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
  if (!m) return null;
  const d = new Date(`${m[2]} ${m[1]}, ${m[3]}`);
  return isNaN(d.getTime()) ? null : d;
}

/** Signed day difference — positive means `to` is after `from`. */
export function dayDiff(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n !== 1 ? 's' : ''}`;
}

export interface DateIndicator {
  text: string;
  /** Tailwind text-colour class */
  cls:  string;
  /** Tailwind background class for pill usage */
  bg:   string;
}

export function getDateIndicator(project: Project): DateIndicator | null {
  const { status } = project;
  if (status === 'On Hold' || status === 'Archived') return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = parseDueDate(project.dueDate);
  if (!due) return null;
  due.setHours(0, 0, 0, 0);

  if (status === 'Overdue') {
    const days = Math.max(dayDiff(due, today), 1);
    return { text: `${plural(days, 'day')} overdue`, cls: 'text-red-500',     bg: 'bg-red-50'     };
  }

  if (status === 'Current') {
    const days = dayDiff(today, due); // positive = future
    if (days === 0) return { text: 'Due today',                         cls: 'text-orange-500',  bg: 'bg-orange-50'  };
    if (days  > 0) return  { text: `Due in ${plural(days, 'day')}`,     cls: 'text-emerald-600', bg: 'bg-emerald-50' };
    const n = Math.abs(days);
    return                  { text: `${plural(n, 'day')} overdue`,       cls: 'text-orange-500',  bg: 'bg-orange-50'  };
  }

  if (status === 'Completed' && project.completedDate) {
    const completed = new Date(project.completedDate);
    completed.setHours(0, 0, 0, 0);
    const delay = dayDiff(due, completed);
    if (delay > 0) return { text: `Delayed by ${plural(delay, 'day')}`, cls: 'text-amber-600',   bg: 'bg-amber-50'   };
  }

  return null;
}
