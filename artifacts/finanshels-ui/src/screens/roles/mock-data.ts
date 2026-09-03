/* ─── Module / permission definitions ───────────────────────────────────── */

export interface ModuleDef {
  id: string;
  label: string;
  actions: Array<{ id: string; label: string }>;
}

export const MODULES: ModuleDef[] = [
  {
    id: 'projects',
    label: 'Projects',
    actions: [
      { id: 'view',        label: 'View'        },
      { id: 'create',      label: 'Create'      },
      { id: 'edit',        label: 'Edit'        },
      { id: 'delete',      label: 'Delete'      },
      { id: 'assign_team', label: 'Assign Team' },
      { id: 'approve',     label: 'Approve'     },
    ],
  },
  {
    id: 'tasks',
    label: 'Tasks',
    actions: [
      { id: 'view',   label: 'View'   },
      { id: 'create', label: 'Create' },
      { id: 'edit',   label: 'Edit'   },
      { id: 'delete', label: 'Delete' },
      { id: 'assign', label: 'Assign' },
    ],
  },
  {
    id: 'timesheets',
    label: 'Timesheets',
    actions: [
      { id: 'view',    label: 'View'    },
      { id: 'submit',  label: 'Submit'  },
      { id: 'approve', label: 'Approve' },
      { id: 'reject',  label: 'Reject'  },
      { id: 'manage',  label: 'Manage'  },
    ],
  },
  {
    id: 'clients',
    label: 'Clients',
    actions: [
      { id: 'view',   label: 'View'   },
      { id: 'create', label: 'Create' },
      { id: 'edit',   label: 'Edit'   },
      { id: 'delete', label: 'Delete' },
    ],
  },
  {
    id: 'organisation',
    label: 'Organisation',
    actions: [
      { id: 'view',       label: 'View'       },
      { id: 'manage',     label: 'Manage'     },
    ],
  },
  {
    id: 'users',
    label: 'User Management',
    actions: [
      { id: 'view',         label: 'View'         },
      { id: 'create',       label: 'Add User'     },
      { id: 'edit',         label: 'Edit User'    },
      { id: 'activate',     label: 'Activate User' },
      { id: 'deactivate',   label: 'Deactivate User' },
      { id: 'reset_password', label: 'Reset Password' },
      { id: 'assign_roles', label: 'Assign Role' },
      { id: 'assign_department', label: 'Assign Department' },
      { id: 'assign_verticals', label: 'Assign Verticals' },
      { id: 'assign_reporting_manager', label: 'Assign Reporting Manager' },
    ],
  },
  {
    id: 'roles',
    label: 'Role Management',
    actions: [
      { id: 'view',       label: 'View'       },
      { id: 'create',     label: 'Create'     },
      { id: 'edit',       label: 'Edit'       },
      { id: 'clone',      label: 'Clone'      },
      { id: 'deactivate', label: 'Deactivate' },
    ],
  },
  {
    id: 'audit_trail',
    label: 'Audit Trail',
    actions: [
      { id: 'view',   label: 'View'   },
      { id: 'export', label: 'Export' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    actions: [
      { id: 'view',   label: 'View'   },
      { id: 'export', label: 'Export' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    actions: [
      { id: 'view',   label: 'View'   },
      { id: 'manage', label: 'Manage' },
    ],
  },
];

/* All permissions map (module → all action ids) */
export function allPermissionsFor(moduleId: string): string[] {
  return MODULES.find(m => m.id === moduleId)?.actions.map(a => a.id) ?? [];
}

export function fullPermissions(): Record<string, string[]> {
  return Object.fromEntries(MODULES.map(m => [m.id, m.actions.map(a => a.id)]));
}

/**
 * Module access is all-or-nothing. This preserves existing access when
 * converting historical action-level maps to the module-level model.
 */
export function normalizeModulePermissions(permissions: PermissionRule[]): PermissionRule[] {
  return permissions;
}

/* ─── Role type ──────────────────────────────────────────────────────────── */

export type DataScope = 'Own' | 'Team' | 'All';

export interface ScopeException {
  id: string;
  type: 'department' | 'service' | 'account_manager';
  targetId: string;
  hierarchyApplies: boolean;
}

export interface PermissionRule {
  moduleId: string;
  actionId: string;
  enabled: boolean;
  scope: DataScope;
  exceptions: ScopeException[];
}

export type RoleType   = 'system' | 'custom';
export type RoleStatus = 'Active' | 'Inactive';

export interface AppRole {
  id: string;
  name: string;
  description: string;
  type: RoleType;
  status: RoleStatus;
  /** Super Admin: cannot be edited, cloned differently, or deactivated */
  isProtected: boolean;
  /** Base system role used by a specialized custom role. */
  baseRoleId?: string;
  /** Default record scope inherited when a specialized role is created. */
  defaultDataScope?: DataScope;
  /** Short code shown for the five standard base roles. */
  shortCode?: 'AM' | 'TL' | 'TM' | 'A' | 'SA';
  /** List of permission rules per module and action */
  permissions: PermissionRule[];
  userCount: number;
  createdAt: string;
  clonedFromId?: string;
}

export function convertLegacyPermissions(perms: Record<string, string[]>, defaultScope: DataScope = 'All'): PermissionRule[] {
  const rules: PermissionRule[] = [];
  for (const module of MODULES) {
    const grantedActions = perms[module.id] || [];
    for (const action of module.actions) {
      rules.push({
        moduleId: module.id,
        actionId: action.id,
        enabled: grantedActions.includes(action.id),
        scope: defaultScope,
        exceptions: [],
      });
    }
  }
  return rules;
}

const DATA_SCOPE_RANK: Record<DataScope, number> = {
  Own: 0,
  Team: 1,
  All: 2,
};

export function inheritBasePermissions(
  basePermissions: PermissionRule[],
  specializedPermissions: PermissionRule[],
): PermissionRule[] {
  const merged = basePermissions.map(baseRule => {
    const specializedRule = specializedPermissions.find(
      rule => rule.moduleId === baseRule.moduleId && rule.actionId === baseRule.actionId,
    );

    if (!specializedRule) {
      return {
        ...baseRule,
        exceptions: baseRule.exceptions.map(exception => ({ ...exception })),
      };
    }

    if (!baseRule.enabled) {
      return {
        ...specializedRule,
        exceptions: specializedRule.exceptions.map(exception => ({ ...exception })),
      };
    }

    return {
      ...specializedRule,
      enabled: true,
      scope: DATA_SCOPE_RANK[specializedRule.scope] >= DATA_SCOPE_RANK[baseRule.scope]
        ? specializedRule.scope
        : baseRule.scope,
      exceptions: specializedRule.exceptions.map(exception => ({ ...exception })),
    };
  });

  const baseKeys = new Set(
    basePermissions.map(rule => `${rule.moduleId}:${rule.actionId}`),
  );
  return [
    ...merged,
    ...specializedPermissions
      .filter(rule => !baseKeys.has(`${rule.moduleId}:${rule.actionId}`))
      .map(rule => ({
        ...rule,
        exceptions: rule.exceptions.map(exception => ({ ...exception })),
      })),
  ];
}


/* ─── Seed data ──────────────────────────────────────────────────────────── */

export const MOCK_ROLES: AppRole[] = [
  /* ── System roles ── */
  {
    id: 'role-super-admin',
    name: 'Super Admin',
    description: 'Full access to all modules and settings. Cannot be modified or deleted.',
    type: 'system',
    status: 'Active',
    isProtected: true,
    defaultDataScope: 'All',
    shortCode: 'SA',
    permissions: convertLegacyPermissions(fullPermissions(), 'All'),
    userCount: 1,
    createdAt: '2020-01-01',
  },
  {
    id: 'role-admin',
    name: 'Admin',
    description: 'Administrative access across most modules. Can manage users, roles, and organisation structure.',
    type: 'system',
    status: 'Active',
    isProtected: false,
    defaultDataScope: 'All',
    shortCode: 'A',
    permissions: convertLegacyPermissions({
      projects:     ['view', 'create', 'edit', 'delete', 'assign_team', 'approve'],
      tasks:        ['view', 'create', 'edit', 'delete', 'assign'],
      timesheets:   ['view', 'submit', 'approve', 'reject', 'manage'],
      clients:      ['view', 'create', 'edit', 'delete'],
      organisation: ['view', 'manage'],
      users:        [
        'view',
        'create',
        'edit',
        'activate',
        'deactivate',
        'reset_password',
        'assign_roles',
        'assign_department',
        'assign_verticals',
        'assign_reporting_manager',
      ],
      roles:        ['view', 'create', 'edit', 'clone', 'deactivate'],
      audit_trail:  ['view', 'export'],
      reports:      ['view', 'export'],
      settings:     ['view', 'manage'],
    }, 'All'),
    userCount: 2,
    createdAt: '2020-01-01',
  },
  {
    id: 'role-account-manager',
    name: 'Account Manager',
    description: 'Manages client relationships and oversees project delivery for assigned clients.',
    type: 'system',
    status: 'Active',
    isProtected: false,
    defaultDataScope: 'Team',
    shortCode: 'AM',
    permissions: convertLegacyPermissions({
      projects:     ['view', 'create', 'edit', 'assign_team', 'approve'],
      tasks:        ['view', 'create', 'edit', 'assign'],
      timesheets:   ['view', 'approve'],
      clients:      ['view', 'create', 'edit'],
      organisation: ['view'],
      users:        ['view'],
      roles:        ['view'],
      audit_trail:  ['view'],
      reports:      ['view', 'export'],
      settings:     ['view'],
    }, 'Team'),
    userCount: 3,
    createdAt: '2020-01-01',
  },
  {
    id: 'role-team-lead',
    name: 'Team Lead',
    description: 'Leads a team, manages task assignments, and approves timesheets for their team members.',
    type: 'system',
    status: 'Active',
    isProtected: false,
    defaultDataScope: 'Team',
    shortCode: 'TL',
    permissions: convertLegacyPermissions({
      projects:     ['view', 'edit', 'assign_team'],
      tasks:        ['view', 'create', 'edit', 'delete', 'assign'],
      timesheets:   ['view', 'submit', 'approve'],
      clients:      ['view'],
      organisation: ['view'],
      users:        ['view'],
      roles:        ['view'],
      audit_trail:  [],
      reports:      ['view'],
      settings:     ['view'],
    }, 'Team'),
    userCount: 4,
    createdAt: '2020-01-01',
  },
  {
    id: 'role-team-member',
    name: 'Team Member',
    description: 'Standard team member access. Can view assigned work and submit timesheets.',
    type: 'system',
    status: 'Active',
    isProtected: false,
    defaultDataScope: 'Team',
    shortCode: 'TM',
    permissions: convertLegacyPermissions({
      projects:     ['view'],
      tasks:        ['view', 'create', 'edit'],
      timesheets:   ['view', 'submit'],
      clients:      ['view'],
      organisation: ['view'],
      users:        [],
      roles:        [],
      audit_trail:  [],
      reports:      ['view'],
      settings:     ['view'],
    }, 'Team'),
    userCount: 8,
    createdAt: '2020-01-01',
  },
  /* ── Custom roles ── */
  {
    id: 'role-tax-specialist',
    name: 'Tax Specialist',
    description: 'Focused access for tax filing and compliance work. Cloned from Team Member with elevated project permissions.',
    type: 'custom',
    status: 'Active',
    isProtected: false,
    baseRoleId: 'role-team-member',
    defaultDataScope: 'Team',
    permissions: convertLegacyPermissions({
      projects:     ['view', 'edit'],
      tasks:        ['view', 'create', 'edit', 'assign'],
      timesheets:   ['view', 'submit'],
      clients:      ['view', 'edit'],
      organisation: ['view'],
      users:        [],
      roles:        [],
      audit_trail:  ['view'],
      reports:      ['view'],
      settings:     ['view'],
    }, 'Team'),
    userCount: 2,
    createdAt: '2024-03-15',
    clonedFromId: 'role-team-member',
  },
  {
    id: 'role-hr-coordinator',
    name: 'HR Coordinator',
    description: 'HR team role with access to payroll, timesheets, and user records.',
    type: 'custom',
    status: 'Active',
    isProtected: false,
    defaultDataScope: 'All',
    permissions: convertLegacyPermissions({
      projects:     ['view'],
      tasks:        ['view'],
      timesheets:   ['view', 'approve', 'manage'],
      clients:      [],
      organisation: ['view', 'manage'],
      users:        ['view', 'create', 'edit'],
      roles:        ['view'],
      audit_trail:  ['view'],
      reports:      ['view', 'export'],
      settings:     ['view'],
    }, 'All'),
    userCount: 1,
    createdAt: '2024-06-01',
  },
  {
    id: 'role-viewer',
    name: 'Read-Only Viewer',
    description: 'View-only access across all modules. No create, edit or delete capabilities.',
    type: 'custom',
    status: 'Inactive',
    isProtected: false,
    defaultDataScope: 'Team',
    permissions: convertLegacyPermissions({
      projects:     ['view'],
      tasks:        ['view'],
      timesheets:   ['view'],
      clients:      ['view'],
      organisation: ['view'],
      users:        [],
      roles:        [],
      audit_trail:  [],
      reports:      ['view'],
      settings:     ['view'],
    }, 'All'),
    userCount: 0,
    createdAt: '2024-09-20',
  },
];
