'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  MOCK_ROLES,
  MODULES,
  findCompatiblePermissionRule,
  inheritBasePermissions,
  normalizeDataScope,
  normalizePermissionScope,
  type AppRole,
  type PermissionRule,
  type RoleStatus,
} from '@/screens/roles/mock-data';

interface AccessControlContextValue {
  roles: AppRole[];
  saveRole: (role: AppRole) => void;
  updateRolePermissions: (roleId: string, permissions: PermissionRule[]) => void;
  setRoleStatus: (roleId: string, status: RoleStatus) => void;
}

const AccessControlContext = createContext<AccessControlContextValue | null>(null);
const STORAGE_KEY = 'finanshels-roles-v1';

function normalizePersistedRoles(parsed: AppRole[]): AppRole[] {
  const baseRoleIds = new Set(
    MOCK_ROLES.filter(role => role.type === 'system').map(role => role.id),
  );

  const normalized = parsed.map(role => {
    const seededRole = MOCK_ROLES.find(seed => seed.id === role.id);
    const inheritedBaseRoleId = role.baseRoleId
      ?? seededRole?.baseRoleId
      ?? (role.clonedFromId && baseRoleIds.has(role.clonedFromId) ? role.clonedFromId : undefined);
    const baseRole = inheritedBaseRoleId
      ? MOCK_ROLES.find(seed => seed.id === inheritedBaseRoleId)
      : undefined;
    const defaultDataScope = normalizeDataScope(role.defaultDataScope
      ?? seededRole?.defaultDataScope
      ?? baseRole?.defaultDataScope
      ?? role.permissions.find(permission => permission.enabled)?.scope
      ?? 'All');
    const permissions = MODULES.flatMap(module => module.actions.map(action => {
      const persistedRule = findCompatiblePermissionRule(role.permissions, module.id, action.id);
      const seededRule = seededRole
        ? findCompatiblePermissionRule(seededRole.permissions, module.id, action.id)
        : undefined;
      const sourceRule = persistedRule ?? seededRule;
      if (!sourceRule) {
        return {
          moduleId: module.id,
          actionId: action.id,
          enabled: false,
          scope: normalizePermissionScope(module.id, defaultDataScope),
          exceptions: [],
        };
      }
      return {
        ...sourceRule,
        scope: normalizePermissionScope(module.id, sourceRule.scope, defaultDataScope),
        exceptions: sourceRule.exceptions ?? [],
      };
    }));

    return {
      ...role,
      baseRoleId: inheritedBaseRoleId,
      defaultDataScope,
      permissions,
    };
  });

  return normalized.map(role => {
    if (!role.baseRoleId) return role;
    const baseRole = normalized.find(candidate => candidate.id === role.baseRoleId)
      ?? MOCK_ROLES.find(candidate => candidate.id === role.baseRoleId);
    if (!baseRole) return role;
    return {
      ...role,
      permissions: inheritBasePermissions(baseRole.permissions, role.permissions),
    };
  });
}

export function AccessControlProvider({ children }: { children: ReactNode }) {
  const [roles, setRoles] = useState<AppRole[]>(MOCK_ROLES);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AppRole[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge with MOCK_ROLES to ensure we have any new system roles, but prefer stored data.
          // For simplicity and to allow full local overrides, we'll just use parsed directly if valid.
          setRoles(normalizePersistedRoles(parsed));
        }
      }
    } catch {
      // fallback
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(roles));
    } catch {
      // ignore
    }
  }, [roles, hydrated]);

  function saveRole(role: AppRole) {
    setRoles(current => {
      const exists = current.some(r => r.id === role.id);
      if (exists) return current.map(r => r.id === role.id ? role : r);
      return [...current, role];
    });
  }

  function updateRolePermissions(roleId: string, permissions: PermissionRule[]) {
    const normalizedPermissions = permissions.map(rule => ({
      ...rule,
      scope: normalizePermissionScope(rule.moduleId, rule.scope),
      exceptions: rule.exceptions ?? [],
    }));
    setRoles(current => current.map(r => r.id === roleId ? { ...r, permissions: normalizedPermissions } : r));
  }

  function setRoleStatus(roleId: string, status: RoleStatus) {
    setRoles(current => current.map(r => r.id === roleId ? { ...r, status } : r));
  }

  return (
    <AccessControlContext.Provider value={{ roles, saveRole, updateRolePermissions, setRoleStatus }}>
      {children}
    </AccessControlContext.Provider>
  );
}

export function useAccessControlContext() {
  const ctx = useContext(AccessControlContext);
  if (!ctx) throw new Error('useAccessControlContext must be used within <AccessControlProvider>');
  return ctx;
}

// Maps old static mock role names to the new AppRole names so seeded users don't lose access
export const LEGACY_ROLE_MAP: Record<string, string> = {
  'Finance Manager': 'Admin',
  'Senior Accountant': 'Team Lead',
  'Accountant': 'Team Member',
  'Tax Consultant': 'Tax Specialist',
  'Senior Auditor': 'Team Lead',
  'Auditor': 'Team Member',
  'HR Specialist': 'HR Coordinator',
  'IT Support': 'Team Member',
  'Compliance Officer': 'Admin',
  'Viewer': 'Read-Only Viewer',
};

export function storedAssignmentNamesForRole(roleName: string): string[] {
  return [
    roleName,
    ...Object.entries(LEGACY_ROLE_MAP)
      .filter(([, resolvedName]) => resolvedName === roleName)
      .map(([storedName]) => storedName),
  ];
}

export function resolveEffectiveRoleNames(assignedRoleNames: string[]): string[] {
  return assignedRoleNames.map(name => LEGACY_ROLE_MAP[name] || name);
}
