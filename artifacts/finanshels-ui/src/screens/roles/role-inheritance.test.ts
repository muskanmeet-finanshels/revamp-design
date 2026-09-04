import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MOCK_ROLES,
  MODULES,
  convertLegacyPermissions,
  inheritBasePermissions,
  isRoleOnlyPermissionModule,
  normalizeModulePermissions,
  normalizePermissionScope,
  resolveRolePermissions,
} from './mock-data.ts';

test('specialized roles preserve base actions and can only broaden their scope', () => {
  const basePermissions = convertLegacyPermissions({
    projects: ['view'],
    users: [],
  }, 'Reporting Team');
  const specializedPermissions = convertLegacyPermissions({
    projects: [],
    users: ['view'],
  }, 'Own').map(rule => (
    rule.moduleId === 'users' && rule.actionId === 'view'
      ? { ...rule, scope: 'All' as const }
      : rule
  ));

  const merged = inheritBasePermissions(basePermissions, specializedPermissions);
  const inheritedProjectView = merged.find(
    rule => rule.moduleId === 'projects' && rule.actionId === 'view',
  );
  const additionalUserView = merged.find(
    rule => rule.moduleId === 'users' && rule.actionId === 'view',
  );

  assert.equal(inheritedProjectView?.enabled, true);
  assert.equal(inheritedProjectView?.scope, 'Reporting Team');
  assert.equal(additionalUserView?.enabled, true);
  assert.equal(additionalUserView?.scope, 'All');
});

test('all required data scopes are available and legacy Team values are migrated', () => {
  const requiredScopes = ['Own', 'Reporting Team', 'All'];
  assert.deepEqual(
    MODULES.find(module => module.id === 'projects')?.availableScopes,
    requiredScopes,
  );
  assert.deepEqual(
    MODULES.find(module => module.id === 'users')?.availableScopes,
    ['All'],
  );
  assert.equal(normalizePermissionScope('projects', 'Team'), 'Reporting Team');
  assert.equal(normalizePermissionScope('users', 'Team'), 'All');
});

test('role-only modules always use All access and discard ownership exceptions', () => {
  const roleOnlyModuleIds = [
    'project_task_configuration',
    'users',
    'services',
    'content_management',
    'settings',
    'system_settings',
  ];
  assert.deepEqual(
    roleOnlyModuleIds.map(moduleId => isRoleOnlyPermissionModule(moduleId)),
    roleOnlyModuleIds.map(() => true),
  );
  assert.equal(isRoleOnlyPermissionModule('projects'), false);

  const [roleOnlyRule, recordRule] = normalizeModulePermissions([
    {
      moduleId: 'content_management',
      actionId: 'view',
      enabled: true,
      scope: 'Own',
      exceptions: [{
        id: 'invalid-role-only-exception',
        type: 'department',
        targetId: 'department-1',
        hierarchyApplies: false,
      }],
    },
    {
      moduleId: 'projects',
      actionId: 'view',
      enabled: true,
      scope: 'All',
      exceptions: [{
        id: 'valid-record-exception',
        type: 'department',
        targetId: 'department-1',
        hierarchyApplies: false,
      }],
    },
  ]);

  assert.equal(roleOnlyRule.scope, 'All');
  assert.deepEqual(roleOnlyRule.exceptions, []);
  assert.equal(recordRule.scope, 'All');
  assert.equal(recordRule.exceptions.length, 1);
});

test('specialized roles cannot narrow inherited access with new exceptions', () => {
  const basePermissions = convertLegacyPermissions({ projects: ['view'] }, 'All');
  const specializedPermissions = convertLegacyPermissions({ projects: ['view'] }, 'All').map(rule => (
    rule.moduleId === 'projects' && rule.actionId === 'view'
      ? {
          ...rule,
          exceptions: [{
            id: 'specialized-only-exception',
            type: 'department' as const,
            targetId: 'department-1',
            hierarchyApplies: false,
          }],
        }
      : rule
  ));

  const inheritedView = inheritBasePermissions(basePermissions, specializedPermissions).find(
    rule => rule.moduleId === 'projects' && rule.actionId === 'view',
  );
  assert.deepEqual(inheritedView?.exceptions, []);
});

