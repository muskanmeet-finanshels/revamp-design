'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Search, X, Plus, MoreHorizontal, Pencil, Power, PowerOff,
  KeyRound, ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp,
  AlertTriangle, UserCheck, Users, Building2, Layers,
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
  MOCK_USERS, MOCK_DEPARTMENTS, MOCK_TEAMS, MOCK_VERTICALS,
  MOCK_USER_DEPENDENCIES,
  ROLE_OPTIONS, EMPLOYEE_GROUP_OPTIONS,
  type AppUser, type UserStatus, type UserRole, type UserDependency,
} from './mock-data';

/* ─── helpers ─────────────────────────────────────────────────────────── */

function makeId() { return `u-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

function getInitials(u: AppUser) {
  return `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
}

function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

/* ─── Status badge ────────────────────────────────────────────────────── */

const STATUS_STYLE: Record<UserStatus, string> = {
  Active:   'border-emerald-200 bg-emerald-50 text-emerald-700',
  Inactive: 'border-gray-200 bg-gray-100 text-gray-500',
  Pending:  'border-amber-200 bg-amber-50 text-amber-700',
};

function StatusBadge({ status }: { status: UserStatus }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-[3px] text-[11.5px] font-medium', STATUS_STYLE[status])}>
      {status}
    </span>
  );
}

/* ─── Role badge ──────────────────────────────────────────────────────── */

const ROLE_ADMIN_STYLE   = 'border-violet-200 bg-violet-50 text-violet-700';
const ROLE_LEAD_STYLE    = 'border-blue-200 bg-blue-50 text-blue-700';
const ROLE_DEFAULT_STYLE = 'border-gray-200 bg-gray-50 text-gray-600';

function roleBadgeStyle(role: UserRole) {
  if (role === 'Admin') return ROLE_ADMIN_STYLE;
  if (role === 'Team Lead' || role === 'Finance Manager') return ROLE_LEAD_STYLE;
  return ROLE_DEFAULT_STYLE;
}

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span className={cn('inline-flex items-center rounded-md border px-2 py-[2px] text-[11px] font-medium', roleBadgeStyle(role))}>
      {role}
    </span>
  );
}

/* ─── Avatar ──────────────────────────────────────────────────────────── */

function UserAvatar({ user, size = 32 }: { user: AppUser; size?: number }) {
  return (
    <span
      className="inline-flex flex-shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
      style={{ width: size, height: size, background: user.avatarColor }}
    >
      {getInitials(user)}
    </span>
  );
}

/* ─── Multi-checkbox list (roles & groups) ────────────────────────────── */

function MultiCheckList({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  function toggle(opt: string) {
    onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt]);
  }
  return (
    <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-gray-200 bg-white p-3">
      {options.map(opt => {
        const checked = selected.includes(opt);
        return (
          <label key={opt} className={cn(
            'flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] transition-colors',
            checked ? 'bg-orange-50 font-medium text-brand' : 'text-gray-700 hover:bg-gray-50',
          )}>
            <span
              onClick={e => { e.preventDefault(); toggle(opt); }}
              className={cn(
                'flex h-[16px] w-[16px] flex-shrink-0 items-center justify-center rounded-[4px] border-[1.5px] cursor-pointer transition-colors',
                checked ? 'bg-brand border-brand' : 'border-gray-300 bg-white',
              )}
            >
              {checked && <Check size={10} className="text-white" strokeWidth={3} />}
            </span>
            {opt}
          </label>
        );
      })}
    </div>
  );
}

/* ─── Simple select for drawers ───────────────────────────────────────── */

