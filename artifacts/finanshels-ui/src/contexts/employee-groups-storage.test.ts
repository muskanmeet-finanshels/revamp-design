import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeEmployeeGroupsStorage,
  replaceRoleAssignmentsInStorage,
} from './employee-groups-storage.ts';

test('upgrades legacy v1 employee groups before Admin screens consume them', () => {
  const normalized = normalizeEmployeeGroupsStorage({
    users: [
      {
        id: 'active-user',
        status: 'Active',
        roles: ['Team Member', 'Admin', null],
        verticalId: 'vertical-legacy',
        employeeGroups: ['Legacy Group', 42],
      },
      {
        id: 'inactive-user',
        status: 'Inactive',
        roles: [],
        employeeGroups: ['Legacy Group'],
      },
    ],
    groups: [
      {
        id: 'legacy-group',
        name: 'Legacy Group',
        status: 'Active',
      },
    ],
  });

  assert.ok(normalized);
  assert.deepEqual(normalized.groups[0].roles, []);
  assert.deepEqual(normalized.users[0].roles, ['Team Member']);
  assert.deepEqual(normalized.users[0].verticalIds, ['vertical-legacy']);
  assert.deepEqual(normalized.users[0].employeeGroups, ['Legacy Group']);
  assert.deepEqual(normalized.users[1].employeeGroups, []);
});

test('rejects payloads without both user and group arrays', () => {
  assert.equal(normalizeEmployeeGroupsStorage({ users: [] }), null);
  assert.equal(normalizeEmployeeGroupsStorage(null), null);
});

test('renames direct, legacy, and employee-group role assignments together', () => {
  const migrated = replaceRoleAssignmentsInStorage(
    [
      {
        id: 'direct-user',
        roles: ['Tax Specialist'],
        employeeGroups: [],
      },
      {
        id: 'legacy-user',
        roles: ['Tax Consultant', 'Team Member'],
        employeeGroups: ['Tax Group'],
      },
    ] as never,
    [
      {
        id: 'tax-group',
        name: 'Tax Group',
        roles: ['Tax Specialist'],
      },
    ] as never,
    ['Tax Specialist', 'Tax Consultant'],
    'Tax Operations',
  );

  assert.deepEqual(migrated.users[0].roles, ['Tax Operations']);
  assert.deepEqual(migrated.users[1].roles, ['Tax Operations', 'Team Member']);
  assert.deepEqual(migrated.groups[0].roles, ['Tax Operations']);
});