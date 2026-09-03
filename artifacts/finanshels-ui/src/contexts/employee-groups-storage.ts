import type { AppUser, EmployeeGroup } from '@/screens/users/mock-data';

function removeNonActiveMemberships(users: AppUser[]): AppUser[] {
  return users.map(user => user.status === 'Active'
    ? user
    : { ...user, employeeGroups: [] });
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

export function normalizeEmployeeGroupsStorage(value: unknown): {
  users: AppUser[];
  groups: EmployeeGroup[];
} | null {
  if (!value || typeof value !== 'object') return null;
  const stored = value as { users?: unknown; groups?: unknown };
  if (!Array.isArray(stored.users) || !Array.isArray(stored.groups)) return null;

  const users = stored.users
    .filter((user): user is AppUser => Boolean(user) && typeof user === 'object')
    .map(user => {
      const verticalIds = stringArray(user.verticalIds);
      return {
        ...user,
        roles: stringArray(user.roles).slice(0, 1),
        verticalIds: verticalIds.length > 0
          ? verticalIds
          : typeof user.verticalId === 'string'
            ? [user.verticalId]
            : [],
        employeeGroups: stringArray(user.employeeGroups),
      };
    });
  const groups = stored.groups
    .filter((group): group is EmployeeGroup => Boolean(group) && typeof group === 'object')
    .map(group => ({
      ...group,
      roles: stringArray(group.roles),
    }));

  return { users: removeNonActiveMemberships(users), groups };
}

export function replaceRoleAssignmentsInStorage(
  users: AppUser[],
  groups: EmployeeGroup[],
  sourceRoleNames: string[],
  targetRoleName: string,
): { users: AppUser[]; groups: EmployeeGroup[] } {
  const sourceNames = new Set(sourceRoleNames);
  const replaceRoles = (roleNames: string[]): string[] =>
    Array.from(new Set(roleNames.map(roleName =>
      sourceNames.has(roleName) ? targetRoleName : roleName)));

  return {
    users: users.map(user => ({ ...user, roles: replaceRoles(user.roles) })),
    groups: groups.map(group => ({ ...group, roles: replaceRoles(group.roles) })),
  };
}