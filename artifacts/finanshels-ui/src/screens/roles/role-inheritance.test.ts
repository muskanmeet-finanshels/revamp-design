import assert from 'node:assert/strict';
import test from 'node:test';
import {
  convertLegacyPermissions,
  inheritBasePermissions,
} from './mock-data.ts';

test('specialized roles preserve base actions and can only broaden their scope', () => {
  const basePermissions = convertLegacyPermissions({
    projects: ['view'],
    users: [],
  }, 'Team');
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
  assert.equal(inheritedProjectView?.scope, 'Team');
  assert.equal(additionalUserView?.enabled, true);
  assert.equal(additionalUserView?.scope, 'All');
});