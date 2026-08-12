'use client';

import React, { useState } from 'react';
import { X, BookText, Briefcase } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';
import { ClientAdHocDrawer } from './ClientAdHocDrawer';
import { NonClientAdHocDrawer } from './NonClientAdHocDrawer';

interface AdHocTaskDialogProps {
  open:    boolean;
  onClose: () => void;
}

export function AdHocTaskDialog({ open, onClose }: AdHocTaskDialogProps) {
  const [clientDrawerOpen,    setClientDrawerOpen]    = useState(false);
  const [nonClientDrawerOpen, setNonClientDrawerOpen] = useState(false);

  function handleClientRelated() {
    onClose();
    setClientDrawerOpen(true);
  }

  function handleNonClientRelated() {
    onClose();
    setNonClientDrawerOpen(true);
  }

  return (
    <React.Fragment>
      <ClientAdHocDrawer
        open={clientDrawerOpen}
        onClose={() => setClientDrawerOpen(false)}
      />
      <NonClientAdHocDrawer
        open={nonClientDrawerOpen}
        onClose={() => setNonClientDrawerOpen(false)}
      />

      <DialogPrimitive.Root open={open} onOpenChange={o => { if (!o) onClose(); }}>
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
                  Add Ad-hoc Task
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="mt-1 text-[13px] leading-snug text-gray-500">
                  Is this task related to a client project, or is it internal non-client work?
                </DialogPrimitive.Description>
              </div>
              <button
                onClick={onClose}
                className="ml-3 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            {/* ── Body ── */}
            <div className="space-y-3 px-5 py-5">

              {/* Client Related */}
              <button
                type="button"
                onClick={handleClientRelated}
                className="flex w-full items-start gap-3.5 rounded-xl border border-gray-200 p-4 text-left transition-colors hover:border-brand/40 hover:bg-orange-50/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-brand">
                  <BookText size={16} />
                </span>
                <div>
                  <p className="text-[13px] font-semibold text-gray-900">Client Related</p>
                  <p className="mt-0.5 text-[12.5px] text-gray-500">
                    Create an ad-hoc task on a client project (existing flow)
                  </p>
                </div>
              </button>

              {/* Non-Client Related */}
              <button
                type="button"
                onClick={handleNonClientRelated}
                className="flex w-full items-start gap-3.5 rounded-xl border border-gray-200 p-4 text-left transition-colors hover:border-brand/40 hover:bg-orange-50/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                  <Briefcase size={16} />
                </span>
                <div>
                  <p className="text-[13px] font-semibold text-gray-900">Non-Client Related</p>
                  <p className="mt-0.5 text-[12.5px] text-gray-500">
                    Meetings, training, documentation, process improvements
                  </p>
                </div>
              </button>

            </div>
          </DialogPrimitive.Content>

        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </React.Fragment>
  );
}
