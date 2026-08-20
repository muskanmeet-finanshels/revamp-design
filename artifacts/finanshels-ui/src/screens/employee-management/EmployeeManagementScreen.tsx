'use client';

import { useEffect, useMemo, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, ArrowUpDown, Check, ChevronDown, CircleAlert,
  MoreHorizontal, Pencil, Plus, Power, PowerOff, Search, SearchX, Trash2, UsersRound, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Empty } from '@/components/ui/empty';
import { DescriptionTooltip } from '@/components/ui/description-tooltip';
import { SearchInput } from '@/components/ui/search-input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { DrawerField, DrawerInput, DrawerTextarea } from '@/components/ui/drawer-fields';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useEmployeeGroupsContext } from '@/contexts/EmployeeGroupsContext';
import type { AppUser, EmployeeGroup, EmployeeGroupStatus } from '@/screens/users/mock-data';
import { AvatarGroup } from '@/screens/projects/AvatarGroup';

type GroupFilter = 'All' | EmployeeGroupStatus;
type GroupSortKey = 'name' | 'description' | 'members' | 'status';
type SortDirection = 'asc' | 'desc';
type AriaSort = 'ascending' | 'descending' | 'none';

function userName(user: AppUser) {
  return `${user.firstName} ${user.lastName}`;
}

function initials(user: AppUser) {
  return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
}

function StatusBadge({ status }: { status: EmployeeGroupStatus }) {
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

function SortableGroupHead({
  label,
  sortKey,
  currentKey,
  direction,
  onSort,
}: {
  label: string;
  sortKey: GroupSortKey;
  currentKey: GroupSortKey;
  direction: SortDirection;
  onSort: (key: GroupSortKey) => void;
}) {
  const active = currentKey === sortKey;

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      aria-label={`Sort by ${label}`}
      className={cn(
        'flex items-center gap-1 text-left text-[11px] font-semibold uppercase tracking-wider transition-colors',
        active ? 'text-gray-800' : 'text-gray-500 hover:text-gray-700',
      )}
    >
      {label}
      {active
        ? direction === 'asc'
          ? <ArrowUp size={11} className="text-brand" />
          : <ArrowDown size={11} className="text-brand" />
        : <ArrowUpDown size={11} className="opacity-40" />}
    </button>
  );
}

function MemberAvatars({ members }: { members: AppUser[] }) {
  return (
    <AvatarGroup
      size={26}
      max={2}
      members={members.map(member => ({
        initials: initials(member),
        name: userName(member),
        color: member.avatarColor,
      }))}
    />
  );
}

