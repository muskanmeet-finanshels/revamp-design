'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle, ArrowLeft, Bookmark, Briefcase, CalendarRange, Check, ChevronDown, ChevronUp, CircleAlert,
  Pencil, RotateCcw, Search, Star, Trash2, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { DatePicker } from '@/components/ui/date-picker';

/* ─────────────────────────────── option lists ───────────────────────────── */

export const TASK_FILTER_OPTIONS = {
  taskNames: [
    'VAT Filing', 'Bookkeeping', 'CT Registration', 'Payroll Management',
    'Audit Review', 'Compliance Check', 'Financial Statements', 'Tax Return',
  ] as const,
  frequencies:  ['One-time', 'Weekly', 'Monthly', 'Quarterly', 'Annually'] as const,
  clients:      ['Nexora', 'Finovo', 'Lumo', 'Talvo', 'Orvix', 'Stratco'] as const,
  projectNames: [
    'VAT Filing Jul 2025 – Sep 2025', 'Book Keeping – Sep 2025',
    'CT Registration – June 2026', 'Payroll Management – Q4 2025',
    'Bookkeeping – Oct 2025', 'CT Registration – Nov 2025',
  ] as const,
  services:  ['Accounting', 'Finance', 'IT', 'Technology', 'HR', 'Compliance', 'Audit'] as const,
  assignees: [
    'Ali Tariq', 'Bilal Ebrahim', 'Grace Hassan', 'Huda Saleh', 'Mohammed Khan',
    'Nadia Saleh', 'Omar Mansour', 'Priya Nair', 'Qasim Ahmed', 'Sarah Nasser',
    'Tariq Ibrahim', 'Thomas Wright', 'Tina Patel', 'Yousef Mansour',
  ] as const,
  tags:         ['Tax Filing', 'Bookkeeping', 'Registration', 'Payroll', 'Audit', 'Compliance', 'HR'] as const,
  dueDatePresets: ['All dates', 'Today', 'This Week', 'This Month', 'Custom Date Range'] as const,
} as const;

/* ─────────────────────────────── saved-filter storage ──────────────────── */

export interface SavedTaskFilter {
  id:           string;
  name:         string;
  filters:      TaskFilterState;
  createdAt:    number;
  isFavourite?: boolean;
  isDefault?:   boolean;
}

function useSavedFilters(storageKey: string) {
  const [saved, setSaved]       = useState<SavedTaskFilter[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const MAX_SAVED = 20;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as SavedTaskFilter[];
        let favouriteFound = false;
        const normalized = parsed.map(filter => {
          if (!filter.isFavourite) return filter;
          if (favouriteFound) return { ...filter, isFavourite: false };
          favouriteFound = true;
          return filter;
        });
        setSaved(normalized);
        if (JSON.stringify(normalized) !== raw) {
          localStorage.setItem(storageKey, JSON.stringify(normalized));
        }
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, [storageKey]);

  function persist(next: SavedTaskFilter[]) {
    setSaved(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignore */ }
  }

  const MAX_SAVED_VAL = MAX_SAVED;

  function saveFilter(name: string, filters: TaskFilterState, isDefault = false): boolean {
    if (saved.length >= MAX_SAVED_VAL) return false;
    const entry: SavedTaskFilter = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim() || 'Untitled filter',
      filters,
      createdAt: Date.now(),
      isFavourite: false,
      isDefault,
    };
    const base = isDefault ? saved.map(f => ({ ...f, isDefault: false })) : saved;
    persist([entry, ...base]);
    return true;
  }

  function deleteFilter(id: string) {
    persist(saved.filter(f => f.id !== id));
  }

  function toggleFavourite(id: string) {
    const nextValue = !saved.find(f => f.id === id)?.isFavourite;
    persist(saved.map(f => ({ ...f, isFavourite: f.id === id ? nextValue : false })));
  }

  function setAsDefault(id: string | null) {
    persist(saved.map(f => ({ ...f, isDefault: f.id === id })));
  }

  function renameFilter(id: string, name: string) {
    persist(saved.map(f => f.id === id ? { ...f, name: name.trim() || f.name } : f));
  }

  const atCap = hydrated && saved.length >= MAX_SAVED_VAL;

  return { saved: hydrated ? saved : [], saveFilter, deleteFilter, toggleFavourite, setAsDefault, renameFilter, atCap, MAX_SAVED };
}

