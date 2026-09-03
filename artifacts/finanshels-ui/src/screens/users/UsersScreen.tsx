'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Plus, MoreHorizontal,
  ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp,
  AlertTriangle, UserCheck, UserRound, Users, Users2, Building2, Layers, SearchX,
  Mail, Search,
} from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';
import { Empty } from '@/components/ui/empty';
import { SearchInput } from '@/components/ui/search-input';
import { SortableTableHead, type SortDirection } from '@/components/ui/sortable-table-head';
import { ProjectsPagination } from '../projects/ProjectsPagination';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { DrawerField, DrawerInput, DrawerTextarea } from '@/components/ui/drawer-fields';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
  MOCK_DEPARTMENTS, MOCK_TEAMS, MOCK_VERTICALS,
  MOCK_USER_DEPENDENCIES,
  ALLOW_MULTIPLE_ROLES, ROLE_OPTIONS,
  type AppUser, type EmployeeGroup, type UserStatus, type UserRole, type UserDependency,
} from './mock-data';
import { getProjectDisplayName, MOCK_PROJECTS } from '../projects/mock-data';
import { useEmployeeGroupsContext } from '@/contexts/EmployeeGroupsContext';
import { useAccessControlContext } from '@/contexts/AccessControlContext';
import { EffectiveAccessDrawer } from './EffectiveAccessDrawer';

const PROJECTS_BY_TITLE = new Map(MOCK_PROJECTS.map(project => [project.title, project]));
const getDependencyProjectDisplayName = (title: string) => {
  const project = PROJECTS_BY_TITLE.get(title);
  return project ? getProjectDisplayName(project) : title;
};

/* ─── helpers ─────────────────────────────────────────────────────────── */

function makeId() { return `u-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

type UserSortKey = 'name' | 'email' | 'jobTitle' | 'department' | 'verticals' | 'roles' | 'manager' | 'status';

function compareSortValues(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function getInitials(u: AppUser) {
  return `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
}

function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}


function wouldCreateCycle(userId: string, potentialManagerId: string, users: AppUser[]): boolean {
  let currentId: string | undefined = potentialManagerId;
  const visited = new Set<string>();

  while (currentId) {
    if (currentId === userId) return true;
    if (visited.has(currentId)) return true; // prevent infinite loop if existing cycle
    visited.add(currentId);

    const manager = users.find(u => u.id === currentId);
    currentId = manager?.reportingManagerId;
  }
  return false;
}

/* ─── Status badge ────────────────────────────────────────────────────── */

const STATUS_STYLE: Record<UserStatus, string> = {
  Active:   'border-emerald-200 bg-emerald-50 text-emerald-700',
  Inactive: 'border-gray-200 bg-gray-100 text-gray-500',
  Pending:  'border-amber-200 bg-amber-50 text-amber-700',
};

