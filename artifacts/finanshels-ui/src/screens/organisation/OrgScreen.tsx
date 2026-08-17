'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, MoreHorizontal, Pencil, PowerOff, Power,
  ArrowLeft, Building2, Layers, Users, SearchX, CircleAlert, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Empty } from '@/components/ui/empty';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { DrawerField, DrawerInput, DrawerTextarea } from '@/components/ui/drawer-fields';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { SearchInput } from '@/components/ui/search-input';
import { toast } from 'sonner';
import {
  type Department, type Vertical, type Team, type OrgStatus,
} from './mock-data';
import { useOrgContext } from '@/contexts/OrgContext';

/* ─── helpers ──────────────────────────────────────────────────────────── */

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function StatusBadge({ status }: { status: OrgStatus }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full border px-2.5 py-[3px] text-[12px] font-medium',
      status === 'Active'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-gray-200 bg-gray-100 text-gray-500',
    )}>
      {status}
    </span>
  );
}

/* ─── Tiny action-menu popover ─────────────────────────────────────────── */

function ActionMenu({ onEdit, onToggle, isActive }: {
  onEdit: () => void;
  onToggle: () => void;
  isActive: boolean;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return;
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.right - 152 });
    }
    function close(e: MouseEvent) {
      const t = e.target as Node;
      if (!btnRef.current?.contains(t) && !menuRef.current?.contains(t)) setOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
      >
        <MoreHorizontal size={16} />
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999, width: 152 }}
          className="overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-xl"
        >
          <button
            type="button"
            onClick={() => { setOpen(false); onEdit(); }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Pencil size={13} className="text-gray-400" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); onToggle(); }}
            className={cn(
              'flex w-full items-center gap-2.5 px-3 py-2 text-[13px] transition-colors hover:bg-gray-50',
              isActive ? 'text-red-600' : 'text-emerald-600',
            )}
          >
            {isActive
              ? <PowerOff size={13} className="text-red-400" />
              : <Power size={13} className="text-emerald-500" />}
            {isActive ? 'Deactivate' : 'Reactivate'}
          </button>
        </div>,
        document.body,
      )}
    </>
  );
}

/* ─── Shared right-side drawer ─────────────────────────────────────────── */

interface OrgDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  onSave: () => void;
  canSave: boolean;
  children: React.ReactNode;
}

function OrgDrawer({ open, onClose, title, onSave, canSave, children }: OrgDrawerProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

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
      <div className={cn(
        'fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-2xl transition-transform duration-300 ease-out sm:w-[36rem]',
        open ? 'translate-x-0' : 'translate-x-full',
      )}>
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-5 py-[14px]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={17} />
            </button>
            <span className="text-[15px] font-semibold text-gray-900">{title}</span>
          </div>
          <button
            type="button"
            onClick={onSave}
            disabled={!canSave}
            className={cn(
              'rounded-lg px-4 py-[7px] text-[13px] font-semibold text-white transition-colors',
              canSave ? 'bg-brand hover:bg-brand-hover' : 'bg-orange-200 cursor-not-allowed',
            )}
          >
            Save
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-5 px-5 py-5">
            {children}
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(content, document.body);
}

/* ─── Deactivate / Reactivate dialog ──────────────────────────────────── */

interface ToggleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityName: string;
  action: 'deactivate' | 'reactivate';
  onConfirm: () => void;
}