/* ─────────────────────────────── filter state ───────────────────────────── */

export interface TaskFilterState {
  taskNames:    string[];
  frequencies:  string[];
  clients:      string[];
  projectNames: string[];
  services:     string[];
  assignees:    string[];
  tags:         string[];
  dueDateFilter: string;
  dueDateStart: string;
  dueDateEnd:   string;
}

export const EMPTY_TASK_FILTERS: TaskFilterState = {
  taskNames: [], frequencies: [], clients: [], projectNames: [],
  services: [], assignees: [], tags: [],
  dueDateFilter: 'All dates',
  dueDateStart: '',
  dueDateEnd: '',
};

export function countActiveTaskFilters(f: TaskFilterState): number {
  return (
    (f.taskNames.length > 0 ? 1 : 0) +
    (f.frequencies.length > 0 ? 1 : 0) +
    (f.clients.length > 0 ? 1 : 0) +
    (f.projectNames.length > 0 ? 1 : 0) +
    (f.services.length > 0 ? 1 : 0) +
    (f.assignees.length > 0 ? 1 : 0) +
    (f.tags.length > 0 ? 1 : 0) +
    (f.dueDateFilter !== 'All dates' ? 1 : 0)
  );
}

/* ─────────────────────────────── checkbox ───────────────────────────────── */

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

/* ─────────────────────────────── multi-select dropdown ─────────────────── */

