'use client';

/**
 * Drawer field primitives — single source of truth for input styling
 * across all side drawers (Filter, Hold, Reassign, EditDeadline).
 *
 * Token:
 *   rounded-xl border border-gray-200 bg-white
 *   text-[13px] text-gray-800
 *   focus:border-brand focus:ring-1 focus:ring-brand/20
 */

import * as React from 'react';
import { ChevronDown as _ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const ChevronDown = _ChevronDown as unknown as React.FC<any>;

/* ── Label ────────────────────────────────────────────────────────────────── */

export function DrawerLabel({
  children,
  required,
  className,
}: {
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <p className={cn('text-[10.5px] font-semibold uppercase tracking-widest text-gray-500', className)}>
      {children}
      {required && <span className="ml-1 normal-case text-[11px] text-red-500">*</span>}
    </p>
  );
}

/* ── Input ────────────────────────────────────────────────────────────────── */

export const DrawerInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<'input'>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'h-11 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-[13px] text-gray-800',
      'placeholder:text-gray-400',
      'focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20',
      'transition disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
DrawerInput.displayName = 'DrawerInput';

/* ── Textarea ─────────────────────────────────────────────────────────────── */

export const DrawerTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<'textarea'>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'w-full resize-none rounded-xl border border-gray-200 bg-white px-3.5 py-3',
      'text-[13px] text-gray-800 placeholder:text-gray-400',
      'focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20',
      'transition disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
DrawerTextarea.displayName = 'DrawerTextarea';

/* ── Select ───────────────────────────────────────────────────────────────── */

export const DrawerSelect = React.forwardRef<
  HTMLSelectElement,
  React.ComponentProps<'select'>
>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(
        'h-11 w-full appearance-none rounded-xl border border-gray-200 bg-white pl-3.5 pr-9',
        'text-[13px] text-gray-800',
        'focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20',
        'transition disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown
      size={14}
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
    />
  </div>
));
DrawerSelect.displayName = 'DrawerSelect';

/* ── Field wrapper (label + control + optional hint) ─────────────────────── */

export function DrawerField({
  label,
  required,
  hint,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <DrawerLabel required={required}>{label}</DrawerLabel>
      {children}
      {hint && <p className="text-[12px] text-gray-400">{hint}</p>}
    </div>
  );
}
