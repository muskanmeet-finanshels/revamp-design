import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MOCK_ROLES,
  MODULES,
  convertLegacyPermissions,
  inheritBasePermissions,
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

test('scope availability is configured per module and legacy Team values are migrated', () => {
  assert.deepEqual(
    MODULES.find(module => module.id === 'projects')?.availableScopes,
    ['Own', 'Reporting Team', 'All'],
  );
  assert.deepEqual(
    MODULES.find(module => module.id === 'users')?.availableScopes,
    ['All'],
  );
  assert.equal(normalizePermissionScope('projects', 'Team'), 'Reporting Team');
  assert.equal(normalizePermissionScope('users', 'Team'), 'All');
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

test('Admin role includes every user-management action without organisation membership checks', () => {
  const admin = MOCK_ROLES.find(role => role.id === 'role-admin');
  const enabledUserActions = admin?.permissions
    .filter(rule => rule.moduleId === 'users' && rule.enabled)
    .map(rule => rule.actionId);

  assert.deepEqual(enabledUserActions, [
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
  ]);
});