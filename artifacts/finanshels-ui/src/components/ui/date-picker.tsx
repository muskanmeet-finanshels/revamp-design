'use client';

import * as React from 'react';
import { format, isValid, parseISO, startOfDay } from 'date-fns';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface DatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function parseDate(value?: string) {
  if (!value) return undefined;
  const date = parseISO(value);
  return isValid(date) ? date : undefined;
}

function DatePicker({
  value = '',
  onChange,
  min,
  max,
  placeholder = 'Select date',
  disabled = false,
  className,
}: DatePickerProps) {
  const selectedDate = parseDate(value);
  const minDate = parseDate(min);
  const maxDate = parseDate(max);
  const [open, setOpen] = React.useState(false);
  const [month, setMonth] = React.useState(selectedDate ?? minDate ?? new Date());

  React.useEffect(() => {
    if (open) setMonth(selectedDate ?? minDate ?? new Date());
  }, [open, value, min]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'h-11 w-full justify-between rounded-xl border-gray-200 bg-white px-3.5',
            'text-[13px] font-normal text-gray-800 shadow-none hover:border-gray-300 hover:bg-white',
            'focus:border-brand focus:ring-1 focus:ring-brand/20',
            !selectedDate ? 'text-gray-400 hover:text-gray-400' : 'text-gray-800 hover:text-gray-800',
            className,
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <CalendarDays size={14} className="flex-shrink-0 text-gray-400" />
            <span className="truncate">
              {selectedDate ? format(selectedDate, 'dd MMM yyyy') : placeholder}
            </span>
          </span>
          <ChevronDown size={14} className="flex-shrink-0 text-gray-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={date => {
            if (!date) return;
            onChange(format(date, 'yyyy-MM-dd'));
            setOpen(false);
          }}
          month={month}
          onMonthChange={setMonth}
          disabled={date => (
            (minDate ? startOfDay(date) < startOfDay(minDate) : false) ||
            (maxDate ? startOfDay(date) > startOfDay(maxDate) : false)
          )}
        />
        {selectedDate && (
          <div className="border-t border-gray-100 px-3 pb-3">
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); }}
              className="w-full rounded-md py-1.5 text-[12px] font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-800"
            >
              Clear date
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export { DatePicker };