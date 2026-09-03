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
      { id: 'create',       label: 'Create'       },
      { id: 'edit',         label: 'Edit'         },
      { id: 'deactivate',   label: 'Deactivate'   },
      { id: 'reset_password', label: 'Reset Password' },
      { id: 'assign_roles', label: 'Assign Roles' },
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
export function normalizeModulePermissions(permissions: Record<string, string[]>): Record<string, string[]> {
  return Object.fromEntries(MODULES.map(module => [
    module.id,
    (permissions[module.id] ?? []).length > 0 ? allPermissionsFor(module.id) : [],
  ]));
}

/* ─── Role type ──────────────────────────────────────────────────────────── */

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
  /** Record<moduleId, full action ids when module access is enabled> */
  permissions: Record<string, string[]>;
  userCount: number;
  createdAt: string;
  clonedFromId?: string;
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
    permissions: fullPermissions(),
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
    permissions: {
      projects:     ['view', 'create', 'edit', 'delete', 'assign_team', 'approve'],
      tasks:        ['view', 'create', 'edit', 'delete', 'assign'],
      timesheets:   ['view', 'submit', 'approve', 'reject', 'manage'],
      clients:      ['view', 'create', 'edit', 'delete'],
      organisation: ['view', 'manage'],
      users:        ['view', 'create', 'edit', 'deactivate', 'reset_password', 'assign_roles'],
      roles:        ['view', 'create', 'edit', 'clone', 'deactivate'],
      audit_trail:  ['view', 'export'],
      reports:      ['view', 'export'],
      settings:     ['view', 'manage'],
    },
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
    permissions: {
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
    },
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
    permissions: {
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
    },
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
    permissions: {
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
    },
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
    permissions: {
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
    },
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
    permissions: {
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
    },
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
    permissions: {
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
    },
    userCount: 0,
    createdAt: '2024-09-20',
  },
];
