'use client';

import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row gap-4',
        month: 'relative space-y-4',
        month_caption: 'flex h-9 items-center justify-center px-1',
        caption_label: 'text-center text-sm font-semibold leading-5 text-gray-900',
        nav: 'hidden',
        button_previous: cn(
          'absolute left-0 top-1.5 z-10 inline-flex h-6 w-6 items-center justify-center',
          'border-0 bg-transparent p-0 text-gray-700',
          'hover:text-gray-900 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-brand/30',
        ),
        button_next: cn(
          'absolute right-0 top-1.5 z-10 inline-flex h-6 w-6 items-center justify-center',
          'border-0 bg-transparent p-0 text-gray-700',
          'hover:text-gray-900 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-brand/30',
        ),
        month_grid: 'w-full border-collapse space-y-1',
        weekdays: 'flex',
        weekday: 'w-9 rounded-md text-[10px] font-medium uppercase text-gray-400',
        week: 'mt-1 flex w-full',
        day: 'relative h-9 w-9 p-0 text-center text-sm',
        day_button: cn(
          'h-9 w-9 rounded-md p-0 font-normal text-gray-700',
          'hover:bg-orange-50 hover:text-brand focus:outline-none focus:ring-1 focus:ring-brand/30',
        ),
        selected: '[&>button]:bg-brand [&>button]:font-semibold [&>button]:text-white [&>button]:hover:bg-brand',
        today: '[&>button]:font-bold [&>button]:text-brand',
        outside: '[&>button]:text-gray-300',
        disabled: '[&>button]:cursor-not-allowed [&>button]:text-gray-300 [&>button]:line-through',
        hidden: 'invisible',
        ...classNames,
      }}
      navLayout="around"
      components={{
        Chevron: ({ orientation }) =>
          orientation === 'left'
            ? <ChevronLeft className="h-4 w-4 stroke-[1.8]" />
            : <ChevronRight className="h-4 w-4 stroke-[1.8]" />,
      }}
      {...props}
    />
  );
}

Calendar.displayName = 'Calendar';

export { Calendar };