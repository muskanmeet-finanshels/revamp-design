'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  MOCK_EMPLOYEE_GROUPS,
  MOCK_USERS,
  type AppUser,
  type EmployeeGroup,
  type EmployeeGroupStatus,
  type UserRole,
  type UserStatus,
} from '@/screens/users/mock-data';
import {
  resolveEffectiveRoleNames,
  storedAssignmentNamesForRole,
} from '@/contexts/AccessControlContext';
import {
  normalizeEmployeeGroupsStorage,
  replaceRoleAssignmentsInStorage,
} from '@/contexts/employee-groups-storage';

interface EmployeeGroupDraft {
  name: string;
  description: string;
  roles: UserRole[];
  memberIds: string[];
}

interface EmployeeGroupsContextValue {
  users: AppUser[];
  groups: EmployeeGroup[];
  saveUser: (user: AppUser) => void;
  updateUserStatus: (userId: string, status: UserStatus) => void;
  saveGroup: (groupId: string | null, draft: EmployeeGroupDraft) => void;
  replaceRoleAssignments: (sourceRoleName: string, targetRoleName: string) => void;
  setGroupStatus: (groupId: string, status: EmployeeGroupStatus) => void;
  deleteGroup: (groupId: string) => void;
}

const EmployeeGroupsContext = createContext<EmployeeGroupsContextValue | null>(null);
const STORAGE_KEY = 'finanshels-employee-groups-v1';

function makeGroupId() {
  return `group-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function enforceSingleDirectRole(user: AppUser): AppUser {
  const role = resolveEffectiveRoleNames(user.roles)[0] ?? 'Team Member';
  return { ...user, roles: [role] };
}

export function EmployeeGroupsProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<AppUser[]>(() => {
    const normalized = normalizeEmployeeGroupsStorage({ users: MOCK_USERS, groups: MOCK_EMPLOYEE_GROUPS });
    return (normalized?.users ?? MOCK_USERS).map(enforceSingleDirectRole);
  });
  const [groups, setGroups] = useState<EmployeeGroup[]>(MOCK_EMPLOYEE_GROUPS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const normalized = normalizeEmployeeGroupsStorage(JSON.parse(stored));
        if (normalized) {
          setUsers(normalized.users.map(enforceSingleDirectRole));
          setGroups(normalized.groups);
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
    const nextUser = enforceSingleDirectRole({
      ...user,
      employeeGroups: user.status === 'Active'
        ? user.employeeGroups.filter(groupName => activeNames.has(groupName))
        : [],
    });
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
        ? { ...group, name, description, roles: draft.roles }
        : group));
    } else {
      setGroups(current => [
        ...current,
        { id: makeGroupId(), name, description, roles: draft.roles, status: 'Active', createdAt: new Date().toISOString().slice(0, 10) },
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

  function replaceRoleAssignments(sourceRoleName: string, targetRoleName: string) {
    const storedNames = storedAssignmentNamesForRole(sourceRoleName);
    setUsers(current =>
      replaceRoleAssignmentsInStorage(current, [], storedNames, targetRoleName).users);
    setGroups(current =>
      replaceRoleAssignmentsInStorage([], current, storedNames, targetRoleName).groups);
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
      replaceRoleAssignments,
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