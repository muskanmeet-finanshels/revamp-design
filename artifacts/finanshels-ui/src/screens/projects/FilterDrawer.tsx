'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle, ArrowLeft, Bookmark, Building2, CalendarRange, Check, ChevronDown, ChevronUp, CircleAlert,
  Pencil, RotateCcw, Search, Trash2, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DrawerInput } from '@/components/ui/drawer-fields';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

/* ─────────────────────────────── saved-filter storage ──────────────────── */

export interface SavedFilter {
  id:           string;
  name:         string;
  filters:      FilterState;
  createdAt:    number;
  isDefault?:   boolean;
}

function useSavedFilters(storageKey: string) {
  const [saved, setSaved] = useState<SavedFilter[]>([]);
  const [hydrated, setHydrated] = useState(false);

  /* hydrate from localStorage after first client render */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setSaved(JSON.parse(raw) as SavedFilter[]);
    } catch { /* ignore */ }
    setHydrated(true);
  }, [storageKey]);

  function persist(next: SavedFilter[]) {
    setSaved(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignore */ }
  }

  const MAX_SAVED = 20;

  function saveFilter(name: string, filters: FilterState, isDefault = false): boolean {
    if (saved.length >= MAX_SAVED) return false;
    const entry: SavedFilter = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim() || 'Untitled filter',
      filters,
      createdAt: Date.now(),
      isDefault,
    };
    const base = isDefault ? saved.map(f => ({ ...f, isDefault: false })) : saved;
    persist([entry, ...base]);
    return true;
  }

  function deleteFilter(id: string) {
    persist(saved.filter(f => f.id !== id));
  }

  function setAsDefault(id: string | null) {
    persist(saved.map(f => ({ ...f, isDefault: f.id === id })));
  }

  function renameFilter(id: string, name: string) {
    persist(saved.map(f => f.id === id ? { ...f, name: name.trim() || f.name } : f));
  }

  const atCap = hydrated && saved.length >= MAX_SAVED;

  return { saved: hydrated ? saved : [], saveFilter, deleteFilter, setAsDefault, renameFilter, atCap, MAX_SAVED };
}

/* ─────────────────────────────── option lists ───────────────────────────── */

export const FILTER_OPTIONS = {
  departments: ['Accounting', 'Finance', 'IT', 'Technology', 'HR', 'Compliance', 'Audit'],
  services:    ['Accounting', 'Finance', 'IT', 'Technology', 'HR', 'Compliance', 'Audit'],
  dueDays:     ['Today', '1–7 Days', '8–14 Days', '15–30 Days', '30–60 Days', '60+ Days'],
  overdueDays: ['1–10 Days', '10–30 Days', '30–60 Days', '60+ Days'],
  clients:     ['Nexora', 'Finovo', 'Lumo', 'Talvo', 'Orvix', 'Stratco'],
  assignees: [
    'Arjun Kumar', 'Aisha Mohammed', 'Ivan Xavier', 'Ali Tariq', 'David Kim',
    'Karim Tahir', 'Paulo Torres', 'Meera Nair', 'Mohammed Khan', 'Laura Nixon',
    'Grace Hassan', 'Rania Williams', 'Sofia Khan', 'Jamal Malik', 'Nadia Khan',
    'Omar Abdulla', 'Maya Thomas', 'Rami El-Sayed', 'Sara Ali', 'Tina Patel',
    'Karen Simmons', 'Vera Chen', 'Sarah Nasser', 'Hassan Khalid', 'Omar Rahman',
    'Nadia Saleh', 'Priya Nair', 'Qasim Ahmed', 'Yousef Mansour', 'Elena Flores',
    'Bilal Ebrahim', 'Thomas Wright', 'Maya Martinez', 'Tariq Ibrahim',
  ],
  tags:         ['Tax Filing', 'Bookkeeping', 'Registration', 'Payroll', 'Audit', 'Compliance', 'HR'],
  dueDatePresets: ['All dates', 'Today', 'This Week', 'This Month', 'Custom Date Range'],
} as const;

