'use client';

import {
  useState, useEffect, useRef, useLayoutEffect,
} from 'react';
import {
  ArrowLeft, Search, Check, ChevronDown, ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { getProjectDisplayName } from '@/screens/projects/mock-data';

/* ── Mock data ─────────────────────────────────────────────────────────── */

const CLIENTS = ['Nexora', 'Finovo', 'Lumo', 'Stratco', 'Talvo', 'Orvix'];

const PROJECTS_BY_CLIENT: Record<string, Array<{ id: string; label: string; frequency: string }>> = {
  Nexora:  [
    { id: 'n1', label: 'VAT Filing Jul 2025 – Sep 2025',      frequency: 'Quarterly'   },
    { id: 'n2', label: 'Annual Audit – FY 2025',               frequency: 'Annual'      },
    { id: 'n3', label: 'Corporate Tax Return – Q1 2026',       frequency: 'Quarterly'   },
  ],
  Finovo:  [
    { id: 'f1', label: 'Book Keeping – Sep 2025',              frequency: 'Monthly'     },
    { id: 'f2', label: 'Book Keeping – Oct 2025',              frequency: 'Monthly'     },
    { id: 'f3', label: 'VAT Compliance – Jan 2026',            frequency: 'Quarterly'   },
    { id: 'f4', label: 'Internal Controls Review – Q3',        frequency: 'Annual'      },
    { id: 'f5', label: 'VAT Reconciliation – Q1 2026',         frequency: 'Quarterly'   },
  ],
  Lumo:    [
    { id: 'l1', label: 'CT Registration – June 2026',          frequency: 'One-time'    },
    { id: 'l2', label: 'Financial Statements – Mar 2026',      frequency: 'Annual'      },
    { id: 'l3', label: 'Year-End Audit 2026 – Lumo',           frequency: 'Annual'      },
    { id: 'l4', label: 'Financial Forecast – H2 2026',         frequency: 'Semi-Annual' },
  ],
  Stratco: [
    { id: 's1', label: 'Payroll Management – Q4 2025',         frequency: 'Monthly'     },
    { id: 's2', label: 'Corporate Tax Registration – FY 2026', frequency: 'Annual'      },
    { id: 's3', label: 'Corporate Tax Advisory – Q3',          frequency: 'Quarterly'   },
    { id: 's4', label: 'Payroll Reconciliation – Q2',          frequency: 'Monthly'     },
  ],
  Talvo:   [
    { id: 't1', label: 'VAT Registration – Talvo',             frequency: 'One-time'    },
    { id: 't2', label: 'WPS Compliance Check – July',          frequency: 'Monthly'     },
  ],
  Orvix:   [
    { id: 'o1', label: 'Regulatory Filing – Orvix Q3',         frequency: 'Quarterly'   },
  ],
};

const ASSIGNEES = [
  'Mohammed Khan', 'Tariq Ibrahim', 'Ali Tariq',   'Tina Patel',
  'Sarah Nasser',  'Nadia Saleh',   'Priya Nair',  'Qasim Ahmed',
  'Yousef Mansour','Thomas Wright', 'Bilal Ebrahim','Grace Hassan',
  'Elena Flores',  'Omar Mansour',  'Karen Simmons',
];

const FREQUENCIES = ['Monthly', 'Quarterly', 'Semi-Annual', 'Annual', 'One-time'];

/* ── SearchSingleSelect — trigger + portal panel with search ────────────── */

function SearchSingleSelect({
  label,
  required,
  placeholder,
  options,
  value,
  onChange,
  disabled = false,
  drawerOpen,
}: {
  label:      string;
  required?:  boolean;
  placeholder:string;
  options:    string[];
  value:      string;
  onChange:   (v: string) => void;
  disabled?:  boolean;
  drawerOpen: boolean;
}) {
  const [open,       setOpen]       = useState(false);
  const [query,      setQuery]      = useState('');
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const triggerRef  = useRef<HTMLButtonElement>(null);
  const panelRef    = useRef<HTMLDivElement>(null);
  const searchRef   = useRef<HTMLInputElement>(null);

  /* close when drawer closes */
  useEffect(() => { if (!drawerOpen) setOpen(false); }, [drawerOpen]);

  /* position panel below trigger */
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setPanelStyle({ top: r.bottom + 4, left: r.left, width: r.width, zIndex: 9999 });
  }, [open]);

  /* focus search on open */
  useEffect(() => {
    if (open) { setQuery(''); setTimeout(() => searchRef.current?.focus(), 50); }
  }, [open]);

  /* click-outside to close */
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      const t = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(t) &&
        panelRef.current   && !panelRef.current.contains(t)
      ) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const visible = options.filter(o => o.toLowerCase().includes(query.toLowerCase()));
  const hasValue = Boolean(value);

  const panel = open ? (
    <div
      ref={panelRef}
      style={{ position: 'fixed', ...panelStyle }}
      className="overflow-hidden overscroll-contain rounded-xl border border-gray-100 bg-white shadow-xl"
    >
      {/* Search */}
      <div className="p-2 pb-1.5">
        <div className="flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3">
          <Search size={13} className="flex-shrink-0 text-gray-400" />
          <input
            ref={searchRef}
            type="text"
            placeholder={`Search ${label.toLowerCase()}...`}
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[13px] text-gray-800 placeholder:text-gray-400 outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="flex h-4 w-4 items-center justify-center rounded bg-gray-200 text-[10px] text-gray-600 hover:bg-gray-300 transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Options */}
      <ul className="max-h-[220px] overflow-y-auto p-2 pt-1">
        {visible.length > 0
          ? visible.map(opt => {
              const isSel = value === opt;
              return (
                <li key={opt}>
                  <button
                    type="button"
                    onClick={() => { onChange(opt); setOpen(false); setQuery(''); }}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] transition-colors',
                      isSel ? 'bg-orange-50 font-medium text-brand' : 'text-gray-800 hover:bg-gray-100',
                    )}
                  >
                    {opt}
                    {isSel && <Check size={13} className="flex-shrink-0 text-brand" strokeWidth={2.5} />}
                  </button>
                </li>
              );
            })
          : <li className="px-3 py-3 text-center text-[12px] text-gray-400">No results</li>
        }
      </ul>

      {/* Clear */}
      {hasValue && (
        <>
          <div className="border-t border-gray-100" />
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false); setQuery(''); }}
            className="w-full px-3 py-2.5 text-left text-[13px] font-medium text-brand hover:bg-orange-50/40 transition-colors"
          >
            Clear selection
          </button>
        </>
      )}
    </div>
  ) : null;

  return (
    <div>
      <p className="mb-1.5 text-[13px] font-medium text-gray-900">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </p>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) setOpen(v => !v); }}
        className={cn(
          'flex h-11 w-full items-center justify-between rounded-xl border bg-white px-4 text-[13px] transition-colors focus:outline-none',
          disabled
            ? 'border-gray-100 bg-gray-50 cursor-not-allowed'
            : open || hasValue
              ? 'border-brand'
              : 'border-gray-200 hover:border-gray-300',
        )}
      >
        <span className={cn(
          'truncate text-left',
          disabled ? 'text-gray-300' : hasValue ? 'text-gray-900' : 'text-gray-400',
        )}>
          {hasValue ? value : placeholder}
        </span>
        {open
          ? <ChevronUp   size={15} className={cn('flex-shrink-0', disabled ? 'text-gray-300' : 'text-gray-500')} />
          : <ChevronDown size={15} className={cn('flex-shrink-0', disabled ? 'text-gray-200' : 'text-gray-400')} />}
      </button>
      {typeof document !== 'undefined' && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}

