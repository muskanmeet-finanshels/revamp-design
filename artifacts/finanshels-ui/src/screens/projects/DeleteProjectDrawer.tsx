'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, AlertTriangle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';
import { DrawerField, DrawerTextarea } from '@/components/ui/drawer-fields';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

/* The linked-project preview represents five current/future projects. */
const LINKED_PROJECT_COUNT = 5;

export interface DeleteProjectItem {
  title:        string;
  dueDate:      string;
  clientName?:  string;
  serviceOpted?: string;
}

interface Props {
  open:      boolean;
  onClose:   () => void;
  projects:  DeleteProjectItem[];
  onConfirm: (reason: string, deleteAll: boolean) => void;
}

function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <span
      onClick={e => { e.preventDefault(); onChange(); }}
      className={cn(
        'flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-[4px] border-[1.5px] cursor-pointer transition-colors',
        checked ? 'bg-red-500 border-red-500' : 'border-gray-300 bg-white',
      )}
    >
      {checked && <Check size={11} className="text-white" strokeWidth={3} />}
    </span>
  );
}

export function DeleteProjectDrawer({ open, onClose, projects, onConfirm }: Props) {
  const [mounted,   setMounted]   = useState(false);
  const [deleteAll, setDeleteAll] = useState(false);
  const [reason,    setReason]    = useState('');

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    if (open) {
      setDeleteAll(false);
      setReason('');
    }
  }, [open]);

  const canConfirm = reason.trim().length > 0;
  const count = projects.length;
  const linkedClient = projects[0]?.clientName ?? projects[0]?.title.split(' – ')[0] ?? 'Selected client';
  const linkedService = projects[0]?.serviceOpted ?? 'Selected service';

  function handleConfirm() {
    if (!canConfirm) return;
    onConfirm(reason, deleteAll);
    onClose();
  }

  const content = (
    <>
      {/* ── Backdrop ── */}
      <div
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/20 transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      />

      {/* ── Panel ── */}
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
              Delete {count === 1 ? 'Project' : 'Projects'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={cn(
              'rounded-lg px-4 py-[7px] text-[13px] font-semibold text-white transition-colors',
              canConfirm ? 'bg-red-500 hover:bg-red-600' : 'bg-red-200 cursor-not-allowed',
            )}
          >
            Delete {count === 1 ? 'Project' : 'Projects'}
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-5 space-y-5">

            {/* Warning banner */}
            <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3.5">
              <AlertTriangle size={17} className="mt-0.5 flex-shrink-0 text-red-500" strokeWidth={2} />
              <div>
                <p className="text-[13.5px] font-semibold text-red-700">
                  This action cannot be undone
                </p>
                <p className="mt-0.5 text-[12.5px] leading-snug text-red-600">
                  All associated tasks and data will be permanently deleted.
                </p>
              </div>
            </div>

            {/* Delete-all checkbox — inline style matching HoldProjectDrawer */}
            <label className="flex cursor-pointer items-center gap-3">
              <Checkbox checked={deleteAll} onChange={() => setDeleteAll(v => !v)} />
              <span className="text-[13.5px] font-medium text-gray-800">
                Also delete ALL current &amp; future projects for this client &amp; service
              </span>
            </label>

            {/* Linked projects table — revealed when checked, same pattern as HoldProjectDrawer */}
            {deleteAll && (
              <div>
                <p className="mb-2 text-[13px] font-semibold text-gray-800">
                  Projects that will also be deleted ({LINKED_PROJECT_COUNT})
                </p>
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-gray-200 bg-gray-50 hover:bg-gray-50">
                        <TableHead className="pl-4 text-[10px] font-semibold uppercase tracking-widest text-gray-700">
                          Client Name
                        </TableHead>
                        <TableHead className="w-[50%] text-[10px] font-semibold uppercase tracking-widest text-gray-700">
                          Service Opted
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from({ length: LINKED_PROJECT_COUNT }, (_, index) => (
                        <TableRow key={`linked-${index}`} className="border-b border-gray-100 hover:bg-gray-50/70 transition-colors">
                          <TableCell className="pl-4 py-3 text-[13px] font-semibold text-gray-900">
                            {linkedClient}
                          </TableCell>
                          <TableCell className="py-3 text-[12.5px] text-gray-700">
                            {linkedService}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Selected project summary */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-gray-500">
                {count} {count === 1 ? 'Project' : 'Projects'} Selected
              </p>
              <div className="max-h-[112px] space-y-2 overflow-y-auto pr-1">
                {projects.map(p => (
                  <div
                    key={`${p.title}-${p.dueDate}`}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"
                  >
                    <span className="min-w-0 truncate text-[13.5px] font-semibold text-gray-900">
                      {p.title}
                    </span>
                    <span className="flex-shrink-0 text-[12px] text-gray-500">
                      Due {p.dueDate}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reason */}
            <DrawerField label="Reason for Deletion" required>
              <DrawerTextarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Explain why these projects are being deleted..."
                rows={5}
              />
            </DrawerField>

          </div>
          <div className="h-4" />
        </div>

      </div>
    </>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}