/* ─────────────────────────────── filter state ───────────────────────────── */

export interface FilterState {
  departments:    string[];
  services:       string[];
  dueDays:        string[];
  overdueDays:    string[];
  clients:        string[];
  assignees:      string[];
  tags:           string[];
  dueDatePresets: string[];
  periodFrom:     string;
  periodTo:       string;
}

export const EMPTY_FILTERS: FilterState = {
  departments: [], services: [], dueDays: [], overdueDays: [],
  clients: [], assignees: [], tags: [], dueDatePresets: [],
  periodFrom: '', periodTo: '',
};

export function countActiveFilters(f: FilterState): number {
  return (
    (f.departments.length > 0 ? 1 : 0) +
    (f.services.length > 0 ? 1 : 0) +
    (f.dueDays.length > 0 ? 1 : 0) +
    (f.overdueDays.length > 0 ? 1 : 0) +
    (f.clients.length > 0 ? 1 : 0) +
    (f.assignees.length > 0 ? 1 : 0) +
    (f.tags.length > 0 ? 1 : 0) +
    (f.dueDatePresets.length > 0 ? 1 : 0) +
    (f.periodFrom ? 1 : 0) + (f.periodTo ? 1 : 0)
  );
}

/* Validate a saved FilterState against the current FILTER_OPTIONS.
   Strips any stored values that no longer exist and returns the cleaned
   state plus a record of { fieldLabel → removedCount } for user feedback. */