function StatusBadge({ status }: { status: UserStatus }) {
  const badge = (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-[3px] text-[11.5px] font-medium', STATUS_STYLE[status])}>
      {status}
    </span>
  );

  if (status !== 'Inactive') return badge;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="top" sideOffset={6} className="rounded-md bg-[#082032] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg">
          Cannot log in
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function UnassignedManager() {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div aria-label="Unassigned" className="inline-flex cursor-default items-center gap-2">
            <div className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 ring-[1.5px] ring-white">
              <UserRound size={11} className="text-gray-400" />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="rounded-md bg-[#082032] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg">
          Unassigned
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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

/* ─── Role selector ────────────────────────────────────────────────────── */

function MultiSelectField({
  options,
  selected,
  onChange,
  placeholder,
  error,
  summaryNoun = 'roles',
}: {
  options: Array<{ value: string; label: string }>;
  selected: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  error?: boolean;
  summaryNoun?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selectedLabels = options
    .filter(option => selected.includes(option.value))
    .map(option => option.label);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  function toggle(option: string) {
    onChange(selected.includes(option)
      ? selected.filter(value => value !== option)
      : [...selected, option]);
  }

  const visibleOptions = query.trim()
    ? options.filter(option => option.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={placeholder}
          aria-expanded={open}
          className={cn(
            'flex h-11 w-full items-center justify-between gap-3 rounded-xl border bg-white px-3.5 text-left text-[13px] transition-colors',
            'focus:outline-none focus:ring-1 focus:ring-brand/20',
            error
              ? 'border-red-400 focus:border-red-400'
              : selected.length || open
                ? 'border-brand focus:border-brand'
                : 'border-gray-200 text-gray-400 focus:border-brand',
          )}
        >
          <span className="min-w-0 truncate">
            {selectedLabels.length === 0
              ? placeholder
              : selectedLabels.length === 1
                ? selectedLabels[0]
                : `${selectedLabels.length} ${summaryNoun} selected`}
          </span>
          {open
            ? <ChevronUp size={16} className="flex-shrink-0 text-gray-400" />
            : <ChevronDown size={16} className="flex-shrink-0 text-gray-400" />}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="z-[200] w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-xl border border-gray-100 bg-white p-1.5 shadow-xl"
      >
        <div className="p-1 pb-1.5">
          <div className="flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3">
            <Search size={13} className="flex-shrink-0 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder={`Search ${summaryNoun}...`}
              aria-label={`Search ${summaryNoun}`}
              className="min-w-0 flex-1 bg-transparent text-[13px] text-gray-800 outline-none placeholder:text-gray-400"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="flex h-4 w-4 items-center justify-center rounded bg-gray-200 text-[10px] text-gray-600 transition-colors hover:bg-gray-300"
              >
                ×
              </button>
            )}
          </div>
        </div>
        <ul className="max-h-[220px] overflow-y-auto p-1 pt-0">
          {visibleOptions.length > 0 ? visibleOptions.map(option => {
            const checked = selected.includes(option.value);
            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => toggle(option.value)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors',
                    checked
                      ? 'bg-orange-50 text-brand'
                      : 'text-gray-800 hover:bg-gray-100',
                  )}
                >
                  <span className={cn(
                    'flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-[4px] border-[1.5px] transition-colors',
                    checked ? 'border-brand bg-brand' : 'border-gray-300 bg-white',
                  )}>
                    {checked && <Check size={11} className="text-white" strokeWidth={3} />}
                  </span>
                  <span className={cn(
                    'select-none text-[13px]',
                    checked && 'font-medium',
                  )}>
                    {option.label}
                  </span>
                </button>
              </li>
            );
          }) : (
            <li className="px-3 py-4 text-center text-[12px] text-gray-400">No results</li>
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

/* ─── App select for drawers ───────────────────────────────────────────── */

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
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label={placeholder}
        className={cn(
          'h-11 w-full rounded-xl border bg-white px-3.5 text-[13px] transition-colors',
          'focus:outline-none focus:ring-1 focus:ring-brand/20 [&>svg]:text-gray-400',
          error
            ? 'border-red-400 focus:border-red-400'
            : value
              ? 'border-brand focus:border-brand'
              : 'border-gray-200 text-gray-400 focus:border-brand',
          '[&>span]:truncate [&>span[data-placeholder]]:text-gray-400',
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="z-[200] rounded-xl border border-gray-100 bg-white shadow-xl">
        {options.map(o => (
          <SelectItem
            key={o.value}
            value={o.value}
            className="cursor-pointer rounded-lg py-2.5 pl-3 pr-8 text-[13px] text-gray-800 focus:bg-orange-50 focus:text-brand data-[state=checked]:font-medium"
          >
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ─── Action menu ─────────────────────────────────────────────────────── */

function UserActionMenu({
  user,
  onViewAccess,
  onEdit,
  onResetPassword,
  onActivate,
  onDeactivate,
}: {
  user: AppUser;
  onViewAccess: () => void;
  onEdit: () => void;
  onResetPassword: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
}) {
  const [open, setOpen] = useState(false);

  const isActive = user.status === 'Active';

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none"
          aria-label="User actions"
        >
          <MoreHorizontal size={14} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="w-44 rounded-xl border border-gray-100 bg-white p-1.5 shadow-xl"
      >
        <button
          type="button"
          onClick={() => { setOpen(false); onEdit(); }}
          className="w-full rounded-md px-3 py-2 text-left text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-100"
        >
          Edit User
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); onViewAccess(); }}
          className="w-full rounded-md px-3 py-2 text-left text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-100"
        >
          View Effective Access
        </button>

        <button
          type="button"
          onClick={() => { setOpen(false); onResetPassword(); }}
          className="w-full rounded-md px-3 py-2 text-left text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-100"
        >
          Reset Password
        </button>

        <div className="my-1 border-t border-gray-100" />

        <button
          type="button"
          onClick={() => { setOpen(false); isActive ? onDeactivate() : onActivate(); }}
          className={cn(
            'w-full rounded-md px-3 py-2 text-left text-[13px] font-medium transition-colors',
            isActive ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-100',
          )}
        >
          {isActive ? 'Deactivate User' : user.status === 'Inactive' ? 'Reactivate User' : 'Activate User'}
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
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
  groups: EmployeeGroup[];
  onSave: (data: Partial<AppUser>, editingUserId?: string) => void;
}

function UserDrawer({ open, onClose, editUser, allUsers, groups, onSave }: UserDrawerProps) {
  const { roles: allRolesContext } = useAccessControlContext();
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockedRef = useRef(false);
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
  const [verticalIds,       setVerticalIds]       = useState<string[]>([]);
  const [reportingManagerId, setReportingManagerId] = useState('');
  const [roles,             setRoles]             = useState<UserRole[]>([]);
  const [employeeGroups,    setEmployeeGroups]    = useState<string[]>([]);
  const [joiningDate,       setJoiningDate]       = useState('');
  const [showErrors,        setShowErrors]        = useState(false);

  /* Populate form when editing */
  useEffect(() => {
    if (open) {
      submitLockedRef.current = false;
      setIsSubmitting(false);
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
        setVerticalIds(editUser.verticalIds?.length
          ? [...editUser.verticalIds]
          : editUser.verticalId
            ? [editUser.verticalId]
            : []);
        setReportingManagerId(editUser.reportingManagerId ?? '');
        setRoles([...editUser.roles]);
        setEmployeeGroups([...editUser.employeeGroups]);
        setJoiningDate(editUser.joiningDate ?? '');
      } else {
        setFirstName(''); setLastName(''); setEmail(''); setPhone('');
        setJobTitle(''); setEmployeeId(''); setDepartmentId('');
        setTeamId(''); setVerticalIds([]); setReportingManagerId('');
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
    .filter(u => {
      if (u.status !== 'Active') return false;
      if (editUser && u.id === editUser.id) return false;
      if (editUser && wouldCreateCycle(editUser.id, u.id, allUsers)) return false;
      return true;
    })
    .map(u => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }));

  /* Validation */
  const firstNameErr = showErrors && !firstName.trim();
  const lastNameErr  = showErrors && !lastName.trim();
  const emailErr     = showErrors && (!email.trim() || !isValidEmail(email));
  const deptErr      = showErrors && !departmentId;
  const rolesErr     = showErrors && roles.length === 0;
  const isFormValid =
    Boolean(firstName.trim()) &&
    Boolean(lastName.trim()) &&
    isValidEmail(email) &&
    Boolean(departmentId) &&
    roles.length > 0;

  function handleSave() {
    setShowErrors(true);
    if (!isFormValid || submitLockedRef.current) return;
    submitLockedRef.current = true;
    setIsSubmitting(true);
    onSave({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      jobTitle: jobTitle.trim() || undefined,
      employeeId: employeeId.trim() || undefined,
      departmentId,
      teamId: teamId || undefined,
      verticalIds: verticalIds.length ? verticalIds : undefined,
      verticalId: verticalIds[0] || undefined,
      reportingManagerId: reportingManagerId || undefined,
      roles,
      employeeGroups,
      joiningDate: joiningDate || undefined,
    }, editUser?.id);
  }

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
            disabled={!isFormValid || isSubmitting}
            className={cn(
              'rounded-lg px-4 py-[7px] text-[13px] font-semibold text-white transition-colors',
              isFormValid && !isSubmitting
                ? 'bg-brand hover:bg-brand-hover'
                : 'cursor-not-allowed bg-orange-200',
            )}
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
              <DatePicker
                value={joiningDate}
                onChange={setJoiningDate}
                placeholder="dd / mm / yyyy"
              />
            </DrawerField>

            <div className="border-t border-gray-100" />

            {/* Organisation */}
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Organisation</p>

            <DrawerField label="Department" required>
              <DrawerSelectField
                value={departmentId}
                onChange={v => { setDepartmentId(v); setTeamId(''); setVerticalIds([]); }}
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
              <DrawerField label="Verticals">
                <MultiSelectField
                  selected={verticalIds}
                  onChange={setVerticalIds}
                  placeholder="Select verticals…"
                  summaryNoun="verticals"
                  options={deptVerticals.map(v => ({ value: v.id, label: v.name }))}
                />
              </DrawerField>
            </div>
            <p className="-mt-1 text-[11.5px] leading-relaxed text-gray-400">
              Department and verticals are for organisational classification, filtering, and reporting only. They do not grant permissions or change data access.
            </p>
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
            <DrawerField label={ALLOW_MULTIPLE_ROLES ? 'Roles' : 'Role'} required>
              {rolesErr && <p className="mb-1 text-[11.5px] text-red-500">At least one role is required.</p>}
              {ALLOW_MULTIPLE_ROLES ? (
                <MultiSelectField
                  selected={roles}
                  onChange={values => setRoles(values as UserRole[])}
                  placeholder="Select roles…"
                  options={allRolesContext.filter(r => r.status === 'Active').map(role => ({ value: role.name, label: role.name }))}
                  error={rolesErr}
                />
              ) : (
                <DrawerSelectField
                  value={roles[0] ?? ''}
                  onChange={value => setRoles([value as UserRole])}
                  placeholder="Select role…"
                  options={allRolesContext.filter(r => r.status === 'Active').map(role => ({ value: role.name, label: role.name }))}
                  error={rolesErr}
                />
              )}
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-gray-400">
                {ALLOW_MULTIPLE_ROLES
                  ? 'Users can be assigned multiple roles when this setting is enabled. Module access is inherited from all assigned roles.'
                  : 'Each user can have one role. Module access is inherited from the assigned role.'}
              </p>
            </DrawerField>

            {/* Employee Groups */}
            <DrawerField label="Assign Employee Groups">
              <MultiSelectField
                selected={employeeGroups}
                onChange={setEmployeeGroups}
                placeholder="Select employee group…"
                summaryNoun="groups"
                options={groups
                  .filter(group => group.status === 'Active')
                  .map(group => ({ value: group.name, label: group.name }))}
              />
            </DrawerField>

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
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed inset-0 z-50 m-auto h-fit w-[calc(100vw-3rem)] max-w-[420px] rounded-2xl bg-white p-6 shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          {/* Icon */}
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50">
            <Mail size={20} className="text-brand" />
          </div>
          {/* Title */}
          <DialogPrimitive.Title className="mt-4 text-[16px] font-semibold text-gray-900">
            Reset Password
          </DialogPrimitive.Title>
          {/* Description */}
          <DialogPrimitive.Description className="mt-2 text-[13.5px] leading-relaxed text-gray-500">
            A password reset link will be sent to{' '}
            <span className="font-medium text-gray-700">{user?.email}</span>.{' '}
            The link expires in 24 hours. The user will remain active until they reset their password.
          </DialogPrimitive.Description>
          {/* Buttons */}
          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => { onOpenChange(false); toast.success(`Reset link sent to ${user?.email}`); }}
              className="flex-1 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-brand-hover"
            >
              Send Reset Link
            </button>
          </div>
          {/* Close */}
          <DialogPrimitive.Close
            aria-label="Close"
            className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={16} strokeWidth={2} />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
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
  const label = user?.status === 'Inactive' ? 'Reactivate' : 'Activate';
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed inset-0 z-50 m-auto h-fit w-[calc(100vw-3rem)] max-w-[420px] rounded-2xl bg-white p-6 shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          {/* Icon */}
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50">
            <UserCheck size={20} className="text-brand" />
          </div>
          {/* Title */}
          <DialogPrimitive.Title className="mt-4 text-[16px] font-semibold text-gray-900">
            {label} "{user?.firstName} {user?.lastName}"?
          </DialogPrimitive.Title>
          {/* Description */}
          <DialogPrimitive.Description className="mt-2 text-[13.5px] leading-relaxed text-gray-500">
            This user will be marked as{' '}
            <span className="font-medium text-gray-700">Active</span>{' '}
            and will be able to log in and be assigned to projects and tasks.
          </DialogPrimitive.Description>
          {/* Buttons */}
          <div className="mt-6 flex gap-2">
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
              className="flex-1 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-brand-hover"
            >
              {label}
            </button>
          </div>
          {/* Close */}
          <DialogPrimitive.Close
            aria-label="Close"
            className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={16} strokeWidth={2} />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   EMPLOYEE EXIT & DEPENDENCY TRANSFER DRAWER (single view)
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

  /* All required information must be complete before deactivation. */
  const projComplete = deps.projects.every(p => Boolean(projTransfers[p.id]));
  const taskComplete = deps.tasks.length === 0 || Boolean(taskTransferTo);
  const canConfirm = Boolean(exitDate) && projComplete && taskComplete;

  function handleConfirm() {
    onConfirm();
    onClose();
    toast.success(`${user?.firstName ?? ''} ${user?.lastName ?? ''} has been deactivated. Dependencies transferred.`.trim());
  }

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
        {/* Header — matches DeleteProjectDrawer exactly */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-5 py-[14px]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={17} />
            </button>
            <div>
              <span className="text-[15px] font-semibold text-gray-900">Deactivate User</span>
            </div>
          </div>
          {/* Action button in header — same pattern as DeleteProjectDrawer */}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={cn(
              'rounded-lg px-4 py-[7px] text-[13px] font-semibold text-white transition-colors',
              canConfirm ? 'bg-red-500 hover:bg-red-600' : 'bg-red-200 cursor-not-allowed',
            )}
          >
            Deactivate User
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-5 px-5 py-5">

            {/* ── SINGLE VIEW: User and exit details ── */}
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
                  <DatePicker
                    value={exitDate}
                    onChange={setExitDate}
                    placeholder="dd/mm/yyyy"
                  />
                  {!exitDate && <p className="mt-1 text-[11.5px] text-gray-400">Required to proceed</p>}
                </DrawerField>
            </>

            {/* ── SINGLE VIEW: Transfer dependencies ── */}
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
                          <p className="mb-2 text-[13px] font-medium text-gray-900 line-clamp-1">
                            {getDependencyProjectDisplayName(proj.title)}
                          </p>
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
                               <p className="text-[11.5px] text-gray-400">
                                 {getDependencyProjectDisplayName(task.project)}
                               </p>
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

            {/* ── SINGLE VIEW: Final confirmation and notes ── */}
            <>
                {hasDeps && projComplete && taskComplete && (
                  <div className="space-y-2">
                    <p className="text-[12px] font-semibold uppercase tracking-widest text-gray-400">Transfers Summary</p>
                    {deps.projects.map(p => {
                      const toUser = activeUsersExcluding.find(u => u.id === projTransfers[p.id]);
                      return (
                        <div key={p.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                           <p className="text-[12.5px] text-gray-700 truncate flex-1 mr-3">
                             {getDependencyProjectDisplayName(p.title)}
                           </p>
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
          </div>
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
  const { users, groups, saveUser, updateUserStatus } = useEmployeeGroupsContext();

  /* Filters */
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | UserStatus>('All');
  const [deptFilter,   setDeptFilter]   = useState('');
  const [verticalFilter, setVerticalFilter] = useState('');
  const [deptMenuOpen, setDeptMenuOpen] = useState(false);
  const [verticalMenuOpen, setVerticalMenuOpen] = useState(false);
  const [page,         setPage]         = useState(1);
  const [pageSize,     setPageSize]     = useState(20);
  const [sortKey,      setSortKey]      = useState<UserSortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  /* Drawer state */
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [editUser,    setEditUser]    = useState<AppUser | null>(null);
  const [accessUser,  setAccessUser]  = useState<AppUser | null>(null);

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
  const verticalMap = Object.fromEntries(MOCK_VERTICALS.map(v => [v.id, v.name]));

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
    const assignedVerticals = u.verticalIds ?? (u.verticalId ? [u.verticalId] : []);
    const verticalMatch = !verticalFilter || assignedVerticals.includes(verticalFilter);
    return nameMatch && statusMatch && deptMatch && verticalMatch;
  });

  const sorted = [...filtered].sort((a, b) => {
    const values: Record<UserSortKey, string> = {
      name: `${a.firstName} ${a.lastName}`,
      email: a.email,
      jobTitle: a.jobTitle ?? '',
      department: deptMap[a.departmentId] ?? '',
      verticals: (a.verticalIds ?? (a.verticalId ? [a.verticalId] : []))
        .map(id => verticalMap[id] ?? '')
        .join(', '),
      roles: a.roles.join(', '),
      manager: a.reportingManagerId ? managerMap[a.reportingManagerId] ?? '' : '',
      status: a.status,
    };
    const otherValues: Record<UserSortKey, string> = {
      name: `${b.firstName} ${b.lastName}`,
      email: b.email,
      jobTitle: b.jobTitle ?? '',
      department: deptMap[b.departmentId] ?? '',
      verticals: (b.verticalIds ?? (b.verticalId ? [b.verticalId] : []))
        .map(id => verticalMap[id] ?? '')
        .join(', '),
      roles: b.roles.join(', '),
      manager: b.reportingManagerId ? managerMap[b.reportingManagerId] ?? '' : '',
      status: b.status,
    };
    return compareSortValues(values[sortKey], otherValues[sortKey]) * (sortDirection === 'asc' ? 1 : -1);
  });

  function handleSort(key: string) {
    const nextKey = key as UserSortKey;
    if (sortKey === nextKey) {
      setSortDirection(direction => direction === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(nextKey);
      setSortDirection('asc');
    }
    setPage(1);
  }

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, deptFilter, verticalFilter]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedUsers = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  function handleSave(data: Partial<AppUser>, editingUserId?: string) {
    const singleRole = data.roles?.slice(0, 1);
    const editingUser = editingUserId
      ? users.find(user => user.id === editingUserId)
      : undefined;
    if (editingUser) {
      saveUser({ ...editingUser, ...data, ...(singleRole ? { roles: singleRole } : {}) });
      toast.success(`${data.firstName} ${data.lastName} updated`);
    } else {
      const newUser: AppUser = {
        id: makeId(),
        status: 'Pending',
        avatarColor: '#334756',
        createdAt: new Date().toISOString().slice(0, 10),
        employeeGroups: [],
        firstName: '',
        lastName: '',
        email: '',
        departmentId: '',
        ...data,
        roles: singleRole ?? [],
      };
      saveUser(newUser);
      toast.success(`${newUser.firstName} ${newUser.lastName} added`);
    }
    setDrawerOpen(false);
    setEditUser(null);
  }

  function openAdd() { setEditUser(null); setDrawerOpen(true); }
  function openEdit(u: AppUser) { setEditUser(u); setDrawerOpen(true); }

  function handleActivate(u: AppUser) {
    updateUserStatus(u.id, 'Active');
    toast.success(`${u.firstName} ${u.lastName} is now Active`);
    setActivateTarget(null);
  }

  function handleDeactivate(u: AppUser) {
    updateUserStatus(u.id, 'Inactive');
  }

  return (
    <div className="px-6 py-6 lg:px-8">
      {/* Page header */}
      {!hideHeader && (
        <div className="mb-6">
          <h1 className="text-[20px] font-semibold leading-tight text-gray-900 sm:text-[22px]">User Management</h1>
          <p className="mt-0.5 text-[13px] text-gray-500">
            Add, manage, and control access for all users in your organisation.
          </p>
        </div>
      )}

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
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
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name, email, or ID..."
          aria-label="Search users by name, email, or ID"
          className="w-full sm:w-80"
          inputClassName="h-9"
        />

        <div className="ml-auto flex items-center gap-3">
          {/* Department filter */}
          <Popover open={deptMenuOpen} onOpenChange={setDeptMenuOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Filter by department"
                aria-expanded={deptMenuOpen}
                className={cn(
                  'flex h-9 items-center gap-1.5 rounded-lg border bg-white px-3 text-[13px] font-medium transition-colors focus:outline-none',
                  deptFilter
                    ? 'border-brand text-brand hover:bg-orange-50/50'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                )}
              >
                {deptFilter ? deptMap[deptFilter] ?? 'Department' : 'Department'}
                <ChevronDown size={13} className={deptFilter ? 'text-brand' : 'text-gray-500'} />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={6}
              className="w-56 rounded-xl border border-gray-100 bg-white p-2 shadow-xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-1 pb-1 pt-0.5">
                <span className="text-[9.5px] font-bold uppercase tracking-widest text-gray-400">
                  Department
                </span>
                {deptFilter && (
                  <button
                    type="button"
                    onClick={() => { setDeptFilter(''); setDeptMenuOpen(false); }}
                    className="text-[11.5px] font-semibold text-brand transition-colors hover:text-brand/70"
                  >
                    Clear
                  </button>
                )}
              </div>
              {/* Options */}
              <div className="space-y-0.5">
                {[
                  { value: '', label: 'All Departments' },
                  ...MOCK_DEPARTMENTS.map(d => ({ value: d.id, label: d.name })),
                ].map(option => {
                  const isSelected = deptFilter === option.value;
                  return (
                    <button
                      key={option.value || 'all'}
                      type="button"
                      onClick={() => { setDeptFilter(option.value); setDeptMenuOpen(false); }}
                      className={cn(
                        'flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-[7px] text-left text-[13px] font-medium outline-none transition-colors',
                        isSelected ? 'bg-orange-50 text-brand' : 'text-gray-700 hover:bg-gray-100',
                      )}
                    >
                      {option.label}
                      {isSelected && <Check size={14} className="flex-shrink-0 text-brand" />}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>

          {/* Vertical filter */}
          <Popover open={verticalMenuOpen} onOpenChange={setVerticalMenuOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Filter by vertical"
                aria-expanded={verticalMenuOpen}
                className={cn(
                  'flex h-9 items-center gap-1.5 rounded-lg border bg-white px-3 text-[13px] font-medium transition-colors focus:outline-none',
                  verticalFilter
                    ? 'border-brand text-brand hover:bg-orange-50/50'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                )}
              >
                {verticalFilter ? verticalMap[verticalFilter] ?? 'Vertical' : 'Vertical'}
                <ChevronDown size={13} className={verticalFilter ? 'text-brand' : 'text-gray-500'} />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={6}
              className="w-56 rounded-xl border border-gray-100 bg-white p-2 shadow-xl"
            >
              <div className="flex items-center justify-between px-1 pb-1 pt-0.5">
                <span className="text-[9.5px] font-bold uppercase tracking-widest text-gray-400">
                  Vertical
                </span>
                {verticalFilter && (
                  <button
                    type="button"
                    onClick={() => { setVerticalFilter(''); setVerticalMenuOpen(false); }}
                    className="text-[11.5px] font-semibold text-brand transition-colors hover:text-brand/70"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="space-y-0.5">
                {[
                  { value: '', label: 'All Verticals' },
                  ...MOCK_VERTICALS.filter(vertical => vertical.status === 'Active')
                    .map(vertical => ({ value: vertical.id, label: vertical.name })),
                ].map(option => {
                  const isSelected = verticalFilter === option.value;
                  return (
                    <button
                      key={option.value || 'all'}
                      type="button"
                      onClick={() => { setVerticalFilter(option.value); setVerticalMenuOpen(false); }}
                      className={cn(
                        'flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-[7px] text-left text-[13px] font-medium outline-none transition-colors',
                        isSelected ? 'bg-orange-50 text-brand' : 'text-gray-700 hover:bg-gray-100',
                      )}
                    >
                      {option.label}
                      {isSelected && <Check size={14} className="flex-shrink-0 text-brand" />}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>

          <button type="button" onClick={openAdd}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-brand-hover transition-colors">
            <Plus size={14} /> Add User
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto overscroll-x-contain rounded-xl border border-gray-200 bg-white shadow-sm">
        <Table className="w-full min-w-[1180px] table-auto">
          <TableHeader className="whitespace-nowrap">
            <TableRow className="border-b border-gray-200 bg-gray-50 hover:bg-gray-50">
              <TableHead className="w-[150px] pl-5">
                <SortableTableHead label="User" sortKey="name" currentKey={sortKey} currentDirection={sortDirection} onSort={handleSort} />
              </TableHead>
              <TableHead className="w-[210px]">
                <SortableTableHead label="Email" sortKey="email" currentKey={sortKey} currentDirection={sortDirection} onSort={handleSort} />
              </TableHead>
              <TableHead className="w-[150px]">
                <SortableTableHead label="Job Title" sortKey="jobTitle" currentKey={sortKey} currentDirection={sortDirection} onSort={handleSort} />
              </TableHead>
              <TableHead className="w-[140px]">
                <SortableTableHead label="Department" sortKey="department" currentKey={sortKey} currentDirection={sortDirection} onSort={handleSort} />
              </TableHead>
              <TableHead className="w-[150px]">
                <SortableTableHead label="Verticals" sortKey="verticals" currentKey={sortKey} currentDirection={sortDirection} onSort={handleSort} />
              </TableHead>
              <TableHead className="w-[150px]">
                <SortableTableHead label={ALLOW_MULTIPLE_ROLES ? 'Roles' : 'Role'} sortKey="roles" currentKey={sortKey} currentDirection={sortDirection} onSort={handleSort} />
              </TableHead>
              <TableHead className="w-[140px]">
                <SortableTableHead label="Reporting Manager" sortKey="manager" currentKey={sortKey} currentDirection={sortDirection} onSort={handleSort} />
              </TableHead>
              <TableHead className="w-[100px]">
                <SortableTableHead label="Status" sortKey="status" currentKey={sortKey} currentDirection={sortDirection} onSort={handleSort} />
              </TableHead>
              <TableHead className="w-[52px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-0">
                  <Empty
                    icon={search || deptFilter || verticalFilter || statusFilter !== 'All' ? SearchX : Users}
                    title={search || deptFilter || verticalFilter || statusFilter !== 'All'
                      ? 'No matching users'
                      : 'No users yet'}
                    description={search || deptFilter || verticalFilter || statusFilter !== 'All'
                      ? 'Try adjusting your search or filters to find what you’re looking for.'
                      : 'Add a user to start managing access and assignments.'}
                    className="py-16"
                  />
                </TableCell>
              </TableRow>
            ) : paginatedUsers.map(u => {
              const deptName = deptMap[u.departmentId] ?? '—';
              const verticalNames = (u.verticalIds ?? (u.verticalId ? [u.verticalId] : []))
                .map(id => verticalMap[id])
                .filter(Boolean);
              const manager  = u.reportingManagerId ? managerMap[u.reportingManagerId] : null;
              const isInactive = u.status === 'Inactive';
              return (
                <TableRow
                  key={u.id}
                  className={cn(
                    'border-b border-gray-100 transition-colors hover:bg-gray-50/70',
                    isInactive && 'bg-gray-50',
                  )}
                >
                  {/* User */}
                  <TableCell className="pl-5 py-3">
                    <p className="block max-w-[220px] cursor-default truncate text-[13px] font-normal text-gray-900">
                      {u.firstName} {u.lastName}
                    </p>
                  </TableCell>

                  {/* Email */}
                  <TableCell className="py-3">
                    <TooltipProvider delayDuration={150}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="block max-w-[190px] cursor-default truncate whitespace-nowrap text-[13px] text-gray-700">
                            {u.email}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="rounded-md bg-[#082032] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg">
                          {u.email}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>

                  {/* Job title */}
                  <TableCell className="py-3">
                    <p className="truncate text-[13px] text-gray-700">{u.jobTitle ?? '—'}</p>
                  </TableCell>

                  {/* Department */}
                  <TableCell className="py-3">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <Users2 size={12} className="flex-shrink-0 text-gray-400" />
                      <span className="block min-w-0 truncate text-[12.5px] text-gray-700">{deptName}</span>
                    </div>
                  </TableCell>

                  {/* Verticals */}
                  <TableCell className="py-3">
                    <span className="block max-w-[145px] truncate text-[12.5px] text-gray-700">
                      {verticalNames.length > 0 ? verticalNames.join(', ') : '—'}
                    </span>
                  </TableCell>

                  {/* Role */}
                  <TableCell className="py-3">
                    <div className="whitespace-nowrap text-[13px] font-normal leading-relaxed text-gray-700">
                      {u.roles[0] ?? '—'}
                    </div>
                  </TableCell>

                  {/* Manager */}
                  <TableCell className="py-3 text-[13px] text-gray-700">
                    {manager ?? <UnassignedManager />}
                  </TableCell>

                  {/* Status */}
                  <TableCell className="py-3">
                    <StatusBadge status={u.status} />
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="py-3 pr-3">
                    <UserActionMenu
                      user={u}
                      onViewAccess={() => setAccessUser(u)}
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
        <>
          <ProjectsPagination
            page={safePage}
            totalItems={filtered.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </>
      )}

      {/* Add/Edit drawer */}
      <UserDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditUser(null); }}
        editUser={editUser}
        allUsers={users}
        groups={groups}
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

      {/* Effective access explanation */}
      <EffectiveAccessDrawer
        onClose={() => setAccessUser(null)}
        user={accessUser}
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