function ToggleDialog({ open, onOpenChange, entityName, action, onConfirm }: ToggleDialogProps) {
  const isDeactivate = action === 'deactivate';
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] rounded-2xl p-6">
        {/* Icon badge */}
        <div className={cn(
          'flex h-10 w-10 items-center justify-center rounded-full',
          isDeactivate ? 'bg-red-50' : 'bg-emerald-50',
        )}>
          {isDeactivate
            ? <CircleAlert size={20} className="text-red-500" />
            : <RefreshCw   size={20} className="text-emerald-500" />}
        </div>

        <DialogHeader className="gap-0 text-left">
          <DialogTitle className="mt-4 text-[16px] font-semibold text-gray-900">
            {isDeactivate ? 'Deactivate this item?' : 'Reactivate this item?'}
          </DialogTitle>
          <DialogDescription className="mt-2 text-[13.5px] leading-relaxed text-gray-500">
            {isDeactivate ? (
              <>
                Are you sure you want to deactivate{' '}
                <span className="font-medium text-gray-700">&ldquo;{entityName}&rdquo;</span>?{' '}
                It will remain visible but cannot be assigned to new items.
              </>
            ) : (
              <>
                Are you sure you want to reactivate{' '}
                <span className="font-medium text-gray-700">&ldquo;{entityName}&rdquo;</span>?{' '}
                It will be restored to active status and available for assignments again.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6 gap-2 sm:space-x-0">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => { onConfirm(); onOpenChange(false); }}
            className={cn(
              'flex-1 rounded-lg px-4 py-2.5 text-[13px] font-medium text-white transition-colors',
              isDeactivate ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600',
            )}
          >
            {isDeactivate ? 'Deactivate' : 'Reactivate'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Department select (for Vertical / Team drawer) ────────────────────── */

function DeptSelect({
  departments,
  value,
  onChange,
}: {
  departments: Department[];
  value: string;
  onChange: (id: string) => void;
}) {
  const activeDepts = departments.filter(d => d.status === 'Active');
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger
        aria-label="Select department"
        className={cn(
          'h-11 w-full rounded-xl border bg-white px-3.5 text-[13px] transition-colors',
          'focus:outline-none focus:ring-1 focus:ring-brand/20 [&>svg]:text-gray-400',
          value
            ? 'border-brand focus:border-brand'
            : 'border-gray-200 text-gray-400 focus:border-brand',
          '[&>span]:truncate',
        )}
      >
        <SelectValue placeholder="Select department…" />
      </SelectTrigger>
      <SelectContent className="z-[200] rounded-xl border border-gray-100 bg-white shadow-xl">
        {activeDepts.map(d => (
          <SelectItem
            key={d.id}
            value={d.id}
            className="cursor-pointer rounded-lg py-2.5 pl-3 pr-8 text-[13px] text-gray-800 focus:bg-orange-50 focus:text-brand data-[state=checked]:font-medium"
          >
            {d.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ─── Shared Projects-style search bar ───────────────────────────────── */

function OrgSearch({ value, onChange, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <SearchInput
      value={value}
      onChange={onChange}
      placeholder={placeholder ?? 'Search…'}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   DEPARTMENTS TAB
   ═══════════════════════════════════════════════════════════════════════ */

interface DepartmentsTabProps {
  departments: Department[];
  verticals: Vertical[];
  teams: Team[];
  onDepartmentsChange: (d: Department[]) => void;
}

function DepartmentsTab({ departments, verticals, teams, onDepartmentsChange }: DepartmentsTabProps) {
  const [search, setSearch] = useState('');

  /* Drawer state */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editId,     setEditId]     = useState<string | null>(null);
  const [formName,   setFormName]   = useState('');
  const [formDesc,   setFormDesc]   = useState('');

  /* Toggle dialog */
  const [toggleTarget, setToggleTarget] = useState<Department | null>(null);

  function openCreate() {
    setEditId(null);
    setFormName('');
    setFormDesc('');
    setDrawerOpen(true);
  }

  function openEdit(dept: Department) {
    setEditId(dept.id);
    setFormName(dept.name);
    setFormDesc(dept.description);
    setDrawerOpen(true);
  }

  function handleSave() {
    const name = formName.trim();
    if (!name) return;
    if (editId) {
      onDepartmentsChange(departments.map(d =>
        d.id === editId ? { ...d, name, description: formDesc.trim() } : d,
      ));
      toast.success('Department updated');
    } else {
      const next: Department = {
        id: makeId(),
        name,
        description: formDesc.trim(),
        status: 'Active',
        createdAt: new Date().toISOString().slice(0, 10),
      };
      onDepartmentsChange([...departments, next]);
      toast.success('Department created');
    }
    setDrawerOpen(false);
  }

  function handleToggle(dept: Department) {
    const next = dept.status === 'Active' ? 'Inactive' : 'Active';
    onDepartmentsChange(departments.map(d => d.id === dept.id ? { ...d, status: next } : d));
    toast.success(`Department ${next === 'Active' ? 'reactivated' : 'deactivated'}`);
    setToggleTarget(null);
  }

  const filtered = departments.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.description.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <OrgSearch value={search} onChange={setSearch} placeholder="Search departments..." />
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-brand-hover transition-colors"
        >
          <Plus size={14} />
          New Department
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-200 bg-gray-50 hover:bg-gray-50">
              <TableHead className="pl-5 text-[10px] font-semibold uppercase tracking-widest text-gray-500 w-[260px]">
                Department
              </TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                Description
              </TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 w-[90px] text-center">
                Verticals
              </TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 w-[80px] text-center">
                Teams
              </TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 w-[100px]">
                Status
              </TableHead>
              <TableHead className="w-[52px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-0">
                  <Empty
                    icon={search ? SearchX : Building2}
                    title={search ? 'No matching departments' : 'No departments yet'}
                    description={search
                      ? 'Try adjusting your search to find what you’re looking for.'
                      : 'Create a department to start organising your teams and verticals.'}
                    className="py-16"
                  />
                </TableCell>
              </TableRow>
            ) : filtered.map(dept => {
              const vertCount = verticals.filter(v => v.departmentId === dept.id).length;
              const teamCount = teams.filter(t => t.departmentId === dept.id).length;
              const isInactive = dept.status === 'Inactive';
              return (
                <TableRow
                  key={dept.id}
                  className={cn(
                    'border-b border-gray-100 transition-colors hover:bg-gray-50/70',
                    isInactive && 'opacity-60',
                  )}
                >
                  <TableCell className="pl-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-brand/10">
                        <Building2 size={13} className="text-brand" />
                      </span>
                      <span className="text-[13.5px] font-semibold text-gray-900">{dept.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3.5 pr-4">
                    <span className="line-clamp-1 text-[13px] text-gray-600">{dept.description || '—'}</span>
                  </TableCell>
                  <TableCell className="py-3.5 text-center text-[13px] font-medium text-gray-700">
                    {vertCount}
                  </TableCell>
                  <TableCell className="py-3.5 text-center text-[13px] font-medium text-gray-700">
                    {teamCount}
                  </TableCell>
                  <TableCell className="py-3.5">
                    <StatusBadge status={dept.status} />
                  </TableCell>
                  <TableCell className="py-3.5 pr-3">
                    <ActionMenu
                      isActive={dept.status === 'Active'}
                      onEdit={() => openEdit(dept)}
                      onToggle={() => setToggleTarget(dept)}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Drawer */}
      <OrgDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editId ? 'Edit Department' : 'New Department'}
        onSave={handleSave}
        canSave={formName.trim().length > 0}
      >
        <DrawerField label="Department Name" required>
          <DrawerInput
            value={formName}
            onChange={e => setFormName(e.target.value)}
            placeholder="e.g. Accounting"
          />
        </DrawerField>
        <DrawerField label="Description">
          <DrawerTextarea
            value={formDesc}
            onChange={e => setFormDesc(e.target.value)}
            placeholder="Brief description of this department's responsibilities…"
            rows={4}
          />
        </DrawerField>
      </OrgDrawer>

      {/* Toggle dialog */}
      {toggleTarget && (
        <ToggleDialog
          open={Boolean(toggleTarget)}
          onOpenChange={open => { if (!open) setToggleTarget(null); }}
          entityName={toggleTarget.name}
          action={toggleTarget.status === 'Active' ? 'deactivate' : 'reactivate'}
          onConfirm={() => handleToggle(toggleTarget)}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   VERTICALS TAB
   ═══════════════════════════════════════════════════════════════════════ */

interface VerticalsTabProps {
  departments: Department[];
  verticals: Vertical[];
  onVerticalsChange: (v: Vertical[]) => void;
}

function VerticalsTab({ departments, verticals, onVerticalsChange }: VerticalsTabProps) {
  const [search,     setSearch]     = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editId,     setEditId]     = useState<string | null>(null);
  const [formName,   setFormName]   = useState('');
  const [formDesc,   setFormDesc]   = useState('');
  const [formDeptId, setFormDeptId] = useState('');
  const [toggleTarget, setToggleTarget] = useState<Vertical | null>(null);

  function openCreate() {
    setEditId(null); setFormName(''); setFormDesc(''); setFormDeptId('');
    setDrawerOpen(true);
  }

  function openEdit(v: Vertical) {
    setEditId(v.id); setFormName(v.name); setFormDesc(v.description); setFormDeptId(v.departmentId);
    setDrawerOpen(true);
  }

  function handleSave() {
    const name = formName.trim();
    if (!name || !formDeptId) return;
    if (editId) {
      onVerticalsChange(verticals.map(v =>
        v.id === editId ? { ...v, name, description: formDesc.trim(), departmentId: formDeptId } : v,
      ));
      toast.success('Vertical updated');
    } else {
      onVerticalsChange([...verticals, {
        id: makeId(), name, description: formDesc.trim(),
        departmentId: formDeptId, status: 'Active',
        createdAt: new Date().toISOString().slice(0, 10),
      }]);
      toast.success('Vertical created');
    }
    setDrawerOpen(false);
  }

  function handleToggle(v: Vertical) {
    const next: OrgStatus = v.status === 'Active' ? 'Inactive' : 'Active';
    onVerticalsChange(verticals.map(item => item.id === v.id ? { ...item, status: next } : item));
    toast.success(`Vertical ${next === 'Active' ? 'reactivated' : 'deactivated'}`);
    setToggleTarget(null);
  }

  const deptMap = Object.fromEntries(departments.map(d => [d.id, d.name]));

  const filtered = verticals.filter(v => {
    const q = search.toLowerCase();
    return (
      v.name.toLowerCase().includes(q) ||
      v.description.toLowerCase().includes(q) ||
      (deptMap[v.departmentId] ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <OrgSearch value={search} onChange={setSearch} placeholder="Search verticals..." />
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-brand-hover transition-colors"
        >
          <Plus size={14} />
          New Vertical
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-200 bg-gray-50 hover:bg-gray-50">
              <TableHead className="pl-5 text-[10px] font-semibold uppercase tracking-widest text-gray-500 w-[220px]">Vertical</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">Description</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 w-[160px]">Department</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 w-[100px]">Status</TableHead>
              <TableHead className="w-[52px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-0">
                  <Empty
                    icon={search ? SearchX : Layers}
                    title={search ? 'No matching verticals' : 'No verticals yet'}
                    description={search
                      ? 'Try adjusting your search to find what you’re looking for.'
                      : 'Create a vertical to define a service area within a department.'}
                    className="py-16"
                  />
                </TableCell>
              </TableRow>
            ) : filtered.map(v => (
              <TableRow
                key={v.id}
                className={cn(
                  'border-b border-gray-100 transition-colors hover:bg-gray-50/70',
                  v.status === 'Inactive' && 'opacity-60',
                )}
              >
                <TableCell className="pl-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-violet-50">
                      <Layers size={13} className="text-violet-500" />
                    </span>
                    <span className="text-[13.5px] font-semibold text-gray-900">{v.name}</span>
                  </div>
                </TableCell>
                <TableCell className="py-3.5 pr-4">
                  <span className="line-clamp-1 text-[13px] text-gray-600">{v.description || '—'}</span>
                </TableCell>
                <TableCell className="py-3.5">
                  <span className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-[12px] font-medium text-gray-700">
                    {deptMap[v.departmentId] ?? '—'}
                  </span>
                </TableCell>
                <TableCell className="py-3.5">
                  <StatusBadge status={v.status} />
                </TableCell>
                <TableCell className="py-3.5 pr-3">
                  <ActionMenu
                    isActive={v.status === 'Active'}
                    onEdit={() => openEdit(v)}
                    onToggle={() => setToggleTarget(v)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <OrgDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editId ? 'Edit Vertical' : 'New Vertical'}
        onSave={handleSave}
        canSave={formName.trim().length > 0 && Boolean(formDeptId)}
      >
        <DrawerField label="Vertical Name" required>
          <DrawerInput
            value={formName}
            onChange={e => setFormName(e.target.value)}
            placeholder="e.g. VAT Services"
          />
        </DrawerField>
        <DrawerField label="Department" required>
          <DeptSelect departments={departments} value={formDeptId} onChange={setFormDeptId} />
        </DrawerField>
        <DrawerField label="Description">
          <DrawerTextarea
            value={formDesc}
            onChange={e => setFormDesc(e.target.value)}
            placeholder="Brief description of this vertical…"
            rows={4}
          />
        </DrawerField>
      </OrgDrawer>

      {toggleTarget && (
        <ToggleDialog
          open={Boolean(toggleTarget)}
          onOpenChange={open => { if (!open) setToggleTarget(null); }}
          entityName={toggleTarget.name}
          action={toggleTarget.status === 'Active' ? 'deactivate' : 'reactivate'}
          onConfirm={() => handleToggle(toggleTarget)}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   TEAMS TAB
   ═══════════════════════════════════════════════════════════════════════ */

interface TeamsTabProps {
  departments: Department[];
  teams: Team[];
  onTeamsChange: (t: Team[]) => void;
}

function TeamsTab({ departments, teams, onTeamsChange }: TeamsTabProps) {
  const [search,     setSearch]     = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editId,     setEditId]     = useState<string | null>(null);
  const [formName,   setFormName]   = useState('');
  const [formDesc,   setFormDesc]   = useState('');
  const [formDeptId, setFormDeptId] = useState('');
  const [toggleTarget, setToggleTarget] = useState<Team | null>(null);

  function openCreate() {
    setEditId(null); setFormName(''); setFormDesc(''); setFormDeptId('');
    setDrawerOpen(true);
  }

  function openEdit(t: Team) {
    setEditId(t.id); setFormName(t.name); setFormDesc(t.description); setFormDeptId(t.departmentId);
    setDrawerOpen(true);
  }

  function handleSave() {
    const name = formName.trim();
    if (!name || !formDeptId) return;
    if (editId) {
      onTeamsChange(teams.map(t =>
        t.id === editId ? { ...t, name, description: formDesc.trim(), departmentId: formDeptId } : t,
      ));
      toast.success('Team updated');
    } else {
      onTeamsChange([...teams, {
        id: makeId(), name, description: formDesc.trim(),
        departmentId: formDeptId, status: 'Active',
        createdAt: new Date().toISOString().slice(0, 10),
      }]);
      toast.success('Team created');
    }
    setDrawerOpen(false);
  }

  function handleToggle(t: Team) {
    const next: OrgStatus = t.status === 'Active' ? 'Inactive' : 'Active';
    onTeamsChange(teams.map(item => item.id === t.id ? { ...item, status: next } : item));
    toast.success(`Team ${next === 'Active' ? 'reactivated' : 'deactivated'}`);
    setToggleTarget(null);
  }

  const deptMap = Object.fromEntries(departments.map(d => [d.id, d.name]));

  const filtered = teams.filter(t => {
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      (deptMap[t.departmentId] ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <OrgSearch value={search} onChange={setSearch} placeholder="Search teams..." />
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-brand-hover transition-colors"
        >
          <Plus size={14} />
          New Team
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-200 bg-gray-50 hover:bg-gray-50">
              <TableHead className="pl-5 text-[10px] font-semibold uppercase tracking-widest text-gray-500 w-[220px]">Team</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">Description</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 w-[160px]">Department</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 w-[100px]">Status</TableHead>
              <TableHead className="w-[52px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-0">
                  <Empty
                    icon={search ? SearchX : Users}
                    title={search ? 'No matching teams' : 'No teams yet'}
                    description={search
                      ? 'Try adjusting your search to find what you’re looking for.'
                      : 'Create a team to start assigning work within a department.'}
                    className="py-16"
                  />
                </TableCell>
              </TableRow>
            ) : filtered.map(t => (
              <TableRow
                key={t.id}
                className={cn(
                  'border-b border-gray-100 transition-colors hover:bg-gray-50/70',
                  t.status === 'Inactive' && 'opacity-60',
                )}
              >
                <TableCell className="pl-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50">
                      <Users size={13} className="text-blue-500" />
                    </span>
                    <span className="text-[13.5px] font-semibold text-gray-900">{t.name}</span>
                  </div>
                </TableCell>
                <TableCell className="py-3.5 pr-4">
                  <span className="line-clamp-1 text-[13px] text-gray-600">{t.description || '—'}</span>
                </TableCell>
                <TableCell className="py-3.5">
                  <span className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-[12px] font-medium text-gray-700">
                    {deptMap[t.departmentId] ?? '—'}
                  </span>
                </TableCell>
                <TableCell className="py-3.5">
                  <StatusBadge status={t.status} />
                </TableCell>
                <TableCell className="py-3.5 pr-3">
                  <ActionMenu
                    isActive={t.status === 'Active'}
                    onEdit={() => openEdit(t)}
                    onToggle={() => setToggleTarget(t)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <OrgDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editId ? 'Edit Team' : 'New Team'}
        onSave={handleSave}
        canSave={formName.trim().length > 0 && Boolean(formDeptId)}
      >
        <DrawerField label="Team Name" required>
          <DrawerInput
            value={formName}
            onChange={e => setFormName(e.target.value)}
            placeholder="e.g. VAT Filing Team"
          />
        </DrawerField>
        <DrawerField label="Department" required>
          <DeptSelect departments={departments} value={formDeptId} onChange={setFormDeptId} />
        </DrawerField>
        <DrawerField label="Description">
          <DrawerTextarea
            value={formDesc}
            onChange={e => setFormDesc(e.target.value)}
            placeholder="Brief description of this team's purpose…"
            rows={4}
          />
        </DrawerField>
      </OrgDrawer>

      {toggleTarget && (
        <ToggleDialog
          open={Boolean(toggleTarget)}
          onOpenChange={open => { if (!open) setToggleTarget(null); }}
          entityName={toggleTarget.name}
          action={toggleTarget.status === 'Active' ? 'deactivate' : 'reactivate'}
          onConfirm={() => handleToggle(toggleTarget)}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN SCREEN
   ═══════════════════════════════════════════════════════════════════════ */

export function OrgScreen({ hideHeader = false }: { hideHeader?: boolean }) {
  const {
    departments, setDepartments,
    verticals,   setVerticals,
    teams,       setTeams,
  } = useOrgContext();

  const activeDepts  = departments.filter(d => d.status === 'Active').length;
  const activeVerts  = verticals.filter(v => v.status === 'Active').length;
  const activeTeams  = teams.filter(t => t.status === 'Active').length;

  return (
    <div className="px-6 py-6 lg:px-8">
      {/* Page header */}
      {!hideHeader && (
        <div className="mb-6">
          <h1 className="text-[20px] font-bold text-gray-900">Organisation</h1>
          <p className="mt-0.5 text-[13.5px] text-gray-500">
            Manage your organisation's departments, verticals, and teams.
          </p>
        </div>
      )}

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          { label: 'Departments', count: activeDepts, total: departments.length, icon: Building2, color: 'text-brand', bg: 'bg-brand/10' },
          { label: 'Verticals',   count: activeVerts, total: verticals.length,   icon: Layers,    color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Teams',       count: activeTeams, total: teams.length,       icon: Users,     color: 'text-blue-600',   bg: 'bg-blue-50'   },
        ].map(({ label, count, total, icon: Icon, color, bg }) => (
          <div key={label} className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <span className={cn('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl', bg)}>
              <Icon size={18} className={color} />
            </span>
            <div>
              <p className="text-[22px] font-bold leading-none text-gray-900">{count}</p>
              <p className="mt-0.5 text-[12px] text-gray-500">{label} active of {total}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Line tabs */}
      <Tabs defaultValue="departments">
        <TabsList className="mb-5 h-auto w-full justify-start gap-0 overflow-x-auto rounded-none border-b border-gray-200 bg-transparent p-0">
          <TabsTrigger
            value="departments"
            className="relative flex-none rounded-none border-b-2 border-transparent px-2.5 py-3 text-[12px] font-medium text-gray-500 transition-colors hover:text-gray-800 data-[state=active]:border-brand data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-gray-900 data-[state=active]:shadow-none sm:px-4 sm:text-[13px]"
          >
            Departments
          </TabsTrigger>
          <TabsTrigger
            value="verticals"
            className="relative flex-none rounded-none border-b-2 border-transparent px-2.5 py-3 text-[12px] font-medium text-gray-500 transition-colors hover:text-gray-800 data-[state=active]:border-brand data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-gray-900 data-[state=active]:shadow-none sm:px-4 sm:text-[13px]"
          >
            Verticals
          </TabsTrigger>
          <TabsTrigger
            value="teams"
            className="relative flex-none rounded-none border-b-2 border-transparent px-2.5 py-3 text-[12px] font-medium text-gray-500 transition-colors hover:text-gray-800 data-[state=active]:border-brand data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-gray-900 data-[state=active]:shadow-none sm:px-4 sm:text-[13px]"
          >
            Teams
          </TabsTrigger>
        </TabsList>

        <TabsContent value="departments" className="mt-0">
          <DepartmentsTab
            departments={departments}
            verticals={verticals}
            teams={teams}
            onDepartmentsChange={setDepartments}
          />
        </TabsContent>

        <TabsContent value="verticals" className="mt-0">
          <VerticalsTab
            departments={departments}
            verticals={verticals}
            onVerticalsChange={setVerticals}
          />
        </TabsContent>

        <TabsContent value="teams" className="mt-0">
          <TeamsTab
            departments={departments}
            teams={teams}
            onTeamsChange={setTeams}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
