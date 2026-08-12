'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, AlertTriangle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { DrawerField, DrawerTextarea } from '@/components/ui/drawer-fields';

/* ── Mock recurring projects ── */
const RECURRING_PROJECTS = [
  { id: 'r1', name: 'Monthly Payroll – Stratos',  dueDate: '2026-08-31', status: 'Active' },
  { id: 'r2', name: 'Quarterly VAT – Nexora',     dueDate: '2026-09-30', status: 'Active' },
  { id: 'r3', name: 'Annual Audit – Finovo',      dueDate: '2026-12-31', status: 'Active' },
  { id: 'r4', name: 'Corporate Tax – Lumo',       dueDate: '2026-12-31', status: 'Active' },
];

/* ── Same checkbox style as FilterDrawer ── */
function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <span
      onClick={e => { e.preventDefault(); onChange(); }}
      className={cn(
        'flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-[4px] border-[1.5px] cursor-pointer transition-colors',
        checked ? 'bg-brand border-brand' : 'border-gray-300 bg-white',
      )}
    >
      {checked && <Check size={11} className="text-white" strokeWidth={3} />}
    </span>
  );
}

interface Props {
  open:      boolean;
  onClose:   () => void;
  count:     number;
  onConfirm: (reason: string, includeRecurring: boolean) => void;
  mode?:     'hold' | 'resume';
}

export function HoldProjectDrawer({
  open,
  onClose,
  count,
  onConfirm,
  mode = 'hold',
}: Props) {
  const [mounted,          setMounted]          = useState(false);
  const [includeRecurring, setIncludeRecurring] = useState(false);
  const [reason,           setReason]           = useState('');
  const isResume = mode === 'resume';

  useEffect(() => { setMounted(true); }, []);

  /* lock body scroll while drawer is open — same as FilterDrawer */
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  function handleConfirm() {
    onConfirm(reason, includeRecurring);
    setReason('');
    setIncludeRecurring(false);
    onClose();
  }

  const content = (
    <>
      {/* ── Backdrop (same opacity/z as FilterDrawer) ── */}
      <div
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/20 transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      />

      {/* ── Panel (same dimensions, shadow & transition as FilterDrawer) ── */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-2xl transition-transform duration-300 ease-out sm:w-[36rem]',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >

        {/* ── Header ── */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-5 py-[14px]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={17} />
            </button>
            <span className="text-[15px] font-semibold text-gray-900">
              {isResume ? 'Resume Project' : 'Hold Project'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!reason.trim()}
            className={cn(
              'rounded-lg px-4 py-[7px] text-[13px] font-semibold text-white transition-colors',
              reason.trim()
                ? 'bg-brand hover:bg-brand-hover'
                : 'bg-orange-200 cursor-not-allowed',
            )}
          >
            Confirm Now
          </button>
        </div>

        {/* ── Body (scrollable) ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-5 space-y-5">

            {/* Info banner */}
            <div className={cn(
              'flex gap-3 rounded-lg px-4 py-3.5',
              isResume
                ? 'border border-emerald-200 bg-emerald-50'
                : 'border border-amber-200 bg-amber-50',
            )}>
              <AlertTriangle
                size={17}
                className={cn(
                  'mt-0.5 flex-shrink-0',
                  isResume ? 'text-emerald-500' : 'text-amber-500',
                )}
                strokeWidth={2}
              />
              <div>
                <p className={cn(
                  'text-[13.5px] font-semibold',
                  isResume ? 'text-emerald-700' : 'text-amber-700',
                )}>
                  {count} {count === 1 ? 'Project' : 'Projects'} Selected
                </p>
                <p className={cn(
                  'mt-0.5 text-[12.5px] leading-snug',
                  isResume ? 'text-emerald-600' : 'text-amber-600',
                )}>
                  {isResume
                    ? 'Resuming project will reactivate all work and tasks associated with it.'
                    : 'Putting project on hold will pause all work and tasks associated with it.'}
                </p>
              </div>
            </div>

            {/* Include recurring — square checkbox */}
            <label className="flex cursor-pointer items-center gap-3">
              <Checkbox
                checked={includeRecurring}
                onChange={() => setIncludeRecurring(v => !v)}
              />
              <span className="text-[13.5px] font-medium text-gray-800">
                Include all recurring projects
              </span>
            </label>

            {/* Affected recurring projects — only when toggled */}
            {includeRecurring && (
              <div>
                  <p className="mb-2 text-[13px] font-semibold text-gray-800">
                    Recurring projects that will also be {isResume ? 'resumed' : 'put on hold'} ({RECURRING_PROJECTS.length})
                </p>
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-gray-200 bg-gray-50 hover:bg-gray-50">
                        <TableHead className="pl-4 text-[10px] font-semibold uppercase tracking-widest text-gray-700">
                          Project Name
                        </TableHead>
                        <TableHead className="w-[110px] text-[10px] font-semibold uppercase tracking-widest text-gray-700">
                          Due Date
                        </TableHead>
                        <TableHead className="w-[110px] text-[10px] font-semibold uppercase tracking-widest text-gray-700">
                          Status
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {RECURRING_PROJECTS.map(r => (
                        <TableRow key={r.id} className="border-b border-gray-100 hover:bg-gray-50/70 transition-colors">
                          <TableCell className="pl-4 py-3 text-[13px] font-semibold text-gray-900">
                            {r.name}
                          </TableCell>
                          <TableCell className="py-3 text-[12.5px] text-gray-700">
                            {r.dueDate}
                          </TableCell>
                          <TableCell className="py-3">
                              <span className="inline-block whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-[3px] text-[12px] font-medium text-emerald-700">
                              {isResume ? 'On Hold' : r.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Reason */}
            <DrawerField label={isResume ? 'Reason for Resume' : 'Reason for Hold'} required>
              <DrawerTextarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder={
                  isResume
                    ? 'Describe why the project(s) are being resumed...'
                    : 'Describe why the project(s) are being put on hold...'
                }
                rows={5}
              />
            </DrawerField>

          </div>
          {/* bottom breathing room */}
          <div className="h-4" />
        </div>

      </div>
    </>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}