function MultiSelectDropdown({
  label, placeholder, options, selected, onChange, searchPlaceholder, drawerOpen,
}: {
  label: string;
  placeholder: string;
  options: readonly string[];
  selected: string[];
  onChange: (v: string[]) => void;
  searchPlaceholder?: string;
  drawerOpen: boolean;
}) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState('');
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const triggerRef  = useRef<HTMLButtonElement>(null);
  const panelRef    = useRef<HTMLDivElement>(null);
  const searchRef   = useRef<HTMLInputElement>(null);
  const scrollerRef = useRef<Element | null>(null);

  useEffect(() => { if (!drawerOpen) { setOpen(false); setQuery(''); } }, [drawerOpen]);

  function getPosition() {
    if (!triggerRef.current) return null;
    const r = triggerRef.current.getBoundingClientRect();
    const estimatedHeight = Math.min(16 + options.length * 36, window.innerHeight - 32);
    const spaceBelow = window.innerHeight - r.bottom - 4;
    const canOpenAbove = r.top - 4 >= estimatedHeight;
    const openAbove = spaceBelow < estimatedHeight && canOpenAbove;

    return {
      position: 'fixed' as const,
      ...(openAbove
        ? { bottom: window.innerHeight - r.top + 4 }
        : { top: Math.min(r.bottom + 4, window.innerHeight - 16) }),
      left: r.left,
      width: r.width,
      zIndex: 9999,
    };
  }

  useLayoutEffect(() => {
    if (!open) return;
    const pos = getPosition();
    if (pos) setPanelStyle(pos);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => { searchRef.current?.focus({ preventScroll: true }); });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        panelRef.current   && !panelRef.current.contains(target)
      ) { setOpen(false); setQuery(''); }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    let ancestor: HTMLElement | null = triggerRef.current.parentElement;
    while (ancestor) {
      const { overflowY } = window.getComputedStyle(ancestor);
      if (overflowY === 'auto' || overflowY === 'scroll') break;
      ancestor = ancestor.parentElement;
    }
    if (!ancestor) return;
    const prev = ancestor.style.overflowY;
    ancestor.style.overflowY = 'hidden';
    return () => { ancestor.style.overflowY = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function reposition() {
      const pos = getPosition();
      if (pos) setPanelStyle(pos);
    }
    if (!scrollerRef.current && triggerRef.current) {
      let el: Element | null = triggerRef.current.parentElement;
      while (el) {
        const { overflowY } = window.getComputedStyle(el);
        if (overflowY === 'auto' || overflowY === 'scroll') { scrollerRef.current = el; break; }
        el = el.parentElement;
      }
    }
    scrollerRef.current?.addEventListener('scroll', reposition);
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      scrollerRef.current?.removeEventListener('scroll', reposition);
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open]);

  const visible = query ? options.filter(o => o.toLowerCase().includes(query.toLowerCase())) : options;
  const hasActive = selected.length > 0;

  function toggle(o: string) {
    onChange(selected.includes(o) ? selected.filter(s => s !== o) : [...selected, o]);
  }

  const triggerLabel =
    selected.length === 0 ? placeholder :
    selected.length === 1 ? selected[0] :
    `${selected.length} selected`;

  const panel = open ? (
    <div
      ref={panelRef}
      style={{ position: 'fixed', ...panelStyle }}
      className="fixed overflow-hidden overscroll-contain rounded-xl border border-gray-100 bg-white shadow-xl"
    >
      <div className="p-2 pb-1.5">
        <div className="flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3">
          <Search size={13} className="flex-shrink-0 text-gray-400" />
          <input
            ref={searchRef}
            type="text"
            placeholder={searchPlaceholder ?? `Search ${label.toLowerCase()}...`}
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[13px] text-gray-800 placeholder:text-gray-400 outline-none"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')}
              className="flex h-4 w-4 items-center justify-center rounded bg-gray-200 text-[10px] text-gray-600 hover:bg-gray-300 transition-colors">✕</button>
          )}
        </div>
      </div>
      <ul className="max-h-[220px] overflow-y-auto p-2 pt-1">
        {visible.length > 0
          ? visible.map(opt => {
              const isChecked = selected.includes(opt);
              return (
                <li key={opt}>
                  <label className={cn(
                    'flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 transition-colors',
                    isChecked ? 'bg-orange-50' : 'hover:bg-gray-100',
                  )}>
                    <Checkbox checked={isChecked} onChange={() => toggle(opt)} />
                    <span className={cn(
                      'text-[13px] select-none',
                      isChecked ? 'font-medium text-brand' : 'text-gray-800',
                    )}>{opt}</span>
                  </label>
                </li>
              );
            })
          : <li className="px-3 py-3 text-center text-[12px] text-gray-400">No results</li>
        }
      </ul>
      {selected.length > 0 && (
        <>
          <div className="border-t border-gray-100" />
          <button
            type="button"
            onClick={() => { onChange([]); setOpen(false); setQuery(''); }}
            className="w-full px-3 py-3 text-left text-[13px] font-medium text-brand hover:bg-orange-50/40 transition-colors"
          >
            Clear {selected.length} selected
          </button>
        </>
      )}
    </div>
  ) : null;

  return (
    <div>
      <p className="mb-1.5 text-[13px] font-medium text-gray-900">{label}</p>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => { setOpen(v => !v); if (!open) setQuery(''); }}
        className={cn(
          'flex h-11 w-full items-center justify-between rounded-xl border bg-white px-4 text-[13px] transition-colors focus:outline-none',
          open || hasActive ? 'border-brand' : 'border-gray-200 hover:border-gray-300',
        )}
      >
        <span className={cn('truncate text-left', hasActive ? 'text-gray-900' : 'text-gray-400')}>
          {triggerLabel}
        </span>
        {open
          ? <ChevronUp  size={15} className="flex-shrink-0 text-gray-500" />
          : <ChevronDown size={15} className="flex-shrink-0 text-gray-400" />}
      </button>
      {typeof document !== 'undefined' && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}

/* ─────────────────────────────── single-select dropdown ────────────────── */

