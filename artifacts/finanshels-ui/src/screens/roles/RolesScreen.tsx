'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, MoreHorizontal, Pencil, Copy, PowerOff, Power,
  ArrowLeft, Lock, Shield, Check, Search, X, AlertTriangle, Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { DrawerField, DrawerInput, DrawerTextarea } from '@/components/ui/drawer-fields';
import { toast } from 'sonner';
import {
  MOCK_ROLES, MODULES,
  allPermissionsFor, fullPermissions,
  type AppRole, type RoleType, type RoleStatus,
} from './mock-data';

/* ─── helpers ─────────────────────────────────────────────────────────── */

function makeId() { return `role-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

function countGranted(perms: Record<string, string[]>): number {
  return Object.values(perms).reduce((sum, arr) => sum + arr.length, 0);
}

function totalActions(): number {
  return MODULES.reduce((sum, m) => sum + m.actions.length, 0);
}

/* ─── Type badge ──────────────────────────────────────────────────────── */

function TypeBadge({ type, isProtected }: { type: RoleType; isProtected?: boolean }) {
  if (isProtected) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2 py-[2px] text-[11px] font-semibold text-violet-700">
        <Lock size={9} strokeWidth={3} /> Super Admin
      </span>
    );
  }
  return type === 'system' ? (
    <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-[2px] text-[11px] font-medium text-blue-700">
      <Shield size={10} /> System
    </span>
  ) : (
    <span className="inline-flex items-center rounded-md border border-orange-200 bg-orange-50 px-2 py-[2px] text-[11px] font-medium text-brand">
      Custom
    </span>
  );
}

/* ─── Status badge ────────────────────────────────────────────────────── */

function StatusBadge({ status }: { status: RoleStatus }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full border px-2.5 py-[3px] text-[11.5px] font-medium',
      status === 'Active'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-gray-200 bg-gray-100 text-gray-500',
    )}>
      {status}
    </span>
  );
}

/* ─── Permission coverage bar ─────────────────────────────────────────── */

function CoverageBar({ permissions }: { permissions: Record<string, string[]> }) {
  const granted = countGranted(permissions);
  const total   = totalActions();
  const pct     = Math.round((granted / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100">
        <div
          className={cn('h-full rounded-full transition-all', pct > 70 ? 'bg-brand' : pct > 30 ? 'bg-amber-400' : 'bg-gray-300')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11.5px] text-gray-400">{pct}%</span>
    </div>
  );
}

/* ─── Action menu ─────────────────────────────────────────────────────── */

function RoleActionMenu({ role, onEdit, onClone, onToggle }: {
  role: AppRole;
  onEdit: () => void;
  onClone: () => void;
  onToggle: () => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return;
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.right - 168 });
    }
    function close(e: MouseEvent) {
      const t = e.target as Node;
      if (!btnRef.current?.contains(t) && !menuRef.current?.contains(t)) setOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const canEdit       = !role.isProtected;
  const canDeactivate = !role.isProtected;

  return (
    <>
      <button ref={btnRef} type="button" onClick={() => setOpen(o => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
        <MoreHorizontal size={16} />
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div ref={menuRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999, width: 168 }}
          className="overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-xl">

          {canEdit && (
            <button type="button" onClick={() => { setOpen(false); onEdit(); }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors">
              <Pencil size={13} className="text-gray-400" /> Edit Role
            </button>
          )}

          <button type="button" onClick={() => { setOpen(false); onClone(); }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors">
            <Copy size={13} className="text-gray-400" /> Clone Role
          </button>

          {canDeactivate && (
            <>
              <div className="my-1 border-t border-gray-100" />
              <button type="button" onClick={() => { setOpen(false); onToggle(); }}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3.5 py-2.5 text-[13px] transition-colors',
                  role.status === 'Active'
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-emerald-600 hover:bg-emerald-50',
                )}>
                {role.status === 'Active'
                  ? <><PowerOff size={13} className="text-red-400" /> Deactivate</>
                  : <><Power size={13} className="text-emerald-500" /> Activate</>}
              </button>
            </>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   PERMISSIONS GRID — module-by-module checkboxes
   ═══════════════════════════════════════════════════════════════════════ */

function PermissionsGrid({
  permissions,
  onChange,
  readOnly = false,
}: {
  permissions: Record<string, string[]>;
  onChange?: (p: Record<string, string[]>) => void;
  readOnly?: boolean;
}) {
  function toggle(moduleId: string, actionId: string) {
    if (readOnly || !onChange) return;
    const current = permissions[moduleId] ?? [];
    const next = current.includes(actionId)
      ? current.filter(a => a !== actionId)
      : [...current, actionId];
    onChange({ ...permissions, [moduleId]: next });
  }

  function toggleAll(moduleId: string) {
    if (readOnly || !onChange) return;
    const all = allPermissionsFor(moduleId);
    const current = permissions[moduleId] ?? [];
    const allGranted = all.every(a => current.includes(a));
    onChange({ ...permissions, [moduleId]: allGranted ? [] : all });
  }

  function toggleGlobalAll() {
    if (readOnly || !onChange) return;
    const full = fullPermissions();
    const currentTotal = countGranted(permissions);
    const total = totalActions();
    onChange(currentTotal === total ? Object.fromEntries(MODULES.map(m => [m.id, []])) : full);
  }

  const currentTotal = countGranted(permissions);
  const total = totalActions();
  const allGranted = currentTotal === total;

  return (
    <div className="space-y-2">
      {/* Global select-all */}
      {!readOnly && (
        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5">
          <span className="text-[12.5px] font-semibold text-gray-700">All Modules</span>
          <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-gray-600">
            <span onClick={() => toggleGlobalAll()}
              className={cn(
                'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[4px] border-[1.5px] cursor-pointer transition-colors',
                allGranted ? 'bg-brand border-brand' : 'border-gray-300 bg-white',
              )}>
              {allGranted && <Check size={9} className="text-white" strokeWidth={3} />}
            </span>
            Grant All
          </label>
        </div>
      )}

      {/* Per-module rows */}
      {MODULES.map(mod => {
        const granted  = permissions[mod.id] ?? [];
        const allMod   = mod.actions.every(a => granted.includes(a.id));
        const someMod  = mod.actions.some(a => granted.includes(a.id));

        return (
          <div key={mod.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            {/* Module header */}
            <div className={cn(
              'flex items-center justify-between border-b border-gray-100 px-4 py-2.5',
              (allMod || someMod) ? 'bg-orange-50/50' : 'bg-gray-50/60',
            )}>
              <span className="text-[12.5px] font-semibold text-gray-800">{mod.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-400">{granted.length}/{mod.actions.length}</span>
                {!readOnly && (
                  <label className="flex cursor-pointer items-center gap-1.5 text-[11.5px] text-gray-500">
                    <span onClick={() => toggleAll(mod.id)}
                      className={cn(
                        'flex h-[15px] w-[15px] flex-shrink-0 items-center justify-center rounded-[3px] border-[1.5px] cursor-pointer transition-colors',
                        allMod ? 'bg-brand border-brand' : someMod ? 'bg-brand/30 border-brand/40' : 'border-gray-300 bg-white',
                      )}>
                      {(allMod || someMod) && <Check size={8} className="text-white" strokeWidth={3} />}
                    </span>
                    All
                  </label>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 px-4 py-3">
              {mod.actions.map(action => {
                const checked = granted.includes(action.id);
                return (
                  <label
                    key={action.id}
                    className={cn(
                      'flex items-center gap-1.5 text-[12.5px] select-none',
                      readOnly ? 'cursor-default' : 'cursor-pointer',
                      checked ? 'font-medium text-gray-900' : 'text-gray-500',
                    )}
                  >
                    <span
                      onClick={() => toggle(mod.id, action.id)}
                      className={cn(
                        'flex h-[15px] w-[15px] flex-shrink-0 items-center justify-center rounded-[3px] border-[1.5px] transition-colors',
                        readOnly ? 'cursor-default' : 'cursor-pointer',
                        checked ? 'bg-brand border-brand' : 'border-gray-300 bg-white',
                      )}
                    >
                      {checked && <Check size={8} className="text-white" strokeWidth={3} />}
                    </span>
                    {action.label}
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   CREATE / EDIT ROLE DRAWER
   ═══════════════════════════════════════════════════════════════════════ */

interface RoleDrawerProps {
  open: boolean;
  onClose: () => void;
  editRole: AppRole | null;
  /** When set, pre-fills as a clone of this role */
  cloneSource: AppRole | null;
  onSave: (data: Partial<AppRole>) => void;
}

function RoleDrawer({ open, onClose, editRole, cloneSource, onSave }: RoleDrawerProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [name,        setName]        = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});
  const [showErrors,  setShowErrors]  = useState(false);

  const isClone = Boolean(cloneSource) && !editRole;
  const title   = editRole ? 'Edit Role' : isClone ? `Clone: ${cloneSource!.name}` : 'Create New Role';

  useEffect(() => {
    if (!open) return;
    setShowErrors(false);
    if (editRole) {
      setName(editRole.name);
      setDescription(editRole.description);
      setPermissions(JSON.parse(JSON.stringify(editRole.permissions)));
    } else if (cloneSource) {
      setName(`Copy of ${cloneSource.name}`);
      setDescription(cloneSource.description);
      setPermissions(JSON.parse(JSON.stringify(cloneSource.permissions)));
    } else {
      setName('');
      setDescription('');
      /* Custom roles inherit no permissions unless configured */
      setPermissions(Object.fromEntries(MODULES.map(m => [m.id, []])));
    }
  }, [open, editRole, cloneSource]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  function handleSave() {
    setShowErrors(true);
    if (!name.trim()) return;
    onSave({ name: name.trim(), description: description.trim(), permissions });
  }

  if (!mounted) return null;

  const nameErr = showErrors && !name.trim();

  const content = (
    <>
      <div onClick={onClose}
        className={cn('fixed inset-0 z-40 bg-black/20 transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none')} />

      <div className={cn(
        'fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-2xl transition-transform duration-300 ease-out sm:w-[52rem]',
        open ? 'translate-x-0' : 'translate-x-full',
      )}>
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-5 py-[14px]">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
              <ArrowLeft size={17} />
            </button>
            <div>
              <p className="text-[15px] font-semibold text-gray-900">{title}</p>
              {isClone && (
                <p className="text-[12px] text-gray-400">Permissions copied from "{cloneSource!.name}" — type: Custom</p>
              )}
            </div>
          </div>
          <button type="button" onClick={handleSave}
            className="rounded-lg bg-brand px-4 py-[7px] text-[13px] font-semibold text-white hover:bg-brand-hover transition-colors">
            {editRole ? 'Save Changes' : isClone ? 'Create Clone' : 'Create Role'}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-5 px-5 py-5">
            {/* Name */}
            <DrawerField label="Role Name" required>
              {nameErr && <p className="mb-1 text-[11.5px] text-red-500">Role name is required.</p>}
              <DrawerInput
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Senior Auditor"
                className={nameErr ? 'border-red-400' : ''}
              />
            </DrawerField>

            <DrawerField label="Description">
              <DrawerTextarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe what this role is for and who should be assigned to it…"
                rows={2}
              />
            </DrawerField>

            {/* Custom role note */}
            {!editRole && (
              <div className="flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                <Info size={14} className="mt-0.5 flex-shrink-0 text-blue-500" />
                <p className="text-[12.5px] text-blue-700 leading-relaxed">
                  {isClone
                    ? 'This is a new Custom role cloned from a system role. All permissions have been copied — adjust as needed.'
                    : 'Custom roles inherit no permissions unless explicitly configured below.'}
                </p>
              </div>
            )}

            <div className="border-t border-gray-100" />

            {/* Permissions */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[12px] font-semibold uppercase tracking-widest text-gray-400">Module Permissions</p>
                <p className="text-[12px] text-gray-400">
                  {countGranted(permissions)} of {totalActions()} permissions granted
                </p>
              </div>
              <PermissionsGrid permissions={permissions} onChange={setPermissions} />
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(content, document.body);
}

/* ═══════════════════════════════════════════════════════════════════════
   VIEW PERMISSIONS MODAL (read-only)
   ═══════════════════════════════════════════════════════════════════════ */

function ViewPermissionsModal({ role, onClose }: { role: AppRole | null; onClose: () => void }) {
  if (!role) return null;
  return (
    <Dialog open={Boolean(role)} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[560px] rounded-2xl p-0 overflow-hidden max-h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0 border-b border-gray-100 px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-[15px]">
            {role.isProtected && <Lock size={14} className="text-violet-500" />}
            {role.name}
          </DialogTitle>
          <DialogDescription className="text-[12.5px] text-gray-500">{role.description}</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <PermissionsGrid permissions={role.permissions} readOnly />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   DEACTIVATE DIALOG
   ═══════════════════════════════════════════════════════════════════════ */

function ToggleDialog({ role, onClose, onConfirm }: {
  role: AppRole | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!role) return null;
  const isDeactivate = role.status === 'Active';
  return (
    <Dialog open={Boolean(role)} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[420px] rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-[15px]">
            {isDeactivate ? 'Deactivate' : 'Activate'} "{role.name}"?
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-[13px] leading-relaxed text-gray-600">
            {isDeactivate
              ? `This role will be marked inactive. Users currently assigned "${role.name}" will retain it, but it cannot be assigned to new users.`
              : `This role will be restored to active status and can be assigned to users again.`}
            {role.userCount > 0 && isDeactivate && (
              <span className="mt-1.5 block font-medium text-amber-600">
                {role.userCount} user{role.userCount !== 1 ? 's' : ''} currently have this role.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-2 gap-2">
          <button type="button" onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="button" onClick={() => { onConfirm(); onClose(); }}
            className={cn(
              'rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-colors',
              isDeactivate ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600',
            )}>
            {isDeactivate ? 'Deactivate' : 'Activate'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN SCREEN
   ═══════════════════════════════════════════════════════════════════════ */

type TabFilter = 'all' | 'system' | 'custom';

export function RolesScreen() {
  const [roles, setRoles] = useState<AppRole[]>(MOCK_ROLES);

  const [tab,    setTab]    = useState<TabFilter>('all');
  const [search, setSearch] = useState('');

  /* Drawer */
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [editRole,     setEditRole]     = useState<AppRole | null>(null);
  const [cloneSource,  setCloneSource]  = useState<AppRole | null>(null);

  /* Dialogs */
  const [viewRole,    setViewRole]    = useState<AppRole | null>(null);
  const [toggleRole,  setToggleRole]  = useState<AppRole | null>(null);

  /* Stats */
  const total        = roles.length;
  const systemCount  = roles.filter(r => r.type === 'system').length;
  const customCount  = roles.filter(r => r.type === 'custom').length;
  const activeCustom = roles.filter(r => r.type === 'custom' && r.status === 'Active').length;

  /* Filtered */
  const filtered = roles.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
    const matchTab = tab === 'all' || r.type === tab;
    return matchSearch && matchTab;
  });

  function openCreate() { setEditRole(null); setCloneSource(null); setDrawerOpen(true); }
  function openEdit(r: AppRole) { setCloneSource(null); setEditRole(r); setDrawerOpen(true); }
  function openClone(r: AppRole) { setEditRole(null); setCloneSource(r); setDrawerOpen(true); }

  function handleSave(data: Partial<AppRole>) {
    if (editRole) {
      setRoles(rs => rs.map(r => r.id === editRole.id ? { ...r, ...data } : r));
      toast.success(`Role "${data.name}" updated`);
    } else {
      const newRole: AppRole = {
        id: makeId(),
        name: data.name ?? '',
        description: data.description ?? '',
        type: 'custom',
        status: 'Active',
        isProtected: false,
        permissions: data.permissions ?? {},
        userCount: 0,
        createdAt: new Date().toISOString().slice(0, 10),
        clonedFromId: cloneSource?.id,
      };
      setRoles(rs => [...rs, newRole]);
      toast.success(cloneSource ? `Cloned "${cloneSource.name}" → "${newRole.name}"` : `Role "${newRole.name}" created`);
    }
    setDrawerOpen(false);
    setEditRole(null);
    setCloneSource(null);
  }

  function handleToggle(r: AppRole) {
    const next: RoleStatus = r.status === 'Active' ? 'Inactive' : 'Active';
    setRoles(rs => rs.map(x => x.id === r.id ? { ...x, status: next } : x));
    toast.success(`"${r.name}" ${next === 'Active' ? 'activated' : 'deactivated'}`);
    setToggleRole(null);
  }

  return (
    <div className="px-6 py-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[20px] font-bold text-gray-900">Role Management</h1>
        <p className="mt-0.5 text-[13.5px] text-gray-500">
          Define system and custom roles with module-level permission control.
        </p>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        {[
          { label: 'Total Roles',    value: total,        click: () => setTab('all'),    active: tab === 'all',    color: 'text-gray-900', bg: 'bg-gray-100' },
          { label: 'System Roles',   value: systemCount,  click: () => setTab('system'), active: tab === 'system', color: 'text-blue-700', bg: 'bg-blue-50'  },
          { label: 'Custom Roles',   value: customCount,  click: () => setTab('custom'), active: tab === 'custom', color: 'text-brand',    bg: 'bg-orange-50'},
          { label: 'Active Custom',  value: activeCustom, click: () => setTab('custom'), active: false,            color: 'text-emerald-700', bg: 'bg-emerald-50' },
        ].map(({ label, value, click, active, color, bg }) => (
          <button key={label} type="button" onClick={click}
            className={cn(
              'flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-left transition-colors hover:border-brand/40',
              active && 'border-brand/50 ring-1 ring-brand/20',
            )}>
            <span className={cn('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-[18px] font-bold', bg, color)}>
              {value}
            </span>
            <span className="text-[12.5px] font-medium text-gray-600">{label}</span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-3">
        {/* Tab pills */}
        <div className="flex rounded-lg border border-gray-200 bg-gray-100 p-0.5">
          {(['all', 'system', 'custom'] as TabFilter[]).map(t => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={cn(
                'rounded-md px-3.5 py-1.5 text-[12.5px] font-medium capitalize transition-colors',
                tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
              )}>
              {t}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex h-9 items-center">
          <Search size={14} className="pointer-events-none absolute left-3 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search roles…"
            className="h-full w-[220px] rounded-xl border border-gray-200 bg-white pl-9 pr-8 text-[13px] placeholder:text-gray-400 focus:border-brand focus:outline-none transition-colors"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')}
              className="absolute right-2.5 flex h-4 w-4 items-center justify-center rounded bg-gray-200 text-gray-500 hover:bg-gray-300 transition-colors">
              <X size={10} />
            </button>
          )}
        </div>

        <div className="ml-auto">
          <button type="button" onClick={openCreate}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-brand-hover transition-colors">
            <Plus size={14} /> New Role
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-200 bg-gray-50 hover:bg-gray-50">
              <TableHead className="pl-5 text-[10px] font-semibold uppercase tracking-widest text-gray-500">Role</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 w-[110px]">Type</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 w-[130px]">Permissions</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 w-[80px] text-center">Users</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 w-[100px]">Status</TableHead>
              <TableHead className="w-[52px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-[13px] text-gray-400">
                  {search ? 'No roles match your search.' : 'No roles found.'}
                </TableCell>
              </TableRow>
            ) : filtered.map(role => (
              <TableRow key={role.id}
                className={cn(
                  'border-b border-gray-100 transition-colors hover:bg-gray-50/70',
                  role.status === 'Inactive' && 'opacity-55',
                )}>

                {/* Role name + description */}
                <TableCell className="pl-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg',
                      role.isProtected ? 'bg-violet-50' : role.type === 'system' ? 'bg-blue-50' : 'bg-orange-50',
                    )}>
                      {role.isProtected
                        ? <Lock size={14} className="text-violet-500" />
                        : <Shield size={14} className={role.type === 'system' ? 'text-blue-500' : 'text-brand'} />}
                    </span>
                    <div>
                      <button type="button" onClick={() => setViewRole(role)}
                        className="text-[13.5px] font-semibold text-gray-900 hover:text-brand transition-colors text-left">
                        {role.name}
                      </button>
                      {role.clonedFromId && (
                        <p className="text-[11px] text-gray-400">
                          Cloned from {MOCK_ROLES.find(r => r.id === role.clonedFromId)?.name ?? role.clonedFromId}
                        </p>
                      )}
                      {role.description && (
                        <p className="text-[12px] text-gray-400 line-clamp-1 max-w-[260px]">{role.description}</p>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* Type */}
                <TableCell className="py-3.5">
                  <TypeBadge type={role.type} isProtected={role.isProtected} />
                </TableCell>

                {/* Permissions coverage */}
                <TableCell className="py-3.5">
                  <CoverageBar permissions={role.permissions} />
                </TableCell>

                {/* User count */}
                <TableCell className="py-3.5 text-center">
                  <span className="text-[13px] font-medium text-gray-700">{role.userCount}</span>
                </TableCell>

                {/* Status */}
                <TableCell className="py-3.5">
                  <StatusBadge status={role.status} />
                </TableCell>

                {/* Actions */}
                <TableCell className="py-3.5 pr-3">
                  <RoleActionMenu
                    role={role}
                    onEdit={() => openEdit(role)}
                    onClone={() => openClone(role)}
                    onToggle={() => setToggleRole(role)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="mt-3 text-[12px] text-gray-400">
        {filtered.length} of {total} role{total !== 1 ? 's' : ''} shown
        {' · '}
        <span className="text-violet-600">Super Admin</span> cannot be modified or deleted.
      </p>

      {/* Create / Edit drawer */}
      <RoleDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditRole(null); setCloneSource(null); }}
        editRole={editRole}
        cloneSource={cloneSource}
        onSave={handleSave}
      />

      {/* View permissions modal */}
      <ViewPermissionsModal role={viewRole} onClose={() => setViewRole(null)} />

      {/* Toggle dialog */}
      <ToggleDialog
        role={toggleRole}
        onClose={() => setToggleRole(null)}
        onConfirm={() => toggleRole && handleToggle(toggleRole)}
      />
    </div>
  );
}