function GroupActionMenu({
  group,
  onEdit,
  onActivate,
  onDeactivate,
  onDelete,
}: {
  group: EmployeeGroup;
  onEdit: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${group.name} actions`}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          <MoreHorizontal size={14} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="w-44 rounded-xl border border-gray-100 bg-white p-1.5 shadow-xl">
        {group.status === 'Active' && (
          <button
            type="button"
            onClick={() => { setOpen(false); onEdit(); }}
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] font-medium text-gray-700 hover:bg-gray-100"
          >
            <Pencil size={13} className="text-gray-400" /> Edit group
          </button>
        )}
        <div className="my-1 border-t border-gray-100" />
        {group.status === 'Active' ? (
          <button
            type="button"
            onClick={() => { setOpen(false); onDeactivate(); }}
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] font-medium text-red-600 hover:bg-red-50"
          >
            <PowerOff size={13} className="text-red-400" /> Deactivate
          </button>
        ) : (
          <button
            type="button"
            onClick={() => { setOpen(false); onActivate(); }}
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] font-medium text-emerald-600 hover:bg-emerald-50"
          >
            <Power size={13} className="text-emerald-500" /> Reactivate
          </button>
        )}
        <button
          type="button"
          onClick={() => { setOpen(false); onDelete(); }}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] font-medium text-red-600 hover:bg-red-50"
        >
          <Trash2 size={13} className="text-red-400" /> Delete group
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MemberPicker({
  users,
  selected,
  onChange,
}: {
  users: AppUser[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const activeUsers = users.filter(user => user.status === 'Active');
  const visibleUsers = activeUsers.filter(user => userName(user).toLowerCase().includes(query.toLowerCase()));
  const selectedNames = activeUsers
    .filter(user => selected.includes(user.id))
    .map(user => userName(user));

  function toggle(userId: string) {
    onChange(selected.includes(userId)
      ? selected.filter(id => id !== userId)
      : [...selected, userId]);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Select employee members"
          aria-expanded={open}
          className={cn(
            'flex h-11 w-full items-center justify-between gap-3 rounded-xl border bg-white px-3.5 text-left text-[13px] transition-colors',
            'focus:outline-none focus:ring-1 focus:ring-brand/20',
            selected.length
              ? 'border-brand focus:border-brand'
              : 'border-gray-200 text-gray-400 focus:border-brand',
          )}
        >
          <span className="min-w-0 truncate">
            {selectedNames.length === 0
              ? 'Select active employees…'
              : selectedNames.length === 1
                ? selectedNames[0]
                : `${selectedNames.length} members selected`}
          </span>
          <ChevronDown size={16} className="flex-shrink-0 text-gray-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="z-[200] w-[var(--radix-popover-trigger-width)] p-1.5">
        <div className="relative mb-1.5">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search active employees…"
            className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-8 pr-2 text-[12.5px] text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand focus:ring-1 focus:ring-brand/20"
          />
        </div>
        <div className="max-h-60 overflow-y-auto">
          {visibleUsers.map(user => {
            const checked = selected.includes(user.id);
            return (
              <button
                key={user.id}
                type="button"
                onClick={() => toggle(user.id)}
                aria-pressed={checked}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors',
                  checked ? 'bg-orange-50 font-medium text-brand' : 'text-gray-700 hover:bg-gray-50',
                )}
              >
                <span className={cn(
                  'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[4px] border-[1.5px]',
                  checked ? 'border-brand bg-brand' : 'border-gray-300 bg-white',
                )}>
                  {checked && <Check size={10} className="text-white" strokeWidth={3} />}
                </span>
                <span className="min-w-0 truncate">{userName(user)}</span>
              </button>
            );
          })}
          {!visibleUsers.length && <p className="px-3 py-5 text-center text-[12px] text-gray-400">No active employees found.</p>}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function GroupDrawer({
  open,
  group,
  users,
  groups,
  onClose,
  onSave,
}: {
  open: boolean;
  group: EmployeeGroup | null;
  users: AppUser[];
  groups: EmployeeGroup[];
  onClose: () => void;
  onSave: (draft: { name: string; description: string; memberIds: string[] }) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    setShowErrors(false);
    setSaving(false);
    setName(group?.name ?? '');
    setDescription(group?.description ?? '');
    setMemberIds(group
      ? users.filter(user => user.status === 'Active' && user.employeeGroups.includes(group.name)).map(user => user.id)
      : []);
  }, [open, group, users]);

  const duplicateName = !saving && groups.some(
    item => item.id !== group?.id && item.name.toLowerCase() === name.trim().toLowerCase(),
  );
  const nameError = showErrors && (!name.trim() || duplicateName);

  function save() {
    setShowErrors(true);
    if (!name.trim() || duplicateName) return;
    setSaving(true);
    onSave({ name: name.trim(), description: description.trim(), memberIds });
  }

  if (!mounted) return null;
  return (
    <DialogPrimitive.Root open={open} onOpenChange={nextOpen => { if (!nextOpen) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/20 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content className="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right sm:w-[34rem]">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-[14px]">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} aria-label="Close employee group drawer" className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100">
              <ArrowLeft size={17} />
            </button>
            <div>
              <DialogPrimitive.Title className="text-[15px] font-semibold text-gray-900">
                {group ? 'Edit Employee Group' : 'Create Employee Group'}
              </DialogPrimitive.Title>
            </div>
          </div>
          <button
            type="button"
            onClick={save}
            disabled={!name.trim() || duplicateName}
            data-testid="save-employee-group"
            className="rounded-lg bg-brand px-4 py-[7px] text-[13px] font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-orange-200"
          >
            {group ? 'Save Changes' : 'Create Group'}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="space-y-5">
            {nameError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <AlertTriangle size={15} className="mt-0.5 flex-shrink-0 text-red-500" />
                <p className="text-[13px] text-red-700">
                  {!name.trim() ? 'Employee group name is required.' : 'An employee group with this name already exists.'}
                </p>
              </div>
            )}
            <DrawerField label="Group Name" required>
              <DrawerInput value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Year-end audit team" className={nameError ? 'border-red-400' : ''} />
            </DrawerField>
            <DrawerField label="Description">
              <DrawerTextarea value={description} onChange={event => setDescription(event.target.value)} rows={3} placeholder="What is this group used for?" />
            </DrawerField>
            <div className="border-t border-gray-100" />
            <DrawerField label="Members">
              <MemberPicker users={users} selected={memberIds} onChange={setMemberIds} />
            </DrawerField>
          </div>
        </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function GroupConfirmationDialog({
  group,
  kind,
  memberCount,
  onClose,
  onConfirm,
}: {
  group: EmployeeGroup | null;
  kind: 'deactivate' | 'delete';
  memberCount: number;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const isDelete = kind === 'delete';
  return (
    <DialogPrimitive.Root
      open={group !== null}
      onOpenChange={open => { if (!open) onClose(); }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/50',
            'data-[state=open]:animate-overlay-enter',
            'data-[state=closed]:animate-overlay-leave',
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-0 z-50 m-auto h-fit w-[calc(100vw-3rem)] max-w-[420px]',
            'rounded-2xl bg-white p-6 shadow-2xl outline-none',
            'data-[state=open]:animate-dialog-enter',
            'data-[state=closed]:animate-dialog-leave',
          )}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
            <CircleAlert size={20} className="text-red-500" />
          </div>
          <DialogPrimitive.Title className="mt-4 text-[16px] font-semibold text-gray-900">
            {isDelete ? 'Delete employee group?' : 'Deactivate employee group?'}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-2 text-[13.5px] leading-relaxed text-gray-500">
            Are you sure you want to {isDelete ? 'delete' : 'deactivate'}{' '}
            <span className="font-medium text-gray-700">
              {group?.name ? `"${group.name}"` : 'this employee group'}
            </span>
            ?{' '}
            {isDelete
              ? 'This action cannot be undone.'
              : 'The group will no longer be available for assignment.'}
            {memberCount > 0 && (
              <> This will remove the group from {memberCount} {memberCount === 1 ? 'employee' : 'employees'}.</>
            )}
          </DialogPrimitive.Description>
          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              data-testid={`${kind}-employee-group`}
              className="flex-1 rounded-lg bg-red-500 px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-red-600"
            >
              {isDelete ? 'Delete Group' : 'Deactivate Group'}
            </button>
          </div>
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

export function EmployeeManagementScreen() {
  const { users, groups, saveGroup, setGroupStatus, deleteGroup } = useEmployeeGroupsContext();
  const [filter, setFilter] = useState<GroupFilter>('All');
  const [query, setQuery] = useState('');
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [sortKey, setSortKey] = useState<GroupSortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<EmployeeGroup | null>(null);
  const [confirmation, setConfirmation] = useState<{ group: EmployeeGroup; kind: 'deactivate' | 'delete' } | null>(null);

  const memberMap = useMemo(() => new Map(groups.map(group => [
    group.id,
    users.filter(user => user.status === 'Active' && user.employeeGroups.includes(group.name)),
  ])), [groups, users]);

  const visibleGroups = useMemo(() => {
    const lowerQuery = query.trim().toLowerCase();
    const filteredGroups = groups.filter(group => {
      const matchesFilter = filter === 'All' || group.status === filter;
      const members = memberMap.get(group.id) ?? [];
      const matchesQuery = !lowerQuery
        || group.name.toLowerCase().includes(lowerQuery)
        || group.description.toLowerCase().includes(lowerQuery)
        || members.some(member => userName(member).toLowerCase().includes(lowerQuery));
      return matchesFilter && matchesQuery;
    });

    return filteredGroups.sort((a, b) => {
      let comparison = 0;
      if (sortKey === 'name') comparison = a.name.localeCompare(b.name);
      if (sortKey === 'description') comparison = a.description.localeCompare(b.description);
      if (sortKey === 'members') {
        comparison = (memberMap.get(a.id)?.length ?? 0) - (memberMap.get(b.id)?.length ?? 0);
      }
      if (sortKey === 'status') comparison = a.status.localeCompare(b.status);
      return comparison === 0
        ? a.name.localeCompare(b.name)
        : sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filter, groups, memberMap, query, sortDirection, sortKey]);

  function handleSort(key: GroupSortKey) {
    if (sortKey === key) {
      setSortDirection(current => current === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortKey(key);
    setSortDirection('asc');
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditingGroup(null);
  }

  function handleSave(draft: { name: string; description: string; memberIds: string[] }) {
    saveGroup(editingGroup?.id ?? null, draft);
    toast.success(editingGroup ? `${draft.name} updated` : `${draft.name} created`);
    closeDrawer();
  }

  function confirmAction() {
    if (!confirmation) return;
    const { group, kind } = confirmation;
    if (kind === 'deactivate') {
      setGroupStatus(group.id, 'Inactive');
      toast.success(`Employee group "${group.name}" deactivated successfully`);
    } else {
      deleteGroup(group.id);
      toast.success(`Employee group "${group.name}" deleted successfully`);
    }
    setConfirmation(null);
  }

  const targetMemberCount = confirmation ? (memberMap.get(confirmation.group.id) ?? []).length : 0;
  const ariaSortFor = (key: GroupSortKey): AriaSort => (
    sortKey !== key
      ? 'none'
      : sortDirection === 'asc' ? 'ascending' : 'descending'
  );

  return (
    <div className="px-6 py-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[20px] font-semibold leading-tight text-gray-900 sm:text-[22px]">Employee Management</h1>
          <p className="mt-0.5 text-[13px] text-gray-500">
            Manage cross-functional employee groups for group-based permission assignments.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setEditingGroup(null); setDrawerOpen(true); }}
          data-testid="new-employee-group"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-[13px] font-semibold text-white shadow-sm hover:bg-brand-hover"
        >
          <Plus size={15} /> New Employee Group
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search groups or employees…"
          aria-label="Search employee groups"
          className="w-full sm:w-80"
        />
        <div className="ml-auto">
          <Popover open={statusMenuOpen} onOpenChange={setStatusMenuOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Filter employee groups by status"
                aria-expanded={statusMenuOpen}
                className={cn(
                  'flex h-9 w-full items-center justify-between gap-1.5 rounded-lg border bg-white px-3 text-[13px] font-medium transition-colors focus:outline-none sm:w-[132px]',
                  filter !== 'All'
                    ? 'border-brand text-brand hover:bg-orange-50/50'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                )}
              >
                {filter === 'All' ? 'Status' : filter}
                <ChevronDown size={13} className={filter !== 'All' ? 'text-brand' : 'text-gray-500'} />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={6}
              className="w-56 rounded-xl border border-gray-100 bg-white p-2 shadow-xl"
            >
              <div className="flex items-center justify-between px-1 pb-1 pt-0.5">
                <span className="text-[9.5px] font-bold uppercase tracking-widest text-gray-400">Status</span>
                {filter !== 'All' && (
                  <button
                    type="button"
                    onClick={() => { setFilter('All'); setStatusMenuOpen(false); }}
                    className="text-[11.5px] font-semibold text-brand transition-colors hover:text-brand/70"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="space-y-0.5">
                {(['All', 'Active', 'Inactive'] as GroupFilter[]).map(value => {
                  const isSelected = filter === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => { setFilter(value); setStatusMenuOpen(false); }}
                      className={cn(
                        'flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-[7px] text-left text-[13px] font-medium outline-none transition-colors',
                        isSelected ? 'bg-orange-50 text-brand' : 'text-gray-700 hover:bg-gray-100',
                      )}
                    >
                      <span>{value === 'All' ? 'All statuses' : value}</span>
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {visibleGroups.length ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <Table className="w-full min-w-[760px] table-auto">
            <TableHeader className="[&_tr]:border-0">
              <TableRow className="border-0 bg-gray-50/70 hover:bg-gray-50/70">
                <TableHead aria-sort={ariaSortFor('name')} className="h-11 px-5">
                  <SortableGroupHead label="Employee Group" sortKey="name" currentKey={sortKey} direction={sortDirection} onSort={handleSort} />
                </TableHead>
                <TableHead aria-sort={ariaSortFor('description')} className="h-11 px-5">
                  <SortableGroupHead label="Description" sortKey="description" currentKey={sortKey} direction={sortDirection} onSort={handleSort} />
                </TableHead>
                <TableHead aria-sort={ariaSortFor('members')} className="h-11 px-5">
                  <SortableGroupHead label="Members" sortKey="members" currentKey={sortKey} direction={sortDirection} onSort={handleSort} />
                </TableHead>
                <TableHead aria-sort={ariaSortFor('status')} className="h-11 px-5">
                  <SortableGroupHead label="Status" sortKey="status" currentKey={sortKey} direction={sortDirection} onSort={handleSort} />
                </TableHead>
                <TableHead className="h-11 w-16 px-5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleGroups.map(group => {
                const members = memberMap.get(group.id) ?? [];
                return (
                  <TableRow
                    key={group.id}
                    className={cn(
                      'border-gray-100',
                      group.status === 'Inactive' && 'bg-gray-50 hover:bg-gray-50',
                    )}
                  >
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-brand">
                          <UsersRound size={15} />
                        </span>
                        <span className="text-[13.5px] font-medium text-gray-900">{group.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[300px] px-5 py-4 text-[12.5px] text-gray-500">
                      <DescriptionTooltip value={group.description} />
                    </TableCell>
                    <TableCell className="px-5 py-4"><MemberAvatars members={members} /></TableCell>
                    <TableCell className="px-5 py-4"><StatusBadge status={group.status} /></TableCell>
                    <TableCell className="px-5 py-4 text-right">
                      <GroupActionMenu
                        group={group}
                        onEdit={() => { setEditingGroup(group); setDrawerOpen(true); }}
                        onActivate={() => { setGroupStatus(group.id, 'Active'); toast.success(`${group.name} reactivated`); }}
                        onDeactivate={() => setConfirmation({ group, kind: 'deactivate' })}
                        onDelete={() => setConfirmation({ group, kind: 'delete' })}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Empty
          icon={query.trim() || filter !== 'All' ? SearchX : UsersRound}
          title={query.trim() || filter !== 'All' ? 'No employee groups found' : 'No employee groups yet'}
          description={query.trim() || filter !== 'All'
            ? 'Try adjusting your search or status filter.'
            : 'Create a group to manage cross-functional teams and group-based permissions.'}
          className="mt-6"
        />
      )}

      <GroupDrawer
        open={drawerOpen}
        group={editingGroup}
        users={users}
        groups={groups}
        onClose={closeDrawer}
        onSave={handleSave}
      />
      <GroupConfirmationDialog
        group={confirmation?.group ?? null}
        kind={confirmation?.kind ?? 'deactivate'}
        memberCount={targetMemberCount}
        onClose={() => setConfirmation(null)}
        onConfirm={confirmAction}
      />
    </div>
  );
}