function SingleSelectDropdown({
  label, options, value, onChange, drawerOpen,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  drawerOpen: boolean;
}) {
  const [open, setOpen]   = useState(false);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef   = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<Element | null>(null);

  useEffect(() => { if (!drawerOpen) setOpen(false); }, [drawerOpen]);

  function getPosition() {
    if (!triggerRef.current) return null;
    const r = triggerRef.current.getBoundingClientRect();
    return { position: 'fixed' as const, top: r.bottom + 4, left: r.left, width: r.width, zIndex: 9999 };
  }

  useLayoutEffect(() => {
    if (!open) return;
    const pos = getPosition();
    if (pos) setPanelStyle(pos);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        panelRef.current   && !panelRef.current.contains(target)
      ) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    let ancestor: HTMLElement | null = triggerRef.current.parentElement;
    while (ancestor) {
      const { overflowY } = window.getComputedStyle(ancestor);
      if (overflowY === 'auto' || overflowY === 'scroll') break;
      ancestor = ancestor.parentElement;
    }
    if (!ancestor) return;
    const prev = ancestor.style.overflowY;
    ancestor.style.overflowY = 'hidden';
    return () => { ancestor.style.overflowY = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function reposition() {
      const pos = getPosition();
      if (pos) setPanelStyle(pos);
    }
    if (!scrollerRef.current && triggerRef.current) {
      let el: Element | null = triggerRef.current.parentElement;
      while (el) {
        const { overflowY } = window.getComputedStyle(el);
        if (overflowY === 'auto' || overflowY === 'scroll') { scrollerRef.current = el; break; }
        el = el.parentElement;
      }
    }
    scrollerRef.current?.addEventListener('scroll', reposition);
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      scrollerRef.current?.removeEventListener('scroll', reposition);
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open]);

  const isActive = value !== 'All dates';

  const panel = open ? (
    <div
      ref={panelRef}
      style={{ position: 'fixed', ...panelStyle }}
      className="fixed overflow-hidden overscroll-contain rounded-xl border border-gray-100 bg-white shadow-xl"
    >
      <ul className="max-h-[calc(100vh-2rem)] overflow-y-auto p-2">
        {options.map(opt => {
          const isSel = value === opt;
          return (
            <li key={opt}>
              <button
                type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
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
        })}
      </ul>
    </div>
  ) : null;

  return (
    <div>
      <p className="mb-1.5 text-[13px] font-medium text-gray-900">{label}</p>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex h-11 w-full items-center justify-between rounded-xl border bg-white px-4 text-[13px] transition-colors focus:outline-none',
          open || isActive ? 'border-brand' : 'border-gray-200 hover:border-gray-300',
        )}
      >
        <span className={cn('truncate text-left', isActive ? 'text-gray-900' : 'text-gray-600')}>
          {value}
        </span>
        {open
          ? <ChevronUp  size={15} className="flex-shrink-0 text-gray-500" />
          : <ChevronDown size={15} className="flex-shrink-0 text-gray-400" />}
      </button>
      {typeof document !== 'undefined' && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}

/* ─────────────────────────────── section header ────────────────────────── */

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="mb-5 flex items-center gap-2">
      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center text-brand">
        {icon}
      </span>
      <span className="text-[14px] font-semibold text-gray-900">{label}</span>
    </div>
  );
}

/* ─────────────────────────────── drawer ────────────────────────────────── */

export interface TaskFilterDrawerProps {
  open:           boolean;
  onClose:        () => void;
  pending:        TaskFilterState;
  onChange:       (f: TaskFilterState) => void;
  onApply:        () => void;
  onReset:        () => void;
  /** Apply a filter set directly — used by saved-filter rows to bypass pending state lag */
  onApplyDirect?: (f: TaskFilterState) => void;
  storageKey?:    string;
  /** Hide filters that are redundant when the task list is already project-scoped. */
  hideProjectContextFilters?: boolean;
}

