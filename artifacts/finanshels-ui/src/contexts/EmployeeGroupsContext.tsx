'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  MOCK_EMPLOYEE_GROUPS,
  MOCK_USERS,
  type AppUser,
  type EmployeeGroup,
  type EmployeeGroupStatus,
  type UserStatus,
} from '@/screens/users/mock-data';

interface EmployeeGroupDraft {
  name: string;
  description: string;
  memberIds: string[];
}

interface EmployeeGroupsContextValue {
  users: AppUser[];
  groups: EmployeeGroup[];
  saveUser: (user: AppUser) => void;
  updateUserStatus: (userId: string, status: UserStatus) => void;
  saveGroup: (groupId: string | null, draft: EmployeeGroupDraft) => void;
  setGroupStatus: (groupId: string, status: EmployeeGroupStatus) => void;
  deleteGroup: (groupId: string) => void;
}

const EmployeeGroupsContext = createContext<EmployeeGroupsContextValue | null>(null);
const STORAGE_KEY = 'finanshels-employee-groups-v1';

function makeGroupId() {
  return `group-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function removeNonActiveMemberships(users: AppUser[]): AppUser[] {
  return users.map(user => user.status === 'Active'
    ? user
    : { ...user, employeeGroups: [] });
}

export function EmployeeGroupsProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<AppUser[]>(() => removeNonActiveMemberships(MOCK_USERS));
  const [groups, setGroups] = useState<EmployeeGroup[]>(MOCK_EMPLOYEE_GROUPS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as { users?: AppUser[]; groups?: EmployeeGroup[] };
        if (Array.isArray(parsed.users) && Array.isArray(parsed.groups)) {
          setUsers(removeNonActiveMemberships(parsed.users));
          setGroups(parsed.groups);
        }
      }
    } catch {
      /* Ignore malformed or unavailable browser storage. */
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ users, groups }));
    } catch {
      /* Keep the session usable when browser storage is unavailable. */
    }
  }, [groups, hydrated, users]);

  function saveUser(user: AppUser) {
    const activeNames = new Set(groups.filter(group => group.status === 'Active').map(group => group.name));
    const nextUser = {
      ...user,
      employeeGroups: user.status === 'Active'
        ? user.employeeGroups.filter(groupName => activeNames.has(groupName))
        : [],
    };
    setUsers(current => current.some(item => item.id === nextUser.id)
      ? current.map(item => item.id === nextUser.id ? nextUser : item)
      : [...current, nextUser]);
  }

  function updateUserStatus(userId: string, status: UserStatus) {
    setUsers(current => current.map(user => user.id === userId
      ? { ...user, status, employeeGroups: status === 'Active' ? user.employeeGroups : [] }
      : user));
  }

  function saveGroup(groupId: string | null, draft: EmployeeGroupDraft) {
    const name = draft.name.trim();
    const description = draft.description.trim();
    const existing = groupId ? groups.find(group => group.id === groupId) : undefined;
    const oldName = existing?.name;

    if (existing) {
      setGroups(current => current.map(group => group.id === groupId
        ? { ...group, name, description }
        : group));
    } else {
      setGroups(current => [
        ...current,
        { id: makeGroupId(), name, description, status: 'Active', createdAt: new Date().toISOString().slice(0, 10) },
      ]);
    }

    const selected = new Set(draft.memberIds);
    setUsers(current => current.map(user => {
      const withoutCurrentName = oldName
        ? user.employeeGroups.filter(groupName => groupName !== oldName && groupName !== name)
        : user.employeeGroups.filter(groupName => groupName !== name);
      return {
        ...user,
        employeeGroups: user.status === 'Active' && selected.has(user.id)
          ? [...withoutCurrentName, name]
          : withoutCurrentName,
      };
    }));
  }

  function setGroupStatus(groupId: string, status: EmployeeGroupStatus) {
    const group = groups.find(item => item.id === groupId);
    if (!group) return;
    setGroups(current => current.map(item => item.id === groupId ? { ...item, status } : item));
    if (status === 'Inactive') {
      setUsers(current => current.map(user => ({
        ...user,
        employeeGroups: user.employeeGroups.filter(groupName => groupName !== group.name),
      })));
    }
  }

  function deleteGroup(groupId: string) {
    const group = groups.find(item => item.id === groupId);
    if (!group) return;
    setGroups(current => current.filter(item => item.id !== groupId));
    setUsers(current => current.map(user => ({
      ...user,
      employeeGroups: user.employeeGroups.filter(groupName => groupName !== group.name),
    })));
  }

  return (
    <EmployeeGroupsContext.Provider value={{
      users,
      groups,
      saveUser,
      updateUserStatus,
      saveGroup,
      setGroupStatus,
      deleteGroup,
    }}>
      {children}
    </EmployeeGroupsContext.Provider>
  );
}

export function useEmployeeGroupsContext(): EmployeeGroupsContextValue {
  const context = useContext(EmployeeGroupsContext);
  if (!context) throw new Error('useEmployeeGroupsContext must be used inside <EmployeeGroupsProvider>');
  return context;
}