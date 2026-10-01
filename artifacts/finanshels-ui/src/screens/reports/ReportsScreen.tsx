'use client';

import { useRef, useState } from 'react';
import {
  ArrowRight, BarChart3, Scale, Clock, Activity, SlidersHorizontal, type LucideIcon,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { InfoTooltip } from '@/components/ui/info-tooltip';

interface ReportItem {
  id: string;
  name: string;
  summary: string;
  icon: LucideIcon;
  purpose: string;
  sources: string[];
}

const STANDARD: ReportItem[] = [
  {
    id: 'pnl', name: 'Profit & loss (P&L)', icon: BarChart3,
    summary: 'Revenue, cost of sales and operating expenses.',
    purpose: 'Shows income and expenses over a chosen period, ending in net profit or loss.',
    sources: ['FinDelivery profit-and-loss data or a published statement', 'Company/entity and reporting period', 'Source version and currency'],
  },
  {
    id: 'balance-sheet', name: 'Balance sheet', icon: Scale,
    summary: 'What the business owns, owes, and is worth.',
    purpose: 'A point-in-time position of assets, liabilities and equity.',
    sources: ['FinDelivery balance-sheet data or a published statement', 'Company/entity and statement as-of date', 'Source version and currency'],
  },
  {
    id: 'ar-ageing', name: 'AR ageing', icon: Clock,
    summary: 'Every open invoice, grouped by how overdue it is.',
    purpose: 'Groups unpaid customer invoices by days past due.',
    sources: ['FinDelivery receivables-ageing report', 'Company/entity and ageing as-of date', 'Invoice and payment detail for supported drill-downs'],
  },
  {
    id: 'cash-flow', name: 'Cash flow', icon: Activity,
    summary: 'Where cash came from, and where it went.',
    purpose: 'Explains movement in cash across operating, investing and financing activity.',
    sources: ['FinDelivery cash-flow data or a published statement', 'Company/entity and reporting period', 'Source version and currency'],
  },
];

const WORKSPACE: ReportItem = {
  id: 'workspace', name: 'Report workspace', icon: SlidersHorizontal,
  summary: 'Slice invoices, customers and payments into a live table.',
  purpose: 'Build custom views of invoice, customer and payment records. The workspace is not available in PMS yet.',
  sources: ['FinDelivery report workspace or a supported reporting API', 'Invoice, customer and payment records', 'Available record fields and reporting periods'],
};

function NotConnected() {
  return (
    <span className="shrink-0 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-600">
      Not connected
    </span>
  );
}

export function ReportsScreen() {
  const [active, setActive] = useState<ReportItem | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  function open(item: ReportItem, el: HTMLElement) {
    triggerRef.current = el;
    setActive(item);
  }

  return (
    <div className="mx-auto w-full max-w-[960px] px-4 py-6 sm:px-6 lg:py-8">
      <div className="flex items-center gap-2">
        <h1 className="text-[22px] font-semibold text-gray-900">Reports</h1>
        <InfoTooltip label="About Reports">
          Financial statements come from FinDelivery, not from project or task progress.
          This directory is not connected yet.
        </InfoTooltip>
      </div>

      <h2 className="mb-3 mt-8 text-[15px] font-semibold text-gray-900">Standard Reports</h2>
      <ul className="grid gap-3 md:grid-cols-2" data-testid="reports-standard">
        {STANDARD.map(item => (
          <li key={item.id}>
            <button
              type="button"
              onClick={e => open(item, e.currentTarget)}
              aria-haspopup="dialog"
              data-testid={`report-card-${item.id}`}
              className="group flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 text-left transition-colors hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-700">
                <item.icon size={16} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[13.5px] font-semibold text-gray-900">{item.name}</span>
                  <NotConnected />
                </span>
                <span className="mt-0.5 block text-[12.5px] text-gray-500">{item.summary}</span>
              </span>
              <ArrowRight size={14} className="shrink-0 text-gray-400" aria-hidden />
              <span className="sr-only">View availability details</span>
            </button>
          </li>
        ))}
      </ul>

      <h2 className="mb-3 mt-8 text-[15px] font-semibold text-gray-900">Build Your Own</h2>
      <div className="flex flex-col gap-3 rounded-lg border border-dashed border-gray-300 bg-white p-4 sm:flex-row sm:items-center">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-700">
          <WORKSPACE.icon size={16} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13.5px] font-semibold text-gray-900">{WORKSPACE.name}</span>
            <NotConnected />
          </div>
          <p className="mt-0.5 text-[12.5px] text-gray-500">{WORKSPACE.summary}</p>
        </div>
        <button
          type="button"
          onClick={e => open(WORKSPACE, e.currentTarget)}
          aria-haspopup="dialog"
          aria-label="View Report workspace availability"
          data-testid="report-card-workspace"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-[13px] font-medium text-gray-800 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          View availability <ArrowRight size={14} aria-hidden />
        </button>
      </div>

      <Dialog open={!!active} onOpenChange={o => { if (!o) setActive(null); }}>
        <DialogContent
          className="max-h-[90vh] max-w-[480px] overflow-y-auto rounded-2xl p-6"
          onCloseAutoFocus={e => { e.preventDefault(); triggerRef.current?.focus(); }}
        >
          {active && (
            <>
              <DialogHeader className="gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                  <active.icon size={20} className="text-brand" aria-hidden />
                </div>
                <DialogTitle className="text-[16px] font-semibold text-gray-900">{active.name}</DialogTitle>
                <DialogDescription className="text-[13.5px] leading-relaxed text-gray-500">
                  {active.purpose}
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-[13px] text-gray-700">
                <p className="font-semibold text-gray-900">Not connected</p>
                <p className="mt-1">
                  This report is not available until FinDelivery is connected. No figures are shown, and
                  nothing is estimated from projects or tasks.
                </p>
              </div>
              <div>
                <p className="text-[12px] font-semibold text-gray-700">Source information</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-[13px] text-gray-600">
                  {active.sources.map(s => <li key={s}>{s}</li>)}
                </ul>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
