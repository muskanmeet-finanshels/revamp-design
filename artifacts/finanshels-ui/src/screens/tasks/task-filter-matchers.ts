import { getProjectDisplayName } from '../projects/mock-data.ts';
import type { TaskItem } from './mock-data';

export function includesSelectedValue(values: string[], candidates: string[]): boolean {
  if (values.length === 0) return true;
  return values.some(value => candidates.some(candidate => {
    const selected = value.toLowerCase();
    const current = candidate.toLowerCase();
    return current.includes(selected) || selected.includes(current);
  }));
}

function taskText(task: TaskItem): string {
  return `${task.name} ${task.projects.map(getProjectDisplayName).join(' ')}`.toLowerCase();
}

export function matchesTaskFrequency(task: TaskItem, frequency: string): boolean {
  const text = taskText(task);
  switch (frequency) {
    case 'One-time':
      return /registration|renewal|onboarding|valuation|disclosure|engagement/.test(text);
    case 'Weekly':
      return false;
    case 'Monthly':
      return /monthly|month|payroll|book ?keeping|management accounts|wps/.test(text);
    case 'Quarterly':
      return /\bq[1-4]\b|quarter/.test(text);
    case 'Annually':
      return /annual|year-end|year end|\bfy\b|yearly/.test(text);
    default:
      return false;
  }
}

export function matchesTaskService(task: TaskItem, service: string): boolean {
  const text = taskText(task);
  const patterns: Record<string, RegExp> = {
    Accounting: /book ?keeping|payroll|reconcil|financial statement|invoice|vat|tax return/,
    Finance: /forecast|budget|valuation|financial|bank statement|reconcil/,
    IT: /\bit\b|technology|portal|system|software/,
    Technology: /technology|portal|system|software/,
    HR: /payroll|employee|benefit|onboarding/,
    Compliance: /compliance|regulatory|wps|control|disclosure/,
    Audit: /audit|evidence|workpaper/,
  };
  return patterns[service]?.test(text) ?? false;
}

export function matchesTaskTag(task: TaskItem, tag: string): boolean {
  const text = taskText(task);
  const patterns: Record<string, RegExp> = {
    'Tax Filing': /tax|vat/,
    Bookkeeping: /book ?keeping|reconcil/,
    Registration: /registration|renewal|onboarding/,
    Payroll: /payroll|wps/,
    Audit: /audit|evidence|workpaper/,
    Compliance: /compliance|regulatory|control|disclosure/,
    HR: /employee|benefit|onboarding/,
  };
  return patterns[tag]?.test(text) ?? false;
}