export function TaskFilterDrawer({
  open, onClose, pending, onChange, onApply, onReset, onApplyDirect,
  storageKey = 'finanshels-tasks-filters', hideProjectContextFilters = false,
}: TaskFilterDrawerProps) {
  const hasPending = countActiveTaskFilters(pending) > 0;

  function set<K extends keyof TaskFilterState>(key: K, value: TaskFilterState[K]) {
    onChange({ ...pending, [key]: value });
  }

  /* saved-filter state */
  const { saved, saveFilter, deleteFilter, toggleFavourite, setAsDefault, renameFilter, atCap, MAX_SAVED } = useSavedFilters(storageKey);
  const [savePanelOpen, setSavePanelOpen]   = useState(false);
  const [saveName, setSaveName]             = useState('');
  const [saveIsDefault, setSaveIsDefault]   = useState(false);
  const [saveCapWarning, setSaveCapWarning] = useState(false);
  const [deleteTarget, setDeleteTarget]     = useState<string | null>(null);
  const saveInputRef  = useRef<HTMLInputElement>(null);
  const dropdownRef   = useRef<HTMLDivElement>(null);
  const [dropdownOpen, setDropdownOpen]     = useState(false);
  const [editingId, setEditingId]           = useState<string | null>(null);
  const [editName, setEditName]             = useState('');

  /* focus name input when save panel opens */
  useEffect(() => {
    if (!savePanelOpen) return;
    const raf = requestAnimationFrame(() => saveInputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [savePanelOpen]);

  /* close save panel + dropdown when drawer closes */
  useEffect(() => {
    if (!open) {
      setSavePanelOpen(false);
      setSaveName('');
      setSaveIsDefault(false);
      setSaveCapWarning(false);
      setDropdownOpen(false);
      setEditingId(null);
    }
  }, [open]);

  /* close dropdown on outside click */
  useEffect(() => {
    if (!dropdownOpen) return;
    function onMouseDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setEditingId(null);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [dropdownOpen]);

  function handleSave() {
    if (!hasPending) return;
    if (atCap) { setSaveCapWarning(true); return; }
    saveFilter(saveName, pending, saveIsDefault);
    setSaveName('');
    setSaveIsDefault(false);
    setSavePanelOpen(false);
    setSaveCapWarning(false);
  }

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  /* ── delete-confirm dialog ── */
  const deleteTargetName = saved.find(sf => sf.id === deleteTarget)?.name ?? '';
  const confirmDeleteNode = (
    <Dialog open={deleteTarget !== null} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
      <DialogContent className="max-w-[420px] rounded-2xl p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
          <CircleAlert size={20} className="text-red-500" />
        </div>
        <DialogHeader className="gap-0 text-left">
          <DialogTitle className="mt-4 text-[16px] font-semibold text-gray-900">
            Delete saved filter?
          </DialogTitle>
          <DialogDescription className="mt-2 text-[13.5px] leading-relaxed text-gray-500">
            Are you sure you want to delete{' '}
            <span className="font-medium text-gray-700">&ldquo;{deleteTargetName}&rdquo;</span>
            ? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6 gap-2 sm:space-x-0">
          <button
            type="button"
            onClick={() => setDeleteTarget(null)}
            className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (deleteTarget) {
                const deletedName = deleteTargetName;
                deleteFilter(deleteTarget);
                setDeleteTarget(null);
                toast.success(`"${deletedName}" deleted`);
              }
            }}
            className="flex-1 rounded-lg bg-red-500 px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-red-600"
          >
            Delete Filter
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/20 transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      />

      {/* Drawer panel */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-2xl transition-transform duration-300 ease-out sm:w-[36rem]',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* ── Header ── */}
        <div className="flex-shrink-0 border-b border-gray-100">
          <div className="flex items-center justify-between px-5 py-[14px]">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft size={17} />
              </button>
              <span className="text-[15px] font-semibold text-gray-900">Filters</span>
            </div>

            <div className="flex items-center gap-3">
              {/* ── Saved filters dropdown ── */}
              {saved.length > 0 && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => { setDropdownOpen(v => !v); setEditingId(null); }}
                    className={cn(
                      'flex h-9 min-w-[118px] items-center justify-between gap-2 rounded-lg border px-3 text-[13px] font-normal shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors',
                      dropdownOpen
                        ? 'border-brand bg-orange-50 text-brand'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                    )}
                  >
                    <Bookmark size={15} strokeWidth={1.8} className={dropdownOpen ? 'fill-brand text-brand' : 'text-gray-500'} />
                    Saved ({saved.length})
                    <ChevronDown size={14} strokeWidth={1.8} className={cn('transition-transform duration-200', dropdownOpen && 'rotate-180')} />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 top-full z-50 mt-1.5 w-[340px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                      <div className="max-h-[220px] overflow-y-auto p-1.5 space-y-0.5">
                        {[...saved]
                          .sort((a, b) => (b.isFavourite ? 1 : 0) - (a.isFavourite ? 1 : 0))
                          .map(sf => {
                            const count     = countActiveTaskFilters(sf.filters);
                            const isEditing = editingId === sf.id;
                            return (
                              <div
                                key={sf.id}
                                className={cn(
                                  'flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors',
                                  sf.isDefault ? 'bg-orange-50/70' : 'hover:bg-gray-50',
                                )}
                              >
                                {/* Favourite star */}
                                <TooltipProvider delayDuration={150}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        type="button"
                                        onClick={() => toggleFavourite(sf.id)}
                                        aria-label={sf.isFavourite ? 'Remove from favourites' : 'Mark as favourite'}
                                        className="flex-shrink-0 p-0.5 text-gray-300 hover:text-amber-400 transition-colors"
                                      >
                                        <Star size={13} className={sf.isFavourite ? 'fill-amber-400 text-amber-400' : ''} />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="bottom"
                                      className="rounded-md bg-[#082032] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg"
                                    >
                                      {sf.isFavourite ? 'Remove from favourites' : 'Mark as favourite'}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                {/* Name / edit input */}
                                <div className="min-w-0 flex-1">
                                  {isEditing ? (
                                    <input
                                      autoFocus
                                      type="text"
                                      value={editName}
                                      onChange={e => setEditName(e.target.value)}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') { renameFilter(sf.id, editName); setEditingId(null); }
                                        if (e.key === 'Escape') setEditingId(null);
                                      }}
                                      className="w-full rounded border border-brand bg-white px-1.5 py-0.5 text-[12.5px] text-gray-800 focus:outline-none focus:ring-1 focus:ring-brand/20"
                                    />
                                  ) : (
                                    <div className="flex min-w-0 items-center gap-1.5">
                                      <span className="truncate text-[12.5px] font-medium text-gray-800">{sf.name}</span>
                                      {sf.isDefault && (
                                        <span className="flex-shrink-0 rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand leading-none">
                                          default
                                        </span>
                                      )}
                                      <span className="flex-shrink-0 text-[11px] text-gray-400">{count} filter{count !== 1 ? 's' : ''}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Actions */}
                                {isEditing ? (
                                  <div className="flex flex-shrink-0 items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => { renameFilter(sf.id, editName); setEditingId(null); }}
                                      className="rounded bg-brand px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-brand-hover transition-colors"
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingId(null)}
                                      className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-100 transition-colors"
                                    >
                                      <X size={11} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex flex-shrink-0 items-center gap-0.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (onApplyDirect) { onApplyDirect(sf.filters); }
                                        else { onChange(sf.filters); onApply(); }
                                        setDropdownOpen(false);
                                        onClose();
                                      }}
                                      className="rounded-lg bg-brand px-2.5 py-1 text-[11.5px] font-semibold text-white hover:bg-brand-hover transition-colors"
                                    >
                                      Apply
                                    </button>
                                     <TooltipProvider delayDuration={150}>
                                       <Tooltip>
                                         <TooltipTrigger asChild>
                                           <button
                                             type="button"
                                             onClick={() => { setEditingId(sf.id); setEditName(sf.name); }}
                                             aria-label="Rename filter"
                                             className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                                           >
                                             <Pencil size={12} />
                                           </button>
                                         </TooltipTrigger>
                                         <TooltipContent
                                           side="bottom"
                                           className="rounded-md bg-[#082032] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg"
                                         >
                                           Rename filter
                                         </TooltipContent>
                                       </Tooltip>
                                       <Tooltip>
                                         <TooltipTrigger asChild>
                                           <button
                                             type="button"
                                             onClick={() => { setDeleteTarget(sf.id); setDropdownOpen(false); }}
                                             aria-label="Delete filter"
                                             className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                                           >
                                             <Trash2 size={12} />
                                           </button>
                                         </TooltipTrigger>
                                         <TooltipContent
                                           side="bottom"
                                           className="rounded-md bg-[#082032] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg"
                                         >
                                           Delete filter
                                         </TooltipContent>
                                       </Tooltip>
                                     </TooltipProvider>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                       <div className="flex items-center gap-2 border-t border-gray-100 px-3 py-2 text-[11px] text-gray-400">
                         <span className="inline-flex items-center gap-1">
                           <Star size={11} aria-hidden="true" />
                           Favourite
                         </span>
                         <span aria-hidden="true">·</span>
                         <span className="inline-flex items-center gap-1">
                           <Pencil size={11} aria-hidden="true" />
                           Rename
                         </span>
                         <span aria-hidden="true">·</span>
                         <span className="inline-flex items-center gap-1">
                           <Trash2 size={11} aria-hidden="true" />
                           Delete
                         </span>
                       </div>
                    </div>
                  )}
                </div>
              )}

              {/* Save icon */}
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => { if (hasPending) setSavePanelOpen(v => !v); }}
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
                        savePanelOpen
                          ? 'bg-orange-50 text-brand'
                          : hasPending
                            ? 'text-gray-500 hover:bg-gray-100 hover:text-brand'
                            : 'cursor-not-allowed text-gray-300',
                      )}
                    >
                      <Bookmark size={20} strokeWidth={1.8} className={savePanelOpen ? 'fill-brand' : ''} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    className="rounded-md bg-[#082032] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg"
                  >
                    {hasPending ? 'Save current filters' : 'Set filters to save'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Apply */}
              <button
                type="button"
                onClick={() => { if (!hasPending) return; onApply(); onClose(); }}
                disabled={!hasPending}
                className={cn(
                  'min-w-[106px] rounded-lg px-4 py-2 text-[13px] font-bold text-white shadow-[0_2px_5px_rgba(234,88,12,0.18)] transition-colors',
                  hasPending ? 'bg-brand hover:bg-brand-hover' : 'cursor-not-allowed bg-orange-200',
                )}
              >
                Apply Filter
              </button>
            </div>
          </div>

          {/* Inline save panel */}
          {savePanelOpen && (
            <div className="flex flex-col gap-2 border-t border-gray-100 bg-orange-50/60 px-5 py-3">
              {atCap && (
                <p className="text-[11.5px] font-medium text-amber-700">
                  Limit of {MAX_SAVED} reached — delete a saved filter before adding a new one.
                </p>
              )}
              <div className="flex items-center gap-2">
              <Bookmark size={14} className="flex-shrink-0 text-brand" />
              <input
                ref={saveInputRef}
                type="text"
                placeholder="Name this filter…"
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setSavePanelOpen(false); }}
                disabled={atCap}
                className="h-8 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-800 placeholder:text-gray-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <button
                type="button"
                onClick={handleSave}
                disabled={atCap}
                className="rounded-lg bg-brand px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-brand-hover transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => { setSavePanelOpen(false); setSaveName(''); setSaveIsDefault(false); }}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
              >
                <X size={13} />
              </button>
              </div>
              {!atCap && (
                <button
                  type="button"
                  onClick={() => setSaveIsDefault(v => !v)}
                  className="flex items-center gap-2 pl-[22px] w-fit"
                >
                  <div className={cn(
                    'flex h-4 w-4 items-center justify-center rounded border transition-colors',
                    saveIsDefault ? 'border-brand bg-brand' : 'border-gray-300 bg-white hover:border-brand/60',
                  )}>
                    {saveIsDefault && <Check size={10} className="text-white" strokeWidth={3} />}
                  </div>
                  <span className="text-[12px] text-gray-600">Set as default filter</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Task Filters ── */}
          <div className="px-5 py-5">
            <SectionHeader
              icon={<Briefcase size={18} strokeWidth={1.8} />}
              label="Task Filters"
            />

            {/* Continuous two-column flow keeps every field aligned without blank grid cells. */}
            <div className="grid grid-cols-2 gap-4">
              <MultiSelectDropdown
                label="Task Name"
                placeholder="Select tasks..."
                options={TASK_FILTER_OPTIONS.taskNames}
                selected={pending.taskNames}
                onChange={v => set('taskNames', v)}
                searchPlaceholder="Search tasks..."
                drawerOpen={open}
              />
              <MultiSelectDropdown
                label="Task Frequency"
                placeholder="Select frequencies..."
                options={TASK_FILTER_OPTIONS.frequencies}
                selected={pending.frequencies}
                onChange={v => set('frequencies', v)}
                searchPlaceholder="Search frequencies..."
                drawerOpen={open}
              />
              {!hideProjectContextFilters && (
                <>
                  <MultiSelectDropdown
                    label="Client Name"
                    placeholder="Select clients..."
                    options={TASK_FILTER_OPTIONS.clients}
                    selected={pending.clients}
                    onChange={v => set('clients', v)}
                    searchPlaceholder="Search clients..."
                    drawerOpen={open}
                  />
                  <MultiSelectDropdown
                    label="Project Name"
                    placeholder="Select projects..."
                    options={TASK_FILTER_OPTIONS.projectNames}
                    selected={pending.projectNames}
                    onChange={v => set('projectNames', v)}
                    searchPlaceholder="Search projects..."
                    drawerOpen={open}
                  />
                </>
              )}
              <MultiSelectDropdown
                label="Service"
                placeholder="Select services..."
                options={TASK_FILTER_OPTIONS.services}
                selected={pending.services}
                onChange={v => set('services', v)}
                searchPlaceholder="Search services..."
                drawerOpen={open}
              />
              <MultiSelectDropdown
                label="Assignee"
                placeholder="Select assignees..."
                options={TASK_FILTER_OPTIONS.assignees}
                selected={pending.assignees}
                onChange={v => set('assignees', v)}
                searchPlaceholder="Search assignees..."
                drawerOpen={open}
              />
              <MultiSelectDropdown
                label="Tags"
                placeholder="Select tags..."
                options={TASK_FILTER_OPTIONS.tags}
                selected={pending.tags}
                onChange={v => set('tags', v)}
                searchPlaceholder="Search tags..."
                drawerOpen={open}
              />
            </div>
          </div>

          {/* ── Task Due Date ── */}
          <div className="border-t border-gray-100 px-5 py-5">
            <SectionHeader
              icon={<CalendarRange size={18} strokeWidth={1.8} />}
              label="Task Due Date"
            />
            <SingleSelectDropdown
              label="Due Date Filter"
              options={TASK_FILTER_OPTIONS.dueDatePresets}
              value={pending.dueDateFilter}
              onChange={v => set('dueDateFilter', v)}
              drawerOpen={open}
            />
            {pending.dueDateFilter === 'Custom Date Range' && (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1.5 text-[13px] font-medium text-gray-900">Start Date</p>
                  <DatePicker
                    value={pending.dueDateStart}
                    onChange={v => set('dueDateStart', v)}
                    max={pending.dueDateEnd || undefined}
                    placeholder="Select start date"
                  />
                </div>
                <div>
                  <p className="mb-1.5 text-[13px] font-medium text-gray-900">End Date</p>
                  <DatePicker
                    value={pending.dueDateEnd}
                    onChange={v => set('dueDateEnd', v)}
                    min={pending.dueDateStart || undefined}
                    placeholder="Select end date"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="h-4" />
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            onClick={onReset}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 py-2.5 text-[13px] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RotateCcw size={13} />
            Reset All
          </button>
        </div>
      </div>

      {confirmDeleteNode}
    </>
  );
}