test('effective specialized permissions resolve against the current base role', () => {
  const baseRole = MOCK_ROLES.find(role => role.id === 'role-team-member')!;
  const specializedRole = MOCK_ROLES.find(role => role.id === 'role-tax-specialist')!;
  const updatedBaseRole = {
    ...baseRole,
    permissions: baseRole.permissions.map(rule => (
      rule.moduleId === 'projects' && rule.actionId === 'delete'
        ? { ...rule, enabled: true }
        : rule
    )),
  };

  const resolvedDelete = resolveRolePermissions(
    specializedRole,
    [updatedBaseRole, specializedRole],
  ).find(rule => rule.moduleId === 'projects' && rule.actionId === 'delete');

  assert.equal(resolvedDelete?.enabled, true);
  assert.equal(resolvedDelete?.scope, 'Reporting Team');
});

test('permission modules expose the required actions', () => {
  const requiredModules = {
    dashboard: ['view'],
    onboarding: ['view', 'create', 'edit', 'delete', 'assign_service', 'manage_requests'],
    onboarding_forms: ['view', 'edit', 'delete'],
    project_task_configuration: ['view', 'create', 'edit', 'delete'],
    clients: ['view', 'create', 'edit', 'delete', 'send_invitation', 'reset_password'],
    projects: ['view', 'create', 'edit', 'delete', 'reassign', 'collaborate', 'extend_deadlines'],
    timesheets: ['view', 'create', 'edit', 'delete', 'submit', 'approve', 'reject', 'comment'],
    reports: ['view', 'upload', 'download', 'delete', 'export', 'import'],
    audit_trail: ['view', 'download'],
    users: ['view', 'create', 'edit', 'delete', 'manage_roles'],
    services: ['view', 'create', 'edit', 'delete'],
    content_management: ['view', 'create', 'edit', 'delete'],
    settings: ['view', 'edit'],
    system_settings: ['view', 'edit'],
  };

  assert.deepEqual(
    Object.fromEntries(MODULES.map(module => [module.id, module.actions.map(action => action.id)])),
    requiredModules,
  );
});

test('permission module catalog matches the required user-facing definitions', () => {
  const requiredCatalog = [
    { label: 'Dashboard', actions: ['View'] },
    { label: 'Onboarding', actions: ['View', 'Create', 'Edit', 'Delete', 'Assign Service', 'Manage Requests'] },
    { label: 'Onboarding Forms', actions: ['View', 'Edit', 'Delete'] },
    { label: 'Project and Task Configuration', actions: ['View', 'Create', 'Edit', 'Delete'] },
    { label: 'Clients', actions: ['View', 'Create', 'Edit', 'Delete', 'Send Invitation', 'Reset Password'] },
    { label: 'Projects & Tasks', actions: ['View', 'Create', 'Edit', 'Delete', 'Reassign', 'Collaborate', 'Extend Deadlines'] },
    { label: 'Timesheets', actions: ['View', 'Create', 'Edit', 'Delete', 'Submit', 'Approve', 'Reject', 'Comment'] },
    { label: 'Documents & Reports', actions: ['View', 'Upload', 'Download', 'Delete', 'Export', 'Import'] },
    { label: 'Audit Trail', actions: ['View', 'Download'] },
    { label: 'Users & Roles', actions: ['View', 'Create', 'Edit', 'Delete', 'Manage Roles'] },
    { label: 'Services', actions: ['View', 'Create', 'Edit', 'Delete'] },
    { label: 'Content Management', actions: ['View', 'Create', 'Edit', 'Delete'] },
    { label: 'Compliance Settings', actions: ['View', 'Edit'] },
    { label: 'System Settings', actions: ['View', 'Edit'] },
  ];

  assert.deepEqual(
    MODULES.map(module => ({
      label: module.label,
      actions: module.actions.map(action => action.label),
    })),
    requiredCatalog,
  );
});

test('Admin role includes every required Users & Roles action', () => {
  const admin = MOCK_ROLES.find(role => role.id === 'role-admin');
  const enabledUserActions = admin?.permissions
    .filter(rule => rule.moduleId === 'users' && rule.enabled)
    .map(rule => rule.actionId);

  assert.deepEqual(enabledUserActions, [
    'view',
    'create',
    'edit',
    'delete',
    'manage_roles',
  ]);
});