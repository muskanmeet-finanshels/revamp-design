'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, MoreHorizontal, Pencil, Copy, PowerOff, Power,
  ArrowLeft, ArrowRight, Lock, Shield, Check,
  AlertTriangle, Info, Users, UserCheck, SearchX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Empty } from '@/components/ui/empty';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { DrawerField, DrawerInput, DrawerTextarea } from '@/components/ui/drawer-fields';
import { SearchInput } from '@/components/ui/search-input';
import { DescriptionTooltip } from '@/components/ui/description-tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  MOCK_ROLES, MODULES,
  allPermissionsFor, fullPermissions,
  type AppRole, type RoleType, type RoleStatus,
} from './mock-data';
import { MOCK_USERS, type AppUser } from '@/screens/users/mock-data';

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

function RoleActionMenu({ role, onEdit, onClone, onActivate, onDeactivate }: {
  role: AppRole;
  onEdit: () => void;
  onClone: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
}) {
  const [open, setOpen] = useState(false);

  const canEdit       = !role.isProtected;
  const canDeactivate = !role.isProtected;

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none"
          aria-label="Role actions"
        >
          <MoreHorizontal size={14} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="w-44 rounded-xl border border-gray-100 bg-white p-1.5 shadow-xl"
      >
        {canEdit && (
          <button
            type="button"
            onClick={() => { setOpen(false); onEdit(); }}
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-100"
          >
            <Pencil size={13} className="text-gray-400" /> Edit Role
          </button>
        )}

        <button
          type="button"
          onClick={() => { setOpen(false); onClone(); }}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-100"
        >
          <Copy size={13} className="text-gray-400" /> Clone Role
        </button>

        {canDeactivate && (
          <>
            <div className="my-1 border-t border-gray-100" />
            {role.status === 'Active' ? (
              <button
                type="button"
                onClick={() => { setOpen(false); onDeactivate(); }}
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                <PowerOff size={13} className="text-red-400" /> Deactivate
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { setOpen(false); onActivate(); }}
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] font-medium text-emerald-600 transition-colors hover:bg-emerald-50"
              >
                <Power size={13} className="text-emerald-500" /> Activate
              </button>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
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
   VIEW ROLE MODAL — Permissions + Assigned Users tabs
   ═══════════════════════════════════════════════════════════════════════ */

type ViewTab = 'permissions' | 'users';

function ViewPermissionsModal({
  role,
  onClose,
  initialTab = 'permissions',
}: {
  role: AppRole | null;
  onClose: () => void;
  initialTab?: ViewTab;
}) {
  const [tab, setTab] = useState<ViewTab>(initialTab);

  useEffect(() => {
    if (role) setTab(initialTab);
  }, [role, initialTab]);

  if (!role) return null;

  /* Match users by role name (case-insensitive) */
  const assignedUsers: AppUser[] = MOCK_USERS.filter(u =>
    u.roles.some(r => r.toLowerCase() === role.name.toLowerCase()),
  );

  const STATUS_DOT: Record<string, string> = {
    Active:   'bg-emerald-400',
    Inactive: 'bg-gray-300',
    Pending:  'bg-amber-400',
  };

  return (
    <Dialog open={Boolean(role)} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[580px] rounded-2xl p-0 overflow-hidden max-h-[82vh] flex flex-col">

        {/* Header */}
        <DialogHeader className="flex-shrink-0 border-b border-gray-100 px-5 pt-5 pb-0">
          <DialogTitle className="flex items-center gap-2 text-[15px]">
            {role.isProtected
              ? <Lock size={14} className="text-violet-500" />
              : <Shield size={14} className={role.type === 'system' ? 'text-blue-500' : 'text-brand'} />}
            {role.name}
          </DialogTitle>
          <DialogDescription className="mt-0.5 text-[12.5px] text-gray-500 pb-3">
            {role.description}
          </DialogDescription>

          {/* Tab strip */}
          <div className="flex gap-0 border-t border-gray-100">
            {([
              { value: 'permissions' as ViewTab, label: 'Permissions' },
              { value: 'users' as ViewTab,       label: `Assigned Users (${assignedUsers.length})` },
            ] as { value: ViewTab; label: string }[]).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={cn(
                  'border-b-2 px-4 pb-3 pt-2 text-[12.5px] font-medium transition-colors focus:outline-none',
                  tab === value
                    ? 'border-brand text-gray-900 font-semibold'
                    : 'border-transparent text-gray-500 hover:text-gray-700',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === 'permissions' && (
            <PermissionsGrid permissions={role.permissions} readOnly />
          )}

          {tab === 'users' && (
            assignedUsers.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <Users size={32} className="text-gray-200" />
                <p className="text-[13px] text-gray-400">No users are currently assigned to this role.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {assignedUsers.map(u => (
                  <div key={u.id}
                    className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <span
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                      style={{ background: u.avatarColor }}
                    >
                      {u.firstName[0]}{u.lastName[0]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-gray-900 truncate">
                        {u.firstName} {u.lastName}
                      </p>
                      <p className="text-[11.5px] text-gray-400 truncate">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={cn('h-2 w-2 rounded-full', STATUS_DOT[u.status] ?? 'bg-gray-300')} />
                      <span className="text-[11.5px] text-gray-500">{u.status}</span>
                    </div>
                  </div>
                ))}
                {role.userCount > assignedUsers.length && (
                  <p className="pt-1 text-center text-[11.5px] text-gray-400">
                    +{role.userCount - assignedUsers.length} more user{role.userCount - assignedUsers.length !== 1 ? 's' : ''} (not shown in seed data)
                  </p>
                )}
              </div>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ACTIVATE ROLE — simple confirm dialog
   ═══════════════════════════════════════════════════════════════════════ */

function ActivateRoleDialog({ role, onClose, onConfirm }: {
  role: AppRole | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!role) return null;
  return (
    <Dialog open={Boolean(role)} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[420px] rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-[15px]">Activate "{role.name}"?</DialogTitle>
          <DialogDescription className="mt-1.5 text-[13px] leading-relaxed text-gray-600">
            This role will be restored to active status and can be assigned to users again.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4 gap-2">
          <button type="button" onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="button" onClick={() => { onConfirm(); onClose(); }}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-[13px] font-semibold text-white hover:bg-emerald-600 transition-colors">
            Activate Role
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   DEACTIVATE ROLE DRAWER — 2-step: transfer users → confirm
   ═══════════════════════════════════════════════════════════════════════ */

function DeactivateRoleDrawer({ role, allRoles, onClose, onConfirm }: {
  role: AppRole | null;
  allRoles: AppRole[];
  onClose: () => void;
  onConfirm: (transferToRoleId: string) => void;
}) {
  const [mounted,        setMounted]        = useState(false);
  const [step,           setStep]           = useState(0); // 0=transfer 1=confirm
  const [transferRoleId, setTransferRoleId] = useState('');

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (role) { setStep(0); setTransferRoleId(''); }
  }, [role]);
  useEffect(() => {
    document.body.style.overflow = role ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [role]);

  if (!mounted || !role) return null;

  const hasUsers = role.userCount > 0;

  /* Users currently assigned to this role (matched by name) */
  const assignedUsers = MOCK_USERS.filter(u =>
    u.roles.some(r => r.toLowerCase() === role.name.toLowerCase()),
  );

  /* Active roles the admin can transfer users to */
  const transferOptions = allRoles.filter(r =>
    r.id !== role.id && r.status === 'Active',
  );

  const transferRole = transferOptions.find(r => r.id === transferRoleId);
  const canProceed   = !hasUsers || Boolean(transferRoleId);
  const granted      = countGranted(role.permissions);
  const coverage     = Math.round((granted / totalActions()) * 100);

  const STEP_LABELS = ['Transfer Users', 'Confirm Deactivation'];

  function handleConfirm() {
    onConfirm(transferRoleId);
    onClose();
  }

  const content = (
    <>
      {/* Backdrop */}
      <div onClick={onClose}
        className="fixed inset-0 z-40 bg-black/20 transition-opacity duration-300" />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-2xl transition-transform duration-300 ease-out sm:w-[480px]">

        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-amber-100 bg-amber-50 px-5 py-[14px]">
          <div className="flex items-center gap-3">
            <button type="button" onClick={step === 0 ? onClose : () => setStep(0)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-amber-600 hover:bg-amber-100 transition-colors">
              <ArrowLeft size={17} />
            </button>
            <div>
              <p className="text-[14px] font-bold text-amber-900">Deactivate Role</p>
              <p className="text-[12px] text-amber-600">"{role.name}" · {STEP_LABELS[step]}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {[0, 1].map(s => (
              <div key={s} className={cn(
                'h-2 w-2 rounded-full transition-colors',
                step === s ? 'bg-amber-500' : step > s ? 'bg-amber-300' : 'bg-amber-200',
              )} />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-5 px-5 py-5">

            {/* ── Step 0: Transfer Users ── */}
            {step === 0 && (
              <>
                {/* Warning banner */}
                <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
                  <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-amber-500" strokeWidth={2} />
                  <div className="text-[13px] text-amber-800">
                    <p className="font-semibold">Deactivation requires dependency transfer.</p>
                    <p className="mt-0.5 leading-snug text-amber-700">
                      {hasUsers
                        ? `${role.userCount} user${role.userCount !== 1 ? 's' : ''} are assigned this role. Select a replacement role before deactivating.`
                        : 'No users are assigned to this role — you can proceed without transferring.'}
                    </p>
                  </div>
                </div>

                {/* Role summary card */}
                <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <span className={cn(
                    'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl',
                    role.type === 'system' ? 'bg-blue-50' : 'bg-orange-50',
                  )}>
                    <Shield size={18} className={role.type === 'system' ? 'text-blue-500' : 'text-brand'} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-gray-900">{role.name}</p>
                    <p className="text-[12px] text-gray-400 truncate">{role.description}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-[13px] font-semibold text-gray-700">{coverage}%</p>
                    <p className="text-[11px] text-gray-400">coverage</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
                    <p className="text-[22px] font-bold text-gray-900">{role.userCount}</p>
                    <p className="text-[12px] text-gray-500">Assigned Users</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
                    <p className="text-[22px] font-bold text-gray-900">{granted}</p>
                    <p className="text-[12px] text-gray-500">Permissions Granted</p>
                  </div>
                </div>

                {hasUsers ? (
                  <>
                    {/* Transfer picker */}
                    <div>
                      <label className="mb-1.5 block text-[12px] font-semibold text-gray-700">
                        Transfer {role.userCount} user{role.userCount !== 1 ? 's' : ''} to <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={transferRoleId}
                        onChange={e => setTransferRoleId(e.target.value)}
                        className={cn(
                          'h-11 w-full appearance-none rounded-xl border bg-white px-3.5 text-[13px] transition-colors focus:outline-none focus:ring-1 focus:ring-brand/20',
                          !transferRoleId ? 'border-red-300 text-gray-400' : 'border-brand text-gray-800',
                        )}
                      >
                        <option value="">— Select replacement role —</option>
                        {transferOptions.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                      {!transferRoleId && (
                        <p className="mt-1 text-[11.5px] text-red-500">
                          A replacement role is required before deactivating.
                        </p>
                      )}
                    </div>

                    {/* Assigned users list */}
                    {assignedUsers.length > 0 && (
                      <div>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                          Affected Users
                        </p>
                        <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                          {assignedUsers.map(u => (
                            <div key={u.id}
                              className="flex items-center gap-3 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
                              <span
                                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                                style={{ background: u.avatarColor }}
                              >
                                {u.firstName[0]}{u.lastName[0]}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-[12.5px] font-medium text-gray-900 truncate">
                                  {u.firstName} {u.lastName}
                                </p>
                                <p className="text-[11px] text-gray-400 truncate">{u.email}</p>
                              </div>
                              {transferRole && (
                                <span className="flex-shrink-0 text-[11px] font-medium text-emerald-600">
                                  → {transferRole.name}
                                </span>
                              )}
                            </div>
                          ))}
                          {role.userCount > assignedUsers.length && (
                            <p className="text-center text-[11px] text-gray-400 py-1">
                              +{role.userCount - assignedUsers.length} more
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5">
                    <UserCheck size={16} className="text-emerald-500 flex-shrink-0" />
                    <p className="text-[13px] text-emerald-700 font-medium">
                      No users assigned — safe to deactivate without transfer.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* ── Step 1: Confirm ── */}
            {step === 1 && (
              <>
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4">
                  <p className="text-[14px] font-bold text-red-800">Confirm Deactivation</p>
                  <p className="mt-1 text-[13px] text-red-700 leading-relaxed">
                    <strong>"{role.name}"</strong> will be marked inactive and cannot be assigned to new users.
                  </p>
                </div>

                {hasUsers && transferRole && (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                      Transfer Summary
                    </p>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[13px] font-medium text-gray-800">
                            {role.userCount} user{role.userCount !== 1 ? 's' : ''}
                          </p>
                          <p className="text-[11.5px] text-gray-500">previously on "{role.name}"</p>
                        </div>
                        <ArrowRight size={16} className="text-gray-400 mx-3 flex-shrink-0" />
                        <div className="text-right">
                          <p className="text-[13px] font-semibold text-emerald-700">{transferRole.name}</p>
                          <p className="text-[11.5px] text-gray-500">replacement role</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5">
                  <Info size={14} className="mt-0.5 flex-shrink-0 text-gray-400" />
                  <p className="text-[12.5px] text-gray-600 leading-relaxed">
                    This role can be <span className="font-medium text-emerald-600">reactivated</span> at any time from the Roles list.
                    Existing user permission histories are preserved.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-shrink-0 items-center justify-between border-t border-gray-100 px-5 py-3.5">
          <button
            type="button"
            onClick={step === 0 ? onClose : () => setStep(0)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={14} />
            {step === 0 ? 'Cancel' : 'Back'}
          </button>

          {step === 0 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              disabled={!canProceed}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-colors',
                canProceed ? 'bg-amber-500 hover:bg-amber-600' : 'cursor-not-allowed bg-amber-200',
              )}
            >
              Review <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirm}
              className="rounded-lg bg-red-500 px-5 py-2 text-[13px] font-semibold text-white hover:bg-red-600 transition-colors"
            >
              Confirm Deactivation
            </button>
          )}
        </div>
      </div>
    </>
  );

  return createPortal(content, document.body);
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN SCREEN
   ═══════════════════════════════════════════════════════════════════════ */

type TabFilter = 'all' | 'system' | 'custom';

export function RolesScreen({ hideHeader = false }: { hideHeader?: boolean }) {
  const [roles, setRoles] = useState<AppRole[]>(MOCK_ROLES);

  const [tab,    setTab]    = useState<TabFilter>('all');
  const [search, setSearch] = useState('');

  /* Drawer */
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [editRole,     setEditRole]     = useState<AppRole | null>(null);
  const [cloneSource,  setCloneSource]  = useState<AppRole | null>(null);

  /* Dialogs / drawers */
  const [viewRole,       setViewRole]       = useState<AppRole | null>(null);
  const [viewInitialTab, setViewInitialTab] = useState<ViewTab>('permissions');
  const [activateRole,   setActivateRole]   = useState<AppRole | null>(null);
  const [deactivateRole, setDeactivateRole] = useState<AppRole | null>(null);

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

  function handleActivate(r: AppRole) {
    setRoles(rs => rs.map(x => x.id === r.id ? { ...x, status: 'Active' } : x));
    toast.success(`"${r.name}" activated`);
  }

  function handleDeactivate(r: AppRole, transferToRoleId: string) {
    setRoles(rs => rs.map(x => {
      if (x.id === r.id) return { ...x, status: 'Inactive' };
      if (transferToRoleId && x.id === transferToRoleId) {
        return { ...x, userCount: x.userCount + r.userCount };
      }
      return x;
    }).map(x => x.id === r.id ? { ...x, userCount: 0 } : x));
    const targetName = roles.find(x => x.id === transferToRoleId)?.name;
    if (targetName && r.userCount > 0) {
      toast.success(
        `"${r.name}" deactivated — ${r.userCount} user${r.userCount !== 1 ? 's' : ''} transferred to "${targetName}"`,
      );
    } else {
      toast.success(`"${r.name}" deactivated`);
    }
  }

  return (
    <div className="px-6 py-6 lg:px-8">
      {/* Header */}
      {!hideHeader && (
        <div className="mb-6">
          <h1 className="text-[20px] font-bold text-gray-900">Role Management</h1>
          <p className="mt-0.5 text-[13.5px] text-gray-500">
            Define system and custom roles with module-level permission control.
          </p>
        </div>
      )}

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

      {/* Toolbar — line tabs on top, search + action below */}
      <Tabs value={tab} onValueChange={value => setTab(value as TabFilter)}>
        <TabsList className="h-auto w-full justify-start gap-0 rounded-none border-b border-gray-200 bg-transparent p-0">
          {(['all', 'system', 'custom'] as TabFilter[]).map(t => (
            <TabsTrigger
              key={t}
              value={t}
              className="relative rounded-none border-b-2 border-transparent px-4 py-3 text-[13px] font-medium capitalize text-gray-500 shadow-none transition-colors hover:text-gray-800 data-[state=active]:border-brand data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-gray-900 data-[state=active]:shadow-none"
            >
              {t}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="mb-4 mt-4 flex items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search roles…"
          aria-label="Search roles"
          className="w-full sm:w-80"
        />
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
              <TableHead className="min-w-[260px] text-[10px] font-semibold uppercase tracking-widest text-gray-500">Description</TableHead>
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
                <TableCell colSpan={7} className="py-0">
                  <Empty
                    icon={search ? SearchX : Shield}
                    title={search ? 'No matching roles' : 'No roles yet'}
                    description={search
                      ? 'Try adjusting your search to find what you’re looking for.'
                      : 'Create a role to define access across your organisation.'}
                    className="py-16"
                  />
                </TableCell>
              </TableRow>
            ) : filtered.map(role => (
              <TableRow key={role.id}
                className={cn(
                  'border-b border-gray-100 transition-colors hover:bg-gray-50/70',
                  role.status === 'Inactive' && 'opacity-55',
                )}>

                {/* Role name */}
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
                    </div>
                  </div>
                </TableCell>

                {/* Description */}
                <TableCell className="py-3.5">
                  <DescriptionTooltip value={role.description} className="text-[12.5px]" />
                </TableCell>

                {/* Type */}
                <TableCell className="py-3.5">
                  <TypeBadge type={role.type} isProtected={role.isProtected} />
                </TableCell>

                {/* Permissions coverage */}
                <TableCell className="py-3.5">
                  <CoverageBar permissions={role.permissions} />
                </TableCell>

                {/* User count — clickable to show assigned users */}
                <TableCell className="py-3.5 text-center">
                  {role.userCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => { setViewInitialTab('users'); setViewRole(role); }}
                      className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1 text-[12.5px] font-semibold text-gray-700 hover:bg-brand/10 hover:text-brand transition-colors"
                    >
                      <Users size={11} />
                      {role.userCount}
                    </button>
                  ) : (
                    <span className="text-[13px] text-gray-400">—</span>
                  )}
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
                    onActivate={() => setActivateRole(role)}
                    onDeactivate={() => setDeactivateRole(role)}
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

      {/* View role modal — permissions + assigned users */}
      <ViewPermissionsModal
        role={viewRole}
        onClose={() => { setViewRole(null); setViewInitialTab('permissions'); }}
        initialTab={viewInitialTab}
      />

      {/* Activate role — simple confirm */}
      <ActivateRoleDialog
        role={activateRole}
        onClose={() => setActivateRole(null)}
        onConfirm={() => activateRole && handleActivate(activateRole)}
      />

      {/* Deactivate role — 2-step: transfer users → confirm */}
      <DeactivateRoleDrawer
        role={deactivateRole}
        allRoles={roles}
        onClose={() => setDeactivateRole(null)}
        onConfirm={transferToRoleId => deactivateRole && handleDeactivate(deactivateRole, transferToRoleId)}
      />
    </div>
  );
}
