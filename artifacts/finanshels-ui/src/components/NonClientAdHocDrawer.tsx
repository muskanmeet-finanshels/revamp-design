'use client';

import {
  useState, useEffect, useRef, useLayoutEffect,
} from 'react';
import {
  ArrowLeft, Check, ChevronDown, ChevronUp, Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { DatePicker } from '@/components/ui/date-picker';

/* ── Mock data ─────────────────────────────────────────────────────────── */

const TASK_NAME_PRESETS = [
  'Team Meeting', 'Internal Training', 'Documentation Review',
  'Process Improvement', 'Onboarding Session', 'Compliance Audit',
  'Budget Review', 'Strategy Planning', 'HR Policy Update',
  'IT Maintenance', 'Office Administration',
];

const ASSIGNEES = [
  'Mohammed Khan', 'Tariq Ibrahim', 'Ali Tariq',   'Tina Patel',
  'Sarah Nasser',  'Nadia Saleh',   'Priya Nair',  'Qasim Ahmed',
  'Yousef Mansour','Thomas Wright', 'Bilal Ebrahim','Grace Hassan',
  'Elena Flores',  'Omar Mansour',  'Karen Simmons',
];

const FREQUENCIES = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Semi-Annual', 'Annual'];

/* ── SearchSingleSelect ─────────────────────────────────────────────────── */

function SearchSingleSelect({
  label, required, placeholder, options, value, onChange,
  disabled = false, drawerOpen, allowFreeText = false,
  icon,
}: {
  label:          string;
  required?:      boolean;
  placeholder:    string;
  options:        string[];
  value:          string;
  onChange:       (v: string) => void;
  disabled?:      boolean;
  drawerOpen:     boolean;
  allowFreeText?: boolean;
  icon?:          React.ReactNode;
}) {
  const [open,       setOpen]       = useState(false);
  const [query,      setQuery]      = useState('');
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef   = useRef<HTMLDivElement>(null);
  const searchRef  = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!drawerOpen) setOpen(false); }, [drawerOpen]);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setPanelStyle({ top: r.bottom + 4, left: r.left, width: r.width, zIndex: 9999 });
  }, [open]);

  useEffect(() => {
    if (open) { setQuery(''); setTimeout(() => searchRef.current?.focus(), 50); }
  }, [open]);

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

  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()));
  const hasValue = Boolean(value);

  const panel = open ? (
    <div
      ref={panelRef}
      style={{ position: 'fixed', ...panelStyle }}
      className="overflow-hidden overscroll-contain rounded-xl border border-gray-100 bg-white shadow-xl"
    >
      {/* Search / free-text input */}
      <div className="p-2 pb-1.5">
        <div className="flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3">
          <Search size={13} className="flex-shrink-0 text-gray-400" />
          <input
            ref={searchRef}
            type="text"
            placeholder={allowFreeText ? 'Search or type a name…' : `Search ${label.toLowerCase()}...`}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (allowFreeText && e.key === 'Enter' && query.trim()) {
                onChange(query.trim()); setOpen(false); setQuery('');
              }
            }}
            className="min-w-0 flex-1 bg-transparent text-[13px] text-gray-800 placeholder:text-gray-400 outline-none"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')}
              className="flex h-4 w-4 items-center justify-center rounded bg-gray-200 text-[10px] text-gray-600 hover:bg-gray-300 transition-colors">✕</button>
          )}
        </div>
        {allowFreeText && query.trim() && !options.includes(query.trim()) && (
          <button
            type="button"
            onClick={() => { onChange(query.trim()); setOpen(false); setQuery(''); }}
            className="mt-1.5 w-full rounded-lg border border-dashed border-brand/40 px-3 py-2 text-left text-[12.5px] font-medium text-brand transition-colors hover:bg-orange-50"
          >
            Use &ldquo;{query.trim()}&rdquo;
          </button>
        )}
      </div>

      <ul className="max-h-[220px] overflow-y-auto p-2 pt-1">
        {filtered.length > 0
          ? filtered.map(opt => {
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
          : !allowFreeText && <li className="px-3 py-3 text-center text-[12px] text-gray-400">No results</li>
        }
      </ul>

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
        {label}{required && <span className="ml-1 text-red-500">*</span>}
      </p>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) setOpen(v => !v); }}
        className={cn(
          'flex h-11 w-full items-center gap-2 rounded-xl border bg-white px-4 text-[13px] transition-colors focus:outline-none',
          disabled
            ? 'border-gray-100 bg-gray-50 cursor-not-allowed'
            : open || hasValue
              ? 'border-brand'
              : 'border-gray-200 hover:border-gray-300',
        )}
      >
        {icon && <span className="flex-shrink-0 text-gray-400">{icon}</span>}
        <span className={cn(
          'min-w-0 flex-1 truncate text-left leading-5',
          disabled ? 'text-gray-300' : hasValue ? 'font-medium text-gray-900' : 'text-gray-400',
        )}>
          {hasValue ? value : placeholder}
        </span>
        {open
          ? <ChevronUp   size={15} className={cn('flex-shrink-0', disabled ? 'text-gray-200' : 'text-gray-500')} />
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

/* ── DateInput ────────────────────────────────────────────────────────── */

function DateInput({
  label, required, placeholder, hint, value, onChange, min,
}: {
  label:     string;
  required?: boolean;
  placeholder: string;
  hint?:     string;
  value:     string;
  onChange:  (v: string) => void;
  min?:      string;
}) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div>
      <p className="mb-1.5 text-[13px] font-medium text-gray-900">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </p>
      <DatePicker
        value={value}
        onChange={onChange}
        min={min ?? today}
        placeholder={placeholder}
      />
      {hint && <p className="mt-1 text-[11.5px] text-gray-500">{hint}</p>}
    </div>
  );
}