const FILTER_OPTION_KEYS: Array<{
  key:     keyof Pick<FilterState, 'departments'|'services'|'dueDays'|'overdueDays'|'clients'|'assignees'|'tags'|'dueDatePresets'>;
  options: readonly string[];
  label:   string;
}> = [
  { key: 'departments',    options: FILTER_OPTIONS.departments,    label: 'Department' },
  { key: 'services',       options: FILTER_OPTIONS.services,       label: 'Service' },
  { key: 'dueDays',        options: FILTER_OPTIONS.dueDays,        label: 'Due Days' },
  { key: 'overdueDays',    options: FILTER_OPTIONS.overdueDays,    label: 'Overdue Days' },
  { key: 'clients',        options: FILTER_OPTIONS.clients,        label: 'Client Name' },
  { key: 'assignees',      options: FILTER_OPTIONS.assignees,      label: 'Assignee' },
  { key: 'tags',           options: FILTER_OPTIONS.tags,           label: 'Tags' },
  { key: 'dueDatePresets', options: FILTER_OPTIONS.dueDatePresets, label: 'Due Date' },
];
function Checkbox({
  checked, onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
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

  /* Force-close panel when drawer closes */
  useEffect(() => {
    if (!drawerOpen) {
      setOpen(false);
      setQuery('');
    }
  }, [drawerOpen]);

  function getPosition() {
    if (!triggerRef.current) return null;
    const r = triggerRef.current.getBoundingClientRect();
    return { position: 'fixed' as const, top: r.bottom + 4, left: r.left, width: r.width, zIndex: 9999 };
  }

  /* Position the fixed panel under the trigger button */
  useLayoutEffect(() => {
    if (!open) return;
    const pos = getPosition();
    if (pos) setPanelStyle(pos);
  }, [open]);

  /* Focus the search without asking the drawer/page to scroll it into view */
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      searchRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        panelRef.current   && !panelRef.current.contains(target)
      ) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  /* Freeze the drawer content behind the dropdown. The options list remains
     independently scrollable, so opening a field never moves the other fields. */
  useEffect(() => {
    if (!open || !triggerRef.current) return;

    let ancestor: HTMLElement | null = triggerRef.current.parentElement;
    while (ancestor) {
      const { overflowY } = window.getComputedStyle(ancestor);
      if (overflowY === 'auto' || overflowY === 'scroll') break;
      ancestor = ancestor.parentElement;
    }

    if (!ancestor) return;
    const previousOverflowY = ancestor.style.overflowY;
    ancestor.style.overflowY = 'hidden';
    return () => {
      ancestor.style.overflowY = previousOverflowY;
    };
  }, [open]);

  /* Reposition on scroll (capture phase catches the drawer's inner scroll) or resize */
  useEffect(() => {
    if (!open) return;
    function reposition() {
      const pos = getPosition();
      if (pos) setPanelStyle(pos);
    }
    /* Find the nearest scrollable ancestor once and cache it */
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

  const visible = query
    ? options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
    : options;

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
      {/* Search */}
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

      {/* Options */}
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

      {/* "Clear N selected" footer */}
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
      {/* Field label */}
      <p className="mb-1.5 text-[13px] font-medium text-gray-900">{label}</p>

      {/* Trigger */}
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

      {/* Portal: render panel outside the overflow-y-auto drawer */}
      {typeof document !== 'undefined' && panel
        ? createPortal(panel, document.body)
        : null}
    </div>
  );
}

function SingleSelectDropdown({
  label, options, value, onChange, drawerOpen,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  drawerOpen: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!drawerOpen) setOpen(false);
  }, [drawerOpen]);

  function getPosition() {
    if (!triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();
    return {
      position: 'fixed' as const,
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    };
  }

  useLayoutEffect(() => {
    if (!open) return;
    const position = getPosition();
    if (position) setPanelStyle(position);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function closeOnOutsideClick(event: MouseEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        panelRef.current && !panelRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function reposition() {
      const position = getPosition();
      if (position) setPanelStyle(position);
    }
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open]);

  const panel = open ? (
    <div
      ref={panelRef}
      style={{ position: 'fixed', ...panelStyle }}
      className="fixed overflow-hidden rounded-xl border border-gray-100 bg-white p-2 shadow-xl"
    >
      <ul>
        {options.map(option => (
          <li key={option}>
            <button
              type="button"
              onClick={() => { onChange(option); setOpen(false); }}
              className={cn(
                'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] transition-colors',
                value === option
                  ? 'bg-orange-50 font-medium text-brand'
                  : 'text-gray-800 hover:bg-gray-100',
              )}
            >
              {option}
              {value === option && <Check size={13} className="flex-shrink-0 text-brand" strokeWidth={2.5} />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  ) : null;

  return (
    <div>
      <p className="mb-1.5 text-[13px] font-medium text-gray-900">{label}</p>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(current => !current)}
        className={cn(
          'flex h-11 w-full items-center justify-between rounded-xl border bg-white px-4 text-[13px] transition-colors focus:outline-none',
          open || value !== 'All dates' ? 'border-brand' : 'border-gray-200 hover:border-gray-300',
        )}
      >
        <span className={cn(
          'truncate text-left',
          value !== 'All dates' ? 'text-gray-900' : 'text-gray-600',
        )}>
          {value}
        </span>
        {open
          ? <ChevronUp size={15} className="flex-shrink-0 text-gray-500" />
          : <ChevronDown size={15} className="flex-shrink-0 text-gray-400" />}
      </button>
      {typeof document !== 'undefined' && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}

/* ─────────────────────────────── section header ────────────────────────── */

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center text-brand">
        {icon}
      </span>
      <span className="text-[14px] font-semibold text-gray-900">{label}</span>
    </div>
  );
}

/* ─────────────────────────────── drawer ────────────────────────────────── */

export interface FilterDrawerProps {
  open:             boolean;
  onClose:          () => void;
  pending:          FilterState;
  onChange:         (f: FilterState) => void;
  onApply:          () => void;
  onReset:          () => void;
  /** Apply a filter set directly — used by saved-filter rows to bypass pending state lag */
  onApplyDirect?:   (f: FilterState) => void;
  storageKey?:      string;
}

export function FilterDrawer({
  open, onClose, pending, onChange, onApply, onReset, onApplyDirect,
  storageKey = 'finanshels-projects-filters',
}: FilterDrawerProps) {
  const hasPendingFilters = countActiveFilters(pending) > 0;

  function set<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    onChange({ ...pending, [key]: value });
  }

  /* saved-filter state */
  const { saved, saveFilter, deleteFilter, renameFilter, atCap, MAX_SAVED } = useSavedFilters(storageKey);
  const [savePanelOpen, setSavePanelOpen]   = useState(false);
  const [saveName, setSaveName]             = useState('');
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
    if (!hasPendingFilters) return;
    if (atCap) { setSaveCapWarning(true); return; }
    saveFilter(saveName, pending);
    setSaveName('');
    setSavePanelOpen(false);
    setSaveCapWarning(false);
  }

  /* trap focus / prevent body scroll when drawer is open */
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
        {/* ── Header ────────────────────────────────────────────────── */}
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
                        {saved.map(sf => {
                            const { removedByField } = sanitizeSavedFilter(sf.filters);
                            const isStale   = Object.keys(removedByField).length > 0;
                            const isEditing = editingId === sf.id;
                            return (
                              <div
                                key={sf.id}
                                className={cn(
                                  'flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors',
                                  sf.isDefault ? 'bg-orange-50/70' : 'hover:bg-gray-50',
                                )}
                              >
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
                                      {isStale && (
                                        <span className="flex-shrink-0 text-amber-500" title="Some options no longer exist">
                                          <AlertTriangle size={12} strokeWidth={2.2} />
                                        </span>
                                      )}
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
                                        const { sanitized, removedByField } = sanitizeSavedFilter(sf.filters);
                                        const removedFields = Object.entries(removedByField);
                                        if (removedFields.length > 0) {
                                          const totalRemoved = removedFields.reduce((sum, [, n]) => sum + n, 0);
                                          const fieldList    = removedFields.map(([label]) => label).join(', ');
                                          toast.warning(
                                            `${totalRemoved} option${totalRemoved !== 1 ? 's' : ''} removed from "${sf.name}"`,
                                            { description: `${fieldList} had values that no longer exist and were cleared.`, duration: 6000 },
                                          );
                                        }
                                        if (onApplyDirect) { onApplyDirect(sanitized); }
                                        else { onChange(sanitized); onApply(); }
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

              {/* ── Save icon ── */}
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => { if (hasPendingFilters) setSavePanelOpen(v => !v); }}
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
                        savePanelOpen
                          ? 'bg-orange-50 text-brand'
                          : hasPendingFilters
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
                    {hasPendingFilters ? 'Save current filters' : 'Set filters to save'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* ── Apply ── */}
              <button
                type="button"
                onClick={() => {
                  if (!hasPendingFilters) return;
                  onApply();
                  onClose();
                }}
                disabled={!hasPendingFilters}
                className={cn(
                  'min-w-[106px] rounded-lg px-4 py-2 text-[13px] font-bold text-white shadow-[0_2px_5px_rgba(234,88,12,0.18)] transition-colors',
                  hasPendingFilters
                    ? 'bg-brand hover:bg-brand-hover'
                    : 'cursor-not-allowed bg-orange-200',
                )}
              >
                Apply Filter
              </button>
            </div>
          </div>

          {/* ── Inline save panel ── */}
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
                  onChange={e => { setSaveName(e.target.value); setSaveCapWarning(false); }}
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
                  onClick={() => { setSavePanelOpen(false); setSaveName(''); }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Body (scrollable) ─────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* Business Information */}
          <div className="px-5 py-5">
            <SectionHeader icon={<Building2 size={20} strokeWidth={1.8} />} label="Business Information" />
            <div className="space-y-4">
              <MultiSelectDropdown
                label="Department"
                placeholder="All Department"
                options={FILTER_OPTIONS.departments}
                selected={pending.departments}
                onChange={v => set('departments', v)}
                searchPlaceholder="Search department..."
                drawerOpen={open}
              />
              <MultiSelectDropdown
                label="Service"
                placeholder="All Service"
                options={FILTER_OPTIONS.services}
                selected={pending.services}
                onChange={v => set('services', v)}
                searchPlaceholder="Search service..."
                drawerOpen={open}
              />
              <MultiSelectDropdown
                label="Due Days"
                placeholder="Any"
                options={FILTER_OPTIONS.dueDays}
                selected={pending.dueDays}
                onChange={v => set('dueDays', v)}
                searchPlaceholder="Search due days..."
                drawerOpen={open}
              />
              <MultiSelectDropdown
                label="Overdue Days"
                placeholder="Any"
                options={FILTER_OPTIONS.overdueDays}
                selected={pending.overdueDays}
                onChange={v => set('overdueDays', v)}
                searchPlaceholder="Search overdue days..."
                drawerOpen={open}
              />
              <MultiSelectDropdown
                label="Client Name"
                placeholder="All Client Name"
                options={FILTER_OPTIONS.clients}
                selected={pending.clients}
                onChange={v => set('clients', v)}
                searchPlaceholder="Search client..."
                drawerOpen={open}
              />
              <MultiSelectDropdown
                label="Assignee"
                placeholder="All Assignee"
                options={FILTER_OPTIONS.assignees}
                selected={pending.assignees}
                onChange={v => set('assignees', v)}
                searchPlaceholder="Search assignee..."
                drawerOpen={open}
              />
              <MultiSelectDropdown
                label="Tags"
                placeholder="All Tags"
                options={FILTER_OPTIONS.tags}
                selected={pending.tags}
                onChange={v => set('tags', v)}
                searchPlaceholder="Search tags..."
                drawerOpen={open}
              />
            </div>
          </div>

          {/* Project Timeline */}
          <div className="border-t border-gray-100 px-5 py-5">
            <SectionHeader icon={<CalendarRange size={20} strokeWidth={1.8} />} label="Project Timeline" />
            <div className="space-y-4">
              <SingleSelectDropdown
                label="Due Date"
                options={FILTER_OPTIONS.dueDatePresets}
                value={pending.dueDatePresets[0] ?? 'All dates'}
                onChange={value => {
                  onChange({
                    ...pending,
                    dueDatePresets: value === 'All dates' ? [] : [value],
                  });
                }}
                drawerOpen={open}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-1.5 text-[13px] font-medium text-gray-900">Project Start Date</p>
                  <DatePicker
                    value={pending.periodFrom}
                    onChange={value => set('periodFrom', value)}
                    placeholder="Select start date"
                    max={pending.periodTo || undefined}
                  />
                </div>
                <div>
                  <p className="mb-1.5 text-[13px] font-medium text-gray-900">Project End Date</p>
                  <DatePicker
                    value={pending.periodTo}
                    onChange={value => set('periodTo', value)}
                    placeholder="Select end date"
                    min={pending.periodFrom || undefined}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* bottom breathing room */}
          <div className="h-4" />
        </div>

        {/* ── Footer ────────────────────────────────────────────────── */}
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

export function sanitizeSavedFilter(filters: FilterState): {
  sanitized: FilterState;
  removedByField: Record<string, number>;
} {
  const sanitized: FilterState = { ...filters };
  const removedByField: Record<string, number> = {};

  for (const { key, options, label } of FILTER_OPTION_KEYS) {
    const stored = filters[key] as string[];
    const valid  = stored.filter(v => (options as readonly string[]).includes(v));
    const diff   = stored.length - valid.length;
    if (diff > 0) {
      removedByField[label] = diff;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sanitized as any)[key] = valid;
    }
  }

  return { sanitized, removedByField };
}
