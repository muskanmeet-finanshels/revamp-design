'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

/* ── option lists ── */
export const PRIORITY_OPTIONS = [
  { value: 'p0', label: 'P0 — Critical' },
  { value: 'p1', label: 'P1 — High'     },
  { value: 'p2', label: 'P2 — Medium'   },
  { value: 'p3', label: 'P3 — Low'      },
] as const;

export const SEVERITY_OPTIONS = [
  { value: 's1', label: 'S1 — High Severity' },
  { value: 's2', label: 'S2 — Low Severity'  },
] as const;

export type PriorityValue = typeof PRIORITY_OPTIONS[number]['value'] | '';
export type SeverityValue = typeof SEVERITY_OPTIONS[number]['value'] | '';

/* ── props ── */
interface AddTagsDialogProps {
  open:            boolean;
  onClose:         () => void;
  onSave:          (priority: PriorityValue, severity: SeverityValue) => void;
  projectTitle:    string;
  initialPriority: PriorityValue;
  initialSeverity: SeverityValue;
}

export function AddTagsDialog({
  open, onClose, onSave, projectTitle, initialPriority, initialSeverity,
}: AddTagsDialogProps) {
  const [priority, setPriority] = useState<PriorityValue>(initialPriority);
  const [severity, setSeverity] = useState<SeverityValue>(initialSeverity);

  /* Sync local state when the dialog opens with existing values */
  useEffect(() => {
    if (open) {
      setPriority(initialPriority);
      setSeverity(initialSeverity);
    }
  }, [open, initialPriority, initialSeverity]);

  const isEditing = Boolean(initialPriority || initialSeverity);
  // When editing existing tags, allow saving an empty selection to remove them.
  const canSave = isEditing || Boolean(priority || severity);

  function handleSave() {
    onSave(priority, severity);
    onClose();
  }

  function handleCancel() {
    onClose();
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={o => { if (!o) handleCancel(); }}>
      <DialogPrimitive.Portal>

        {/* ── Backdrop ── */}
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/50',
            'data-[state=open]:animate-overlay-enter',
            'data-[state=closed]:animate-overlay-leave',
          )}
        />

        {/* ── Panel — inset-0 + m-auto = true viewport center ── */}
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-0 z-50 m-auto h-fit w-[calc(100vw-3rem)] max-w-[480px]',
            'rounded-2xl bg-white shadow-2xl outline-none',
            'data-[state=open]:animate-dialog-enter',
            'data-[state=closed]:animate-dialog-leave',
          )}
        >
          {/* ── Header ── */}
          <div className="flex items-start justify-between px-5 pt-5">
            <div>
              <DialogPrimitive.Title className="text-[16px] font-semibold text-gray-900">
                {isEditing ? 'Edit Tags' : 'Add Tags'}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-[13px] leading-snug text-gray-500">
                Set optional priority and severity tags for{' '}
                <span className="font-medium text-gray-700">{projectTitle}</span>.
              </DialogPrimitive.Description>
            </div>
            <button
              onClick={handleCancel}
              className="ml-3 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          {/* ── Body ── */}
          <div className="space-y-4 px-5 py-5">

            {/* Priority */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-gray-800">Priority</label>
              {/* Wrapper is relative so the X button can be positioned against it */}
              <div className="relative">
                <Select value={priority} onValueChange={v => setPriority(v as PriorityValue)}>
                  <SelectTrigger
                    className={cn(
                      'h-11 w-full rounded-xl border px-4 text-[13px] transition-colors focus:outline-none focus:ring-0',
                      priority ? 'border-brand text-gray-900 pr-10 [&>svg]:hidden' : 'border-gray-200 text-gray-400',
                      'data-[state=open]:border-brand',
                    )}
                  >
                    <SelectValue placeholder="Select priority..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-gray-100 bg-white shadow-xl">
                    {PRIORITY_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}
                        className="cursor-pointer rounded-lg py-2.5 pl-3 pr-8 text-[13px] text-gray-800 focus:bg-orange-50 focus:text-brand data-[state=checked]:font-medium">
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {priority && (
                  <button
                    type="button"
                    aria-label="Remove priority tag"
                    onPointerDown={e => e.preventDefault()}
                    onClick={e => { e.stopPropagation(); setPriority(''); }}
                    className="absolute right-3 top-0 bottom-0 flex items-center justify-center text-gray-400 hover:text-gray-600"
                  >
                    <X size={15} strokeWidth={2} />
                  </button>
                )}
              </div>
            </div>

            {/* Severity */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-gray-800">Severity</label>
              <div className="relative">
                <Select value={severity} onValueChange={v => setSeverity(v as SeverityValue)}>
                  <SelectTrigger
                    className={cn(
                      'h-11 w-full rounded-xl border px-4 text-[13px] transition-colors focus:outline-none focus:ring-0',
                      severity ? 'border-brand text-gray-900 pr-10 [&>svg]:hidden' : 'border-gray-200 text-gray-400',
                      'data-[state=open]:border-brand',
                    )}
                  >
                    <SelectValue placeholder="Select severity..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-gray-100 bg-white shadow-xl">
                    {SEVERITY_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}
                        className="cursor-pointer rounded-lg py-2.5 pl-3 pr-8 text-[13px] text-gray-800 focus:bg-orange-50 focus:text-brand data-[state=checked]:font-medium">
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {severity && (
                  <button
                    type="button"
                    aria-label="Remove severity tag"
                    onPointerDown={e => e.preventDefault()}
                    onClick={e => { e.stopPropagation(); setSeverity(''); }}
                    className="absolute right-3 top-0 bottom-0 flex items-center justify-center text-gray-400 hover:text-gray-600"
                  >
                    <X size={15} strokeWidth={2} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="grid grid-cols-2 gap-3 border-t border-gray-100 px-5 py-4">
            <button
              type="button"
              onClick={handleCancel}
              className="h-10 rounded-xl border border-gray-200 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className={cn(
                'h-10 rounded-xl text-[13px] font-semibold transition-colors',
                canSave
                  ? 'bg-brand text-white hover:bg-brand-hover'
                  : 'cursor-not-allowed bg-orange-200 text-white',
              )}
            >
              Save
            </button>
          </div>
        </DialogPrimitive.Content>

      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