/* ── Main drawer ──────────────────────────────────────────────────────── */

interface Props { open: boolean; onClose: () => void }

export function NonClientAdHocDrawer({ open, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  /* shared */
  const [appType, setAppType] = useState<'one-time' | 'recurring'>('one-time');

  /* one-time fields */
  const [taskName,     setTaskName]     = useState('');
  const [assignee,     setAssignee]     = useState('');
  const [deadline,     setDeadline]     = useState('');
  const [measurable,   setMeasurable]   = useState<'yes' | 'no'>('no');
  const [description,  setDescription]  = useState('');

  /* recurring fields — step 1 */
  const [recStep,    setRecStep]    = useState<1 | 2>(1);
  const [recAssignee, setRecAssignee] = useState('');
  const [startDate,   setStartDate]   = useState('');
  const [endDate,     setEndDate]     = useState('');

  /* recurring fields — step 2 */
  const [recTaskName,  setRecTaskName]  = useState('');
  const [taskType,     setTaskType]     = useState<'mandatory' | 'optional'>('optional');
  const [frequency,    setFrequency]    = useState('');
  const [recMeasurable,setRecMeasurable]= useState<'yes' | 'no'>('no');

  /* reset on open */
  useEffect(() => {
    if (open) {
      setAppType('one-time');
      setTaskName(''); setAssignee(''); setDeadline('');
      setMeasurable('no'); setDescription('');
      setRecStep(1); setRecAssignee(''); setStartDate(''); setEndDate('');
      setRecTaskName(''); setTaskType('optional'); setFrequency(''); setRecMeasurable('no');
    }
  }, [open]);

  /* derived */
  const oneTimeComplete  = Boolean(taskName && assignee && deadline);
  const recStep1Complete = Boolean(recAssignee && startDate);
  const recStep2Complete = Boolean(recTaskName && frequency);
  const canCreate =
    appType === 'one-time'
      ? oneTimeComplete
      : recStep === 2 && recStep2Complete;

  function handleAppTypeChange(type: 'one-time' | 'recurring') {
    setAppType(type);
    if (type === 'recurring') setRecStep(1);
  }

  /* date range hint for step 2 */
  function fmt(iso: string) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }
  const recEndDisplay = endDate
    ? fmt(endDate)
    : startDate
      ? fmt(new Date(new Date(startDate).setFullYear(new Date(startDate).getFullYear() + 2)).toISOString().slice(0, 10))
      : '';

  function handleCreate() {
    const name = appType === 'one-time' ? taskName : recTaskName;
    toast.success(`Ad-hoc task "${name}" created`);
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
        {/* ── Header ── */}
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
              <span className="block text-[15px] font-semibold text-gray-900">
                Add Non-Client Ad-hoc Task
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={canCreate ? handleCreate : undefined}
            className={cn(
              'ml-3 flex-shrink-0 rounded-lg px-4 py-[7px] text-[13px] font-semibold text-white transition-colors',
              canCreate ? 'bg-brand hover:bg-brand-hover' : 'cursor-not-allowed bg-orange-200',
            )}
          >
            Create
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-5 px-5 py-5">

            {/* Task Application — always shown */}
            <div className="space-y-1.5">
              <p className="text-[13px] font-medium text-gray-900">
                Task Application <span className="text-red-500">*</span>
              </p>
              <div className="flex items-center gap-6">
                <Radio checked={appType === 'one-time'}  label="One-time Task"  onChange={() => handleAppTypeChange('one-time')} />
                <Radio checked={appType === 'recurring'} label="Recurring Task" onChange={() => handleAppTypeChange('recurring')} />
              </div>
            </div>

            {/* ─── ONE-TIME FLOW ─── */}
            {appType === 'one-time' && (
              <>
                {/* Task Name */}
                <SearchSingleSelect
                  label="Task Name"
                  required
                  placeholder="Select or create a task name"
                  options={TASK_NAME_PRESETS}
                  value={taskName}
                  onChange={setTaskName}
                  allowFreeText
                  drawerOpen={open}
                />

                {/* Assignee */}
                <SearchSingleSelect
                  label="Assignee"
                  required
                  placeholder="Search assignee"
                  options={ASSIGNEES}
                  value={assignee}
                  onChange={setAssignee}
                  icon={<Search size={13} />}
                  drawerOpen={open}
                />

                {/* Deadline */}
                <DateInput
                  label="Deadline"
                  required
                  placeholder="Select deadline"
                  hint="Calendar picker — any date from today."
                  value={deadline}
                  onChange={setDeadline}
                />

                {/* Measurable */}
                <div className="space-y-1.5">
                  <p className="text-[13px] font-medium text-gray-900">
                    Measurable <span className="text-red-500">*</span>
                  </p>
                  <div className="flex items-center gap-6">
                    <Radio checked={measurable === 'yes'} label="Yes" onChange={() => setMeasurable('yes')} />
                    <Radio checked={measurable === 'no'}  label="No"  onChange={() => setMeasurable('no')} />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <p className="text-[13px] font-medium text-gray-900">
                    Description <span className="text-[12px] font-normal text-gray-400">(optional)</span>
                  </p>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Add a short description"
                    rows={4}
                    className="w-full resize-y rounded-xl border border-gray-200 px-4 py-3 text-[13px] text-gray-800 placeholder:text-gray-400 outline-none transition-colors focus:border-brand focus:ring-1 focus:ring-brand/20"
                  />
                </div>
              </>
            )}

            {/* ─── RECURRING FLOW ─── */}
            {appType === 'recurring' && (
              <div className="space-y-3">

                {/* ── Accordion 1: Assignee ── */}
                <div className="overflow-hidden rounded-xl border border-gray-200">
                  {/* Header */}
                  <button
                    type="button"
                    onClick={() => setRecStep(recStep === 1 ? (recStep1Complete ? 2 : 1) : 1)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={cn(
                        'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                        recStep1Complete ? 'bg-brand text-white' : 'bg-gray-200 text-gray-600',
                      )}>
                        {recStep1Complete ? <Check size={11} strokeWidth={3} /> : '1'}
                      </span>
                      <span className="text-[13px] font-semibold text-gray-900">Assignee</span>
                      {recStep1Complete && recAssignee && (
                        <span className="text-[12px] text-gray-400">— {recAssignee}</span>
                      )}
                    </div>
                    {recStep === 1
                      ? <ChevronUp   size={15} className="flex-shrink-0 text-gray-400" />
                      : <ChevronDown size={15} className="flex-shrink-0 text-gray-400" />}
                  </button>

                  {/* Body */}
                  {recStep === 1 && (
                    <div className="space-y-4 border-t border-gray-100 px-4 pb-4 pt-4">
                      <SearchSingleSelect
                        label="Assignee"
                        required
                        placeholder="Search assignee"
                        options={ASSIGNEES}
                        value={recAssignee}
                        onChange={setRecAssignee}
                        icon={<Search size={13} />}
                        drawerOpen={open}
                      />

                      <div className="space-y-4">
                        <DateInput
                          label="Start Date"
                          required
                          placeholder="Select start date"
                          value={startDate}
                          onChange={v => { setStartDate(v); if (endDate && endDate < v) setEndDate(''); }}
                        />
                        <DateInput
                          label="End Date"
                          placeholder="Select end date"
                          hint="If omitted, configure preview uses start + 2 years."
                          value={endDate}
                          onChange={setEndDate}
                          min={startDate || undefined}
                        />
                      </div>

                    </div>
                  )}
                </div>

                {/* ── Accordion 2: Task Details ── */}
                <div className={cn(
                  'overflow-hidden rounded-xl border transition-colors',
                  recStep1Complete ? 'border-gray-200' : 'border-gray-100 bg-gray-50/60',
                )}>
                  {/* Header */}
                  <button
                    type="button"
                    disabled={!recStep1Complete}
                    onClick={() => { if (recStep1Complete) setRecStep(recStep === 2 ? 1 : 2); }}
                    className={cn(
                      'flex w-full items-center justify-between px-4 py-3 text-left transition-colors',
                      recStep1Complete ? 'hover:bg-gray-50' : 'cursor-not-allowed',
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={cn(
                        'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                        recStep2Complete ? 'bg-brand text-white'
                        : recStep1Complete ? 'bg-gray-200 text-gray-600'
                                          : 'bg-gray-100 text-gray-400',
                      )}>
                        {recStep2Complete ? <Check size={11} strokeWidth={3} /> : '2'}
                      </span>
                      <span className={cn(
                        'text-[13px] font-semibold',
                        recStep1Complete ? 'text-gray-900' : 'text-gray-400',
                      )}>
                        Task Details
                      </span>
                    </div>
                    {recStep1Complete && (
                      recStep === 2
                        ? <ChevronUp   size={15} className="flex-shrink-0 text-gray-400" />
                        : <ChevronDown size={15} className="flex-shrink-0 text-gray-400" />
                    )}
                  </button>

                  {/* Body */}
                  {recStep === 2 && recStep1Complete && (
                    <div className="space-y-4 border-t border-gray-100 px-4 pb-4 pt-4">
                      <SearchSingleSelect
                        label="Task Name"
                        required
                        placeholder="Search or enter task name"
                        options={TASK_NAME_PRESETS}
                        value={recTaskName}
                        onChange={setRecTaskName}
                        allowFreeText
                        drawerOpen={open}
                      />

                      <div className="space-y-1.5">
                        <p className="text-[13px] font-medium text-gray-900">
                          Task Type <span className="text-red-500">*</span>
                        </p>
                        <div className="flex items-center gap-6">
                          <Radio checked={taskType === 'mandatory'} label="Mandatory" onChange={() => setTaskType('mandatory')} />
                          <Radio checked={taskType === 'optional'}  label="Optional"  onChange={() => setTaskType('optional')} />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <SearchSingleSelect
                          label="Frequency"
                          required
                          placeholder="Select frequency"
                          options={FREQUENCIES}
                          value={frequency}
                          onChange={setFrequency}
                          drawerOpen={open}
                        />
                        <p className="text-[11.5px] text-gray-500">
                          Select a frequency compatible with the project
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-[13px] font-medium text-gray-900">
                          Measurable <span className="text-red-500">*</span>
                        </p>
                        <div className="flex items-center gap-6">
                          <Radio checked={recMeasurable === 'yes'} label="Yes" onChange={() => setRecMeasurable('yes')} />
                          <Radio checked={recMeasurable === 'no'}  label="No"  onChange={() => setRecMeasurable('no')} />
                        </div>
                        {startDate && recEndDisplay && (
                          <p className="text-[11.5px] text-gray-500">
                            Frequency options are limited to what fits {fmt(startDate)} – {recEndDisplay}.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>

      </div>
    </>
  );

  return createPortal(content, document.body);
}