function DrawerSelectField({
  value,
  onChange,
  placeholder,
  options,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
  error?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={cn(
        'h-11 w-full appearance-none rounded-xl border bg-white px-3.5 text-[13px] transition-colors focus:outline-none focus:ring-1 focus:ring-brand/20',
        error ? 'border-red-400 focus:border-red-400' : value ? 'border-brand focus:border-brand' : 'border-gray-200 text-gray-400 focus:border-brand',
      )}
    >
      <option value="" disabled>{placeholder}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

/* ─── Action menu ─────────────────────────────────────────────────────── */

function UserActionMenu({
  user,
  onEdit,
  onResetPassword,
  onActivate,
  onDeactivate,
}: {
  user: AppUser;
  onEdit: () => void;
  onResetPassword: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return;
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.right - 188 });
    }
    function close(e: MouseEvent) {
      const t = e.target as Node;
      if (!btnRef.current?.contains(t) && !menuRef.current?.contains(t)) setOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const isActive   = user.status === 'Active';
  const isInactive = user.status === 'Inactive';

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
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999, width: 188 }}
          className="overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-xl"
        >
          <button type="button" onClick={() => { setOpen(false); onEdit(); }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors">
            <Pencil size={13} className="text-gray-400" /> Edit User
          </button>

          {!isInactive && (
            <button type="button" onClick={() => { setOpen(false); onResetPassword(); }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors">
              <KeyRound size={13} className="text-gray-400" /> Reset Password
            </button>
          )}

          <div className="my-1 border-t border-gray-100" />

          {!isActive ? (
            <button type="button" onClick={() => { setOpen(false); onActivate(); }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-emerald-600 hover:bg-emerald-50 transition-colors">
              <Power size={13} className="text-emerald-500" />
              {isInactive ? 'Reactivate User' : 'Activate User'}
            </button>
          ) : (
            <button type="button" onClick={() => { setOpen(false); onDeactivate(); }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-red-600 hover:bg-red-50 transition-colors">
              <PowerOff size={13} className="text-red-400" /> Deactivate User
            </button>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ADD / EDIT USER DRAWER
   ═══════════════════════════════════════════════════════════════════════ */

interface UserDrawerProps {
  open: boolean;
  onClose: () => void;
  editUser: AppUser | null;
  allUsers: AppUser[];
  onSave: (data: Partial<AppUser>) => void;
}

function UserDrawer({ open, onClose, editUser, allUsers, onSave }: UserDrawerProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  /* form state */
  const [firstName,         setFirstName]         = useState('');
  const [lastName,          setLastName]           = useState('');
  const [email,             setEmail]             = useState('');
  const [phone,             setPhone]             = useState('');
  const [jobTitle,          setJobTitle]          = useState('');
  const [employeeId,        setEmployeeId]        = useState('');
  const [departmentId,      setDepartmentId]      = useState('');
  const [teamId,            setTeamId]            = useState('');
  const [verticalId,        setVerticalId]        = useState('');
  const [reportingManagerId, setReportingManagerId] = useState('');
  const [roles,             setRoles]             = useState<UserRole[]>([]);
  const [employeeGroups,    setEmployeeGroups]    = useState<string[]>([]);
  const [joiningDate,       setJoiningDate]       = useState('');
  const [showErrors,        setShowErrors]        = useState(false);

  /* Populate form when editing */
  useEffect(() => {
    if (open) {
      setShowErrors(false);
      if (editUser) {
        setFirstName(editUser.firstName);
        setLastName(editUser.lastName);
        setEmail(editUser.email);
        setPhone(editUser.phone ?? '');
        setJobTitle(editUser.jobTitle ?? '');
        setEmployeeId(editUser.employeeId ?? '');
        setDepartmentId(editUser.departmentId);
        setTeamId(editUser.teamId ?? '');
        setVerticalId(editUser.verticalId ?? '');
        setReportingManagerId(editUser.reportingManagerId ?? '');
        setRoles([...editUser.roles]);
        setEmployeeGroups([...editUser.employeeGroups]);
        setJoiningDate(editUser.joiningDate ?? '');
      } else {
        setFirstName(''); setLastName(''); setEmail(''); setPhone('');
        setJobTitle(''); setEmployeeId(''); setDepartmentId('');
        setTeamId(''); setVerticalId(''); setReportingManagerId('');
        setRoles([]); setEmployeeGroups([]); setJoiningDate('');
      }
    }
  }, [open, editUser]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  /* Cascading selects */
  const deptTeams     = MOCK_TEAMS.filter(t => t.departmentId === departmentId);
  const deptVerticals = MOCK_VERTICALS.filter(v => v.departmentId === departmentId);
  const managerOptions = allUsers
    .filter(u => u.status === 'Active' && u.id !== editUser?.id)
    .map(u => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }));

  /* Validation */
  const firstNameErr = showErrors && !firstName.trim();
  const lastNameErr  = showErrors && !lastName.trim();
  const emailErr     = showErrors && (!email.trim() || !isValidEmail(email));
  const deptErr      = showErrors && !departmentId;
  const rolesErr     = showErrors && roles.length === 0;

  function handleSave() {
    setShowErrors(true);
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !isValidEmail(email) || !departmentId || roles.length === 0) return;
    onSave({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      jobTitle: jobTitle.trim() || undefined,
      employeeId: employeeId.trim() || undefined,
      departmentId,
      teamId: teamId || undefined,
      verticalId: verticalId || undefined,
      reportingManagerId: reportingManagerId || undefined,
      roles,
      employeeGroups,
      joiningDate: joiningDate || undefined,
    });
  }

  const avatarColors = ['#F16611','#334756','#22C55E','#0A2B3B','#8B5CF6','#3B82F6'];

  if (!mounted) return null;

  const content = (
    <>
      <div
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/20 transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      />
      <div className={cn(
        'fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-2xl transition-transform duration-300 ease-out sm:w-[40rem]',
        open ? 'translate-x-0' : 'translate-x-full',
      )}>
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-5 py-[14px]">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
              <ArrowLeft size={17} />
            </button>
            <span className="text-[15px] font-semibold text-gray-900">
              {editUser ? 'Edit User' : 'Add New User'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-brand px-4 py-[7px] text-[13px] font-semibold text-white hover:bg-brand-hover transition-colors"
          >
            {editUser ? 'Save Changes' : 'Create User'}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4 px-5 py-5">

            {/* Required notice */}
            {showErrors && (firstNameErr || lastNameErr || emailErr || deptErr || rolesErr) && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <AlertTriangle size={15} className="mt-0.5 flex-shrink-0 text-red-500" />
                <p className="text-[13px] text-red-700">Please fill in all required fields before saving.</p>
              </div>
            )}

            {/* Personal info */}
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Personal Information</p>
            <div className="grid grid-cols-2 gap-3">
              <DrawerField label="First Name" required>
                <DrawerInput
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="First name"
                  className={firstNameErr ? 'border-red-400' : ''}
                />
              </DrawerField>
              <DrawerField label="Last Name" required>
                <DrawerInput
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="Last name"
                  className={lastNameErr ? 'border-red-400' : ''}
                />
              </DrawerField>
            </div>
            <DrawerField label="Email Address" required>
              <DrawerInput
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="user@finanshels.com"
                className={emailErr ? 'border-red-400' : ''}
              />
              {emailErr && <p className="mt-1 text-[11.5px] text-red-500">{!email.trim() ? 'Email is required.' : 'Enter a valid email address.'}</p>}
            </DrawerField>
            <div className="grid grid-cols-2 gap-3">
              <DrawerField label="Phone Number">
                <DrawerInput value={phone} onChange={e => setPhone(e.target.value)} placeholder="+971 50 000 0000" />
              </DrawerField>
              <DrawerField label="Employee ID">
                <DrawerInput value={employeeId} onChange={e => setEmployeeId(e.target.value)} placeholder="EMP-001" />
              </DrawerField>
            </div>
            <DrawerField label="Job Title">
              <DrawerInput value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Senior Accountant" />
            </DrawerField>
            <DrawerField label="Joining Date">
              <DrawerInput type="date" value={joiningDate} onChange={e => setJoiningDate(e.target.value)} />
            </DrawerField>

            <div className="border-t border-gray-100" />

            {/* Organisation */}
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Organisation</p>

            <DrawerField label="Department" required>
              <DrawerSelectField
                value={departmentId}
                onChange={v => { setDepartmentId(v); setTeamId(''); setVerticalId(''); }}
                placeholder="Select department…"
                options={MOCK_DEPARTMENTS.filter(d => d.status === 'Active').map(d => ({ value: d.id, label: d.name }))}
                error={deptErr}
              />
            </DrawerField>
            <div className="grid grid-cols-2 gap-3">
              <DrawerField label="Team">
                <DrawerSelectField
                  value={teamId}
                  onChange={setTeamId}
                  placeholder="Select team…"
                  options={deptTeams.map(t => ({ value: t.id, label: t.name }))}
                />
              </DrawerField>
              <DrawerField label="Vertical">
                <DrawerSelectField
                  value={verticalId}
                  onChange={setVerticalId}
                  placeholder="Select vertical…"
                  options={deptVerticals.map(v => ({ value: v.id, label: v.name }))}
                />
              </DrawerField>
            </div>
            <DrawerField label="Reporting Manager">
              <DrawerSelectField
                value={reportingManagerId}
                onChange={setReportingManagerId}
                placeholder="Select manager…"
                options={managerOptions}
              />
            </DrawerField>

            <div className="border-t border-gray-100" />

            {/* Roles */}
            <DrawerField label="Roles" required>
              {rolesErr && <p className="mb-1 text-[11.5px] text-red-500">At least one role is required.</p>}
              <MultiCheckList
                options={ROLE_OPTIONS}
                selected={roles}
                onChange={v => setRoles(v as UserRole[])}
              />
            </DrawerField>

            {/* Employee Groups */}
            <DrawerField label="Employee Groups">
              <MultiCheckList
                options={EMPLOYEE_GROUP_OPTIONS}
                selected={employeeGroups}
                onChange={setEmployeeGroups}
              />
            </DrawerField>

            {/* Avatar color (visual only) */}
            {!editUser && (
              <DrawerField label="Avatar Color">
                <div className="flex gap-2">
                  {avatarColors.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => {}}
                      className="h-7 w-7 rounded-full ring-offset-2 transition-all"
                      style={{ background: color }}
                      aria-label={color}
                    />
                  ))}
                </div>
              </DrawerField>
            )}
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(content, document.body);
}

/* ═══════════════════════════════════════════════════════════════════════
   RESET PASSWORD DIALOG
   ═══════════════════════════════════════════════════════════════════════ */

function ResetPasswordDialog({ open, onOpenChange, user }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  user: AppUser | null;
}) {
  if (!user) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-[15px]">Reset Password</DialogTitle>
          <DialogDescription className="mt-2 text-[13px] leading-relaxed text-gray-600">
            A password reset link will be sent to{' '}
            <span className="font-semibold text-gray-900">{user.email}</span>.{' '}
            The link expires in 24 hours. The user will remain active until they reset their password.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-2 gap-2">
          <button type="button" onClick={() => onOpenChange(false)}
            className="rounded-lg border border-gray-200 px-4 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="button"
            onClick={() => { onOpenChange(false); toast.success(`Reset link sent to ${user.email}`); }}
            className="rounded-lg bg-brand px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-hover transition-colors">
            Send Reset Link
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ACTIVATE DIALOG
   ═══════════════════════════════════════════════════════════════════════ */

function ActivateDialog({ open, onOpenChange, user, onConfirm }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  user: AppUser | null;
  onConfirm: () => void;
}) {
  if (!user) return null;
  const label = user.status === 'Inactive' ? 'Reactivate' : 'Activate';
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-[15px]">{label} "{user.firstName} {user.lastName}"?</DialogTitle>
          <DialogDescription className="mt-2 text-[13px] leading-relaxed text-gray-600">
            This user will be marked as <strong>Active</strong> and will be able to log in and be assigned to projects and tasks.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-2 gap-2">
          <button type="button" onClick={() => onOpenChange(false)}
            className="rounded-lg border border-gray-200 px-4 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="button"
            onClick={() => { onConfirm(); onOpenChange(false); }}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-[13px] font-semibold text-white hover:bg-emerald-600 transition-colors">
            {label}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   EMPLOYEE EXIT & DEPENDENCY TRANSFER DRAWER (multi-step)
   ═══════════════════════════════════════════════════════════════════════ */

interface ExitDrawerProps {
  open: boolean;
  onClose: () => void;
  user: AppUser | null;
  allUsers: AppUser[];
  onConfirm: () => void;
}

function ExitDrawer({ open, onClose, user, allUsers, onConfirm }: ExitDrawerProps) {
  const [mounted,    setMounted]    = useState(false);
  const [step,       setStep]       = useState(0); // 0=review 1=transfer 2=confirm
  const [exitDate,   setExitDate]   = useState('');
  const [exitNotes,  setExitNotes]  = useState('');
  /* project transfers: { [projectId]: userId } */
  const [projTransfers, setProjTransfers] = useState<Record<string, string>>({});
  /* task bulk-transfer: single user id */
  const [taskTransferTo, setTaskTransferTo] = useState('');

  useEffect(() => setMounted(true), []);

  /* Reset on open */
  useEffect(() => {
    if (open) {
      setStep(0);
      setExitDate('');
      setExitNotes('');
      setProjTransfers({});
      setTaskTransferTo('');
    }
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!mounted || !user) return null;

  const deps: UserDependency = MOCK_USER_DEPENDENCIES[user.id] ?? { projects: [], tasks: [] };
  const hasDeps = deps.projects.length > 0 || deps.tasks.length > 0;

  const activeUsersExcluding = allUsers.filter(u => u.status === 'Active' && u.id !== user.id);

  /* Step 1 can advance when exit date is set */
  const step0CanProceed = Boolean(exitDate);

  /* Step 2 — all projects must have a transfer + tasks must have a transfer (if any) */
  const projComplete = deps.projects.every(p => Boolean(projTransfers[p.id]));
  const taskComplete = deps.tasks.length === 0 || Boolean(taskTransferTo);
  const step1CanProceed = !hasDeps || (projComplete && taskComplete);

  function handleConfirm() {
    onConfirm();
    onClose();
    toast.success(`${user?.firstName ?? ''} ${user?.lastName ?? ''} has been deactivated. Dependencies transferred.`.trim());
  }

  /* Total steps: if no deps, skip step 1 (transfer) */
  const totalSteps = hasDeps ? 3 : 2; // we show step 0 and 1 (or 0 → 2 when no deps)

  function nextStep() {
    if (step === 0) {
      setStep(hasDeps ? 1 : 2);
    } else {
      setStep(s => s + 1);
    }
  }

  const STEP_LABELS = ['Review & Exit Date', 'Transfer Dependencies', 'Confirm Deactivation'];

  const content = (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/30 transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      />

      {/* Panel */}
      <div className={cn(
        'fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-2xl transition-transform duration-300 ease-out sm:w-[42rem]',
        open ? 'translate-x-0' : 'translate-x-full',
      )}>
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-red-100 bg-red-50 px-5 py-[14px]">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 hover:bg-red-100 transition-colors">
              <ArrowLeft size={17} />
            </button>
            <div>
              <p className="text-[14px] font-bold text-red-800">Employee Exit Process</p>
              <p className="text-[12px] text-red-500">{user.firstName} {user.lastName} · {STEP_LABELS[step]}</p>
            </div>
          </div>
          {/* Step indicator */}
          <div className="flex items-center gap-1.5">
            {[0, ...(hasDeps ? [1] : []), 2].map((s, idx) => (
              <div
                key={s}
                className={cn(
                  'h-2 w-2 rounded-full transition-colors',
                  step === s ? 'bg-red-500' : step > s ? 'bg-red-300' : 'bg-red-200',
                )}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-5 px-5 py-5">

            {/* ── STEP 0: Review & Exit Date ── */}
            {step === 0 && (
              <>
                {/* User card */}
                <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <UserAvatar user={user} size={44} />
                  <div>
                    <p className="text-[14px] font-semibold text-gray-900">{user.firstName} {user.lastName}</p>
                    <p className="text-[12.5px] text-gray-500">{user.jobTitle ?? 'No title'} · {user.email}</p>
                    <p className="mt-0.5 text-[12px] text-gray-400">ID: {user.employeeId ?? '—'}</p>
                  </div>
                </div>

                {/* Warning */}
                <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
                  <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-amber-500" strokeWidth={2} />
                  <div className="text-[13px] text-amber-800">
                    <p className="font-semibold">Deactivation requires dependency transfer.</p>
                    <p className="mt-0.5 leading-snug text-amber-700">
                      This user's active assignments must be transferred before they can be deactivated.
                      Only active users can log into Finanshels.
                    </p>
                  </div>
                </div>

                {/* Dependencies summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
                    <p className="text-[22px] font-bold text-gray-900">{deps.projects.length}</p>
                    <p className="text-[12px] text-gray-500">Active Projects</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
                    <p className="text-[22px] font-bold text-gray-900">{deps.tasks.length}</p>
                    <p className="text-[12px] text-gray-500">Open Tasks</p>
                  </div>
                </div>

                {/* Exit date */}
                <DrawerField label="Last Working Date" required>
                  <DrawerInput
                    type="date"
                    value={exitDate}
                    onChange={e => setExitDate(e.target.value)}
                    className={!exitDate && step === 0 ? '' : ''}
                  />
                  {!exitDate && <p className="mt-1 text-[11.5px] text-gray-400">Required to proceed</p>}
                </DrawerField>
              </>
            )}

            {/* ── STEP 1: Transfer Dependencies ── */}
            {step === 1 && (
              <>
                {deps.projects.length > 0 && (
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <Building2 size={14} className="text-gray-400" />
                      <p className="text-[13px] font-semibold text-gray-800">Project Assignments ({deps.projects.length})</p>
                    </div>
                    <div className="space-y-2.5">
                      {deps.projects.map(proj => (
                        <div key={proj.id} className="rounded-xl border border-gray-200 bg-white p-3.5">
                          <p className="mb-2 text-[13px] font-medium text-gray-900 line-clamp-1">{proj.title}</p>
                          <p className="mb-2 text-[11.5px] text-gray-400">Role: {proj.role}</p>
                          <DrawerSelectField
                            value={projTransfers[proj.id] ?? ''}
                            onChange={v => setProjTransfers(prev => ({ ...prev, [proj.id]: v }))}
                            placeholder="Transfer to…"
                            options={activeUsersExcluding.map(u => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))}
                            error={!projTransfers[proj.id]}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {deps.tasks.length > 0 && (
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <Users size={14} className="text-gray-400" />
                      <p className="text-[13px] font-semibold text-gray-800">Task Assignments ({deps.tasks.length})</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <p className="mb-1 text-[12.5px] text-gray-500">Transfer all {deps.tasks.length} tasks to:</p>
                      <DrawerSelectField
                        value={taskTransferTo}
                        onChange={setTaskTransferTo}
                        placeholder="Select user to receive all tasks…"
                        options={activeUsersExcluding.map(u => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))}
                        error={!taskTransferTo}
                      />
                      <div className="mt-3 max-h-[180px] overflow-y-auto space-y-1.5">
                        {deps.tasks.map(task => (
                          <div key={task.id} className="flex items-start gap-2 rounded-lg bg-gray-50 px-3 py-2">
                            <Check size={12} className={cn('mt-0.5 flex-shrink-0', taskTransferTo ? 'text-emerald-500' : 'text-gray-300')} strokeWidth={3} />
                            <div>
                              <p className="text-[12.5px] font-medium text-gray-800">{task.title}</p>
                              <p className="text-[11.5px] text-gray-400">{task.project}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {!hasDeps && (
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5">
                    <UserCheck size={16} className="text-emerald-500" />
                    <p className="text-[13px] text-emerald-700 font-medium">No active dependencies. You can proceed to confirm.</p>
                  </div>
                )}
              </>
            )}

            {/* ── STEP 2: Confirm Deactivation ── */}
            {step === 2 && (
              <>
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4">
                  <p className="text-[14px] font-bold text-red-800">Final Confirmation</p>
                  <p className="mt-1 text-[13px] text-red-700 leading-relaxed">
                    You are about to deactivate <strong>{user.firstName} {user.lastName}</strong>.
                    Their account will be disabled immediately and they will no longer be able to log in.
                  </p>
                </div>

                {hasDeps && (
                  <div className="space-y-2">
                    <p className="text-[12px] font-semibold uppercase tracking-widest text-gray-400">Transfers Summary</p>
                    {deps.projects.map(p => {
                      const toUser = activeUsersExcluding.find(u => u.id === projTransfers[p.id]);
                      return (
                        <div key={p.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                          <p className="text-[12.5px] text-gray-700 truncate flex-1 mr-3">{p.title}</p>
                          <p className="text-[12px] font-medium text-emerald-600 flex-shrink-0">→ {toUser?.firstName} {toUser?.lastName}</p>
                        </div>
                      );
                    })}
                    {deps.tasks.length > 0 && (() => {
                      const toUser = activeUsersExcluding.find(u => u.id === taskTransferTo);
                      return (
                        <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                          <p className="text-[12.5px] text-gray-700">{deps.tasks.length} tasks</p>
                          <p className="text-[12px] font-medium text-emerald-600">→ {toUser?.firstName} {toUser?.lastName}</p>
                        </div>
                      );
                    })()}
                  </div>
                )}

                <DrawerField label="Exit Notes">
                  <DrawerTextarea
                    value={exitNotes}
                    onChange={e => setExitNotes(e.target.value)}
                    placeholder="Reason for deactivation, exit circumstances, or additional notes…"
                    rows={4}
                  />
                </DrawerField>

                <p className="text-[12px] text-gray-400 leading-relaxed">
                  Exit date: <strong className="text-gray-700">{exitDate}</strong>. This action cannot be undone from this screen.
                  The user can be reactivated later from the User Management list.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Footer nav */}
        <div className="flex flex-shrink-0 items-center justify-between border-t border-gray-100 px-5 py-3.5">
          <button
            type="button"
            onClick={step === 0 ? onClose : () => setStep(s => (s === 2 && !hasDeps) ? 0 : s - 1)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={14} />
            {step === 0 ? 'Cancel' : 'Back'}
          </button>

          {step < 2 ? (
            <button
              type="button"
              onClick={nextStep}
              disabled={step === 0 ? !step0CanProceed : !step1CanProceed}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-colors',
                (step === 0 ? step0CanProceed : step1CanProceed)
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-red-200 cursor-not-allowed',
              )}
            >
              Next <ArrowRight size={14} />
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

export function UsersScreen({ hideHeader = false }: { hideHeader?: boolean }) {
  const [users, setUsers] = useState<AppUser[]>(MOCK_USERS);

  /* Filters */
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | UserStatus>('All');
  const [deptFilter,   setDeptFilter]   = useState('');

  /* Drawer state */
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [editUser,    setEditUser]    = useState<AppUser | null>(null);

  /* Dialog state */
  const [resetTarget,    setResetTarget]    = useState<AppUser | null>(null);
  const [activateTarget, setActivateTarget] = useState<AppUser | null>(null);
  const [exitTarget,     setExitTarget]     = useState<AppUser | null>(null);

  /* Derived stats */
  const total    = users.length;
  const active   = users.filter(u => u.status === 'Active').length;
  const inactive = users.filter(u => u.status === 'Inactive').length;
  const pending  = users.filter(u => u.status === 'Pending').length;

  /* Dept map for display */
  const deptMap = Object.fromEntries(MOCK_DEPARTMENTS.map(d => [d.id, d.name]));

  /* Manager map */
  const managerMap = Object.fromEntries(users.map(u => [u.id, `${u.firstName} ${u.lastName}`]));

  /* Filtered list */
  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const nameMatch = `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.jobTitle ?? '').toLowerCase().includes(q) ||
      (u.employeeId ?? '').toLowerCase().includes(q);
    const statusMatch = statusFilter === 'All' || u.status === statusFilter;
    const deptMatch = !deptFilter || u.departmentId === deptFilter;
    return nameMatch && statusMatch && deptMatch;
  });

  function handleSave(data: Partial<AppUser>) {
    if (editUser) {
      setUsers(us => us.map(u => u.id === editUser.id ? { ...u, ...data } : u));
      toast.success(`${data.firstName} ${data.lastName} updated`);
    } else {
      const newUser: AppUser = {
        id: makeId(),
        status: 'Pending',
        avatarColor: '#334756',
        createdAt: new Date().toISOString().slice(0, 10),
        roles: [],
        employeeGroups: [],
        firstName: '',
        lastName: '',
        email: '',
        departmentId: '',
        ...data,
      };
      setUsers(us => [...us, newUser]);
      toast.success(`${newUser.firstName} ${newUser.lastName} added`);
    }
    setDrawerOpen(false);
    setEditUser(null);
  }

  function openAdd() { setEditUser(null); setDrawerOpen(true); }
  function openEdit(u: AppUser) { setEditUser(u); setDrawerOpen(true); }

  function handleActivate(u: AppUser) {
    setUsers(us => us.map(x => x.id === u.id ? { ...x, status: 'Active' } : x));
    toast.success(`${u.firstName} ${u.lastName} is now Active`);
    setActivateTarget(null);
  }

  function handleDeactivate(u: AppUser) {
    setUsers(us => us.map(x => x.id === u.id ? { ...x, status: 'Inactive' } : x));
  }

  return (
    <div className="px-6 py-6 lg:px-8">
      {/* Page header */}
      {!hideHeader && (
        <div className="mb-6">
          <h1 className="text-[20px] font-bold text-gray-900">User Management</h1>
          <p className="mt-0.5 text-[13.5px] text-gray-500">
            Add, manage, and control access for all users in your organisation.
          </p>
        </div>
      )}

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        {[
          { label: 'Total Users',    count: total,    color: 'text-gray-900',    bg: 'bg-gray-100',    click: () => setStatusFilter('All') },
          { label: 'Active',         count: active,   color: 'text-emerald-700', bg: 'bg-emerald-50',  click: () => setStatusFilter('Active') },
          { label: 'Inactive',       count: inactive, color: 'text-gray-500',    bg: 'bg-gray-100',    click: () => setStatusFilter('Inactive') },
          { label: 'Pending',        count: pending,  color: 'text-amber-700',   bg: 'bg-amber-50',    click: () => setStatusFilter('Pending') },
        ].map(({ label, count, color, bg, click }) => (
          <button key={label} type="button" onClick={click}
            className={cn(
              'flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-left transition-colors hover:border-brand/40',
              statusFilter === label.replace('Total Users', 'All') && 'border-brand/50 ring-1 ring-brand/20',
            )}>
            <span className={cn('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-[18px] font-bold', bg, color)}>
              {count}
            </span>
            <span className="text-[12.5px] font-medium text-gray-600">{label}</span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex h-9 items-center">
          <Search size={14} className="pointer-events-none absolute left-3 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, or ID…"
            className="h-full w-[260px] rounded-xl border border-gray-200 bg-white pl-9 pr-8 text-[13px] text-gray-800 placeholder:text-gray-400 focus:border-brand focus:outline-none transition-colors"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')}
              className="absolute right-2.5 flex h-4 w-4 items-center justify-center rounded bg-gray-200 text-gray-500 hover:bg-gray-300 transition-colors">
              <X size={10} />
            </button>
          )}
        </div>

        {/* Department filter */}
        <div className="relative">
          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            className="h-9 appearance-none rounded-xl border border-gray-200 bg-white pl-3 pr-8 text-[13px] text-gray-700 focus:border-brand focus:outline-none transition-colors"
          >
            <option value="">All Departments</option>
            {MOCK_DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>

        {(search || deptFilter || statusFilter !== 'All') && (
          <button type="button"
            onClick={() => { setSearch(''); setDeptFilter(''); setStatusFilter('All'); }}
            className="flex items-center gap-1 text-[12.5px] text-gray-500 hover:text-brand transition-colors">
            <X size={12} /> Clear filters
          </button>
        )}

        <div className="ml-auto">
          <button type="button" onClick={openAdd}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-brand-hover transition-colors">
            <Plus size={14} /> Add User
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-200 bg-gray-50 hover:bg-gray-50">
              <TableHead className="pl-5 text-[10px] font-semibold uppercase tracking-widest text-gray-500">User</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 w-[200px]">Department</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">Roles</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 w-[160px]">Reporting Manager</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 w-[100px]">Status</TableHead>
              <TableHead className="w-[52px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-14 text-center text-[13px] text-gray-400">
                  {search || deptFilter || statusFilter !== 'All'
                    ? 'No users match your filters.'
                    : 'No users yet. Click "Add User" to get started.'}
                </TableCell>
              </TableRow>
            ) : filtered.map(u => {
              const deptName = deptMap[u.departmentId] ?? '—';
              const manager  = u.reportingManagerId ? managerMap[u.reportingManagerId] : null;
              const shownRoles = u.roles.slice(0, 2);
              const extraRoles = u.roles.length - 2;
              const isInactive = u.status === 'Inactive';
              return (
                <TableRow
                  key={u.id}
                  className={cn(
                    'border-b border-gray-100 transition-colors hover:bg-gray-50/70',
                    isInactive && 'opacity-55',
                  )}
                >
                  {/* User column */}
                  <TableCell className="pl-5 py-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar user={u} />
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-semibold text-gray-900 truncate">
                          {u.firstName} {u.lastName}
                        </p>
                        <p className="text-[12px] text-gray-400 truncate">{u.email}</p>
                        {u.jobTitle && <p className="text-[11.5px] text-gray-400">{u.jobTitle}</p>}
                      </div>
                    </div>
                  </TableCell>

                  {/* Department */}
                  <TableCell className="py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-[12px] font-medium text-gray-700">
                      <Building2 size={11} className="text-brand" />
                      {deptName}
                    </span>
                  </TableCell>

                  {/* Roles */}
                  <TableCell className="py-3">
                    <div className="flex flex-wrap items-center gap-1">
                      {shownRoles.map(r => <RoleBadge key={r} role={r} />)}
                      {extraRoles > 0 && (
                        <span className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2 py-[2px] text-[11px] font-medium text-gray-500">
                          +{extraRoles}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Manager */}
                  <TableCell className="py-3 text-[12.5px] text-gray-600">
                    {manager ?? <span className="text-gray-300">—</span>}
                  </TableCell>

                  {/* Status */}
                  <TableCell className="py-3">
                    <StatusBadge status={u.status} />
                    {isInactive && (
                      <p className="mt-0.5 text-[10.5px] text-gray-400">Cannot log in</p>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="py-3 pr-3">
                    <UserActionMenu
                      user={u}
                      onEdit={() => openEdit(u)}
                      onResetPassword={() => setResetTarget(u)}
                      onActivate={() => setActivateTarget(u)}
                      onDeactivate={() => setExitTarget(u)}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Results count */}
      {filtered.length > 0 && (
        <p className="mt-3 text-[12px] text-gray-400">
          Showing {filtered.length} of {total} user{total !== 1 ? 's' : ''}
        </p>
      )}

      {/* Add/Edit drawer */}
      <UserDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditUser(null); }}
        editUser={editUser}
        allUsers={users}
        onSave={handleSave}
      />

      {/* Reset password dialog */}
      <ResetPasswordDialog
        open={Boolean(resetTarget)}
        onOpenChange={open => { if (!open) setResetTarget(null); }}
        user={resetTarget}
      />

      {/* Activate dialog */}
      <ActivateDialog
        open={Boolean(activateTarget)}
        onOpenChange={open => { if (!open) setActivateTarget(null); }}
        user={activateTarget}
        onConfirm={() => activateTarget && handleActivate(activateTarget)}
      />

      {/* Exit workflow drawer */}
      <ExitDrawer
        open={Boolean(exitTarget)}
        onClose={() => setExitTarget(null)}
        user={exitTarget}
        allUsers={users}
        onConfirm={() => exitTarget && handleDeactivate(exitTarget)}
      />
    </div>
  );
}