/* ── Radio ────────────────────────────────────────────────────────────── */

function Radio({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2" onClick={onChange}>
      <span className={cn(
        'flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors',
        checked ? 'border-brand' : 'border-gray-300',
      )}>
        {checked && <span className="h-2.5 w-2.5 rounded-full bg-brand" />}
      </span>
      <span className="text-[13px] font-medium text-gray-800">{label}</span>
    </label>
  );
}

/* ── Field row ────────────────────────────────────────────────────────── */

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[13px] font-medium text-gray-900">
        {label}{required && <span className="ml-1 text-red-500">*</span>}
      </p>
      {children}
    </div>
  );
}

/* ── Main drawer ──────────────────────────────────────────────────────── */

interface Props { open: boolean; onClose: () => void }

export function ClientAdHocDrawer({ open, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  /* Step 1 */
  const [step,     setStep]     = useState<1 | 2>(1);
  const [appType,  setAppType]  = useState<'one-time' | 'recurring'>('one-time');
  const [client,   setClient]   = useState('');
  const [project,  setProject]  = useState('');
  const [assignee, setAssignee] = useState('');

  /* Step 2 */
  const [taskName,   setTaskName]   = useState('');
  const [taskType,   setTaskType]   = useState<'mandatory' | 'optional'>('optional');
  const [frequency,  setFrequency]  = useState('');
  const [measurable, setMeasurable] = useState<'yes' | 'no'>('no');

  useEffect(() => {
    if (open) {
      setStep(1); setAppType('one-time');
      setClient(''); setProject(''); setAssignee('');
      setTaskName(''); setTaskType('optional'); setFrequency(''); setMeasurable('no');
    }
  }, [open]);

  useEffect(() => { setProject(''); setAssignee(''); }, [client]);
  useEffect(() => { setAssignee(''); }, [project]);

  const projectsForClient = client ? (PROJECTS_BY_CLIENT[client] ?? []) : [];
  const getProjectLabel = (item: { label: string }) =>
    getProjectDisplayName({ title: item.label, clientName: client });
  const selectedProject   = projectsForClient.find(p => getProjectLabel(p) === project);

  const step1Complete = Boolean(client && project && assignee);
  const step2Complete = Boolean(taskName.trim() && frequency);
  const canCreate     = step1Complete && step2Complete;

  function handleCreate() {
    toast.success(`Ad-hoc task "${taskName}" created`);
    onClose();
  }

  if (!mounted) return null;

  const content = (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/20 transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-2xl transition-transform duration-300 ease-out sm:w-[36rem]',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* ── Header ── matches ChangeTaskStatusDrawer exactly */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-5 py-[14px]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100"
            >
              <ArrowLeft size={17} />
            </button>
            <div>
              <span className="block text-[15px] font-semibold text-gray-900">Add Ad-hoc Task</span>
            </div>
          </div>
          <button
            type="button"
            onClick={canCreate ? handleCreate : undefined}
            className={cn(
              'rounded-lg px-4 py-[7px] text-[13px] font-semibold text-white transition-colors',
              canCreate ? 'bg-brand hover:bg-brand-hover' : 'cursor-not-allowed bg-orange-200',
            )}
          >
            Create
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-5 space-y-5">

            {/* Step tab bar */}
            <div className="flex rounded-xl bg-gray-100 p-1">
              {[
                { idx: 1, label: 'Step 1: Project Selection' },
                { idx: 2, label: 'Step 2: Task Details'      },
              ].map(({ idx, label }) => {
                const active  = idx === step;
                const enabled = idx === 1 || step1Complete;
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={!enabled}
                    onClick={() => { if (enabled) setStep(idx as 1 | 2); }}
                    className={cn(
                      'flex-1 rounded-lg py-2 text-[12.5px] font-semibold transition-all',
                      active   ? 'bg-white text-gray-900 shadow-sm'
                      : enabled ? 'text-gray-500 hover:text-gray-700'
                                : 'cursor-not-allowed text-gray-400',
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {step === 1 ? (
              <>
                {/* Task Application */}
                <Field label="Task Application" required>
                  <div className="flex items-center gap-6">
                    <Radio checked={appType === 'one-time'} label="One-time Task"   onChange={() => setAppType('one-time')} />
                    <Radio checked={appType === 'recurring'} label="Recurring Task" onChange={() => setAppType('recurring')} />
                  </div>
                  <p className="text-[12px] text-gray-500">
                    {appType === 'one-time'
                      ? 'Task will be applied to the selected project only'
                      : 'Task will be applied to the selected project and all subsequent projects with the same service'}
                  </p>
                </Field>

                {/* Client */}
                <SearchSingleSelect
                  label="Client"
                  required
                  placeholder="Search client"
                  options={CLIENTS}
                  value={client}
                  onChange={v => { setClient(v); }}
                  drawerOpen={open}
                />

                {/* Starting Project */}
                <SearchSingleSelect
                  label="Starting Project"
                  required
                  placeholder={client ? 'Select project' : 'Select client first'}
                  options={projectsForClient.map(getProjectLabel)}
                  value={project}
                  onChange={setProject}
                  disabled={!client}
                  drawerOpen={open}
                />
                {appType === 'recurring' && selectedProject && (
                  <p className="-mt-3 text-[11.5px] text-gray-500">
                    Task will be applied to all projects with service ID: {selectedProject.id}-svc
                  </p>
                )}

                {/* Assignee */}
                <SearchSingleSelect
                  label="Assignee"
                  required
                  placeholder={project ? 'Select assignee' : 'Select project first'}
                  options={ASSIGNEES}
                  value={assignee}
                  onChange={setAssignee}
                  disabled={!project}
                  drawerOpen={open}
                />

              </>
            ) : (
              <>
                {/* Project info banner */}
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-[12.5px]">
                  <p className="font-semibold text-gray-800">
                    Selected Project: <span className="font-normal">{project}</span>
                  </p>
                  {selectedProject && (
                    <p className="mt-0.5 text-gray-600">
                      Project Frequency:{' '}
                      <span className="font-semibold text-brand">{selectedProject.frequency}</span>{' '}
                      <span className="text-gray-400">(Task frequency must be compatible with project frequency)</span>
                    </p>
                  )}
                </div>

                {/* Task Name */}
                <Field label="Task Name" required>
                  <input
                    type="text"
                    value={taskName}
                    onChange={e => setTaskName(e.target.value)}
                    placeholder="Enter task name"
                    className={cn(
                      'h-11 w-full rounded-xl border px-4 text-[13px] transition-colors focus:outline-none focus:ring-1 focus:ring-brand/20',
                      taskName ? 'border-brand text-gray-900' : 'border-gray-200 text-gray-400 focus:border-brand',
                    )}
                  />
                </Field>

                {/* Task Type */}
                <Field label="Task Type" required>
                  <div className="flex items-center gap-6">
                    <Radio checked={taskType === 'mandatory'} label="Mandatory" onChange={() => setTaskType('mandatory')} />
                    <Radio checked={taskType === 'optional'}  label="Optional"  onChange={() => setTaskType('optional')} />
                  </div>
                </Field>

                {/* Frequency */}
                <SearchSingleSelect
                  label="Frequency"
                  required
                  placeholder="Select frequency"
                  options={FREQUENCIES}
                  value={frequency}
                  onChange={setFrequency}
                  drawerOpen={open}
                />
                <p className="-mt-3 text-[11.5px] text-gray-500">
                  Select a frequency compatible with the project
                </p>

                {/* Measurable */}
                <Field label="Measurable" required>
                  <div className="flex items-center gap-6">
                    <Radio checked={measurable === 'yes'} label="Yes" onChange={() => setMeasurable('yes')} />
                    <Radio checked={measurable === 'no'}  label="No"  onChange={() => setMeasurable('no')} />
                  </div>
                </Field>
              </>
            )}
          </div>
        </div>

      </div>
    </>
  );

  return createPortal(content, document.body);
}
