'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronDown, Lock, Pencil, SearchX, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  isRoleOnlyPermissionModule,
  MODULES,
  resolveRolePermissions,
  type AppRole,
  type PermissionRule,
  type DataScope,
  type ScopeException,
} from '@/screens/roles/mock-data';
import { useAccessControlContext } from '@/contexts/AccessControlContext';
import { useEmployeeGroupsContext } from '@/contexts/EmployeeGroupsContext';
import { useOrgContext } from '@/contexts/OrgContext';
import { SearchInput } from '@/components/ui/search-input';
import { Empty } from '@/components/ui/empty';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as DialogPrimitive from '@radix-ui/react-dialog';

/* ── Helpers ── */

function countGrantedModules(permissions: PermissionRule[]) {
  return new Set(permissions.filter(p => p.enabled).map(p => p.moduleId)).size;
}

function cloneRules(rules: PermissionRule[]): PermissionRule[] {
  return rules.map(r => ({
    ...r,
    exceptions: r.exceptions ? r.exceptions.map(e => ({ ...e })) : [],
  }));
}

const SCOPE_RANK: Record<DataScope, number> = {
  Own: 0,
  'Reporting Team': 1,
  All: 2,
};

function scopeLabel(scope: DataScope) {
  if (scope === 'Own') return 'Own records';
  if (scope === 'Reporting Team') return 'Reporting hierarchy';
  if (scope === 'All') return 'All records';
  return scope;
}

function scopeDescription(scope: DataScope) {
  if (scope === 'Own') return 'Assigned to this role';
  if (scope === 'Reporting Team') return 'Their reporting hierarchy';
  if (scope === 'All') return 'Every record in this module';
  return '';
}

/* ── Exception Dialog ── */

function ExceptionDialog({ open, onClose, onAdd, title }: {
  open: boolean;
  onClose: () => void;
  onAdd: (exception: Omit<ScopeException, 'id'>) => void;
  title: string;
}) {
  const { users } = useEmployeeGroupsContext();
  const { departments, verticals, teams } = useOrgContext();
  const [type, setType] = useState<ScopeException['type']>('department');
  const [targetId, setTargetId] = useState('');
  const [hierarchyApplies, setHierarchyApplies] = useState(false);

  useEffect(() => {
    if (open) {
      setType('department');
      setTargetId('');
      setHierarchyApplies(false);
    }
  }, [open]);

  const isValid = Boolean(targetId);

  const targetOptions = type === 'department'
    ? departments.filter(d => d.status === 'Active').map(d => ({ value: d.id, label: d.name }))
    : type === 'service'
      ? verticals.filter(v => v.status === 'Active').map(v => ({ value: v.id, label: v.name }))
      : type === 'team'
        ? teams.filter(team => team.status === 'Active').map(team => ({ value: team.id, label: team.name }))
        : users
            .filter(user => user.status === 'Active')
            .map(user => ({ value: user.id, label: `${user.firstName} ${user.lastName}` }));

  return (
    <DialogPrimitive.Root open={open} onOpenChange={open => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed inset-0 z-50 m-auto h-fit w-[calc(100vw-3rem)] max-w-[420px] rounded-2xl bg-white p-6 shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <DialogPrimitive.Title className="text-[16px] font-semibold text-gray-900">
            Add access filter for {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-2 text-[13px] text-gray-500 mb-5">
            Narrow this action's record access by department, account manager, service, or team. Reporting hierarchy remains a separate access scope.
          </DialogPrimitive.Description>

          <div className="space-y-4">
            <div>
              <label className="text-[12px] font-medium text-gray-700 mb-1 block">Filter type</label>
              <Select value={type} onValueChange={(v: any) => { setType(v); setTargetId(''); }}>
                <SelectTrigger className="h-9 w-full rounded-lg border border-gray-200 text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="department">Department</SelectItem>
                  <SelectItem value="service">Service (Vertical)</SelectItem>
                  <SelectItem value="account_manager">Account Manager</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[12px] font-medium text-gray-700 mb-1 block">Filter target</label>
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger className="h-9 w-full rounded-lg border border-gray-200 text-[13px]">
                  <SelectValue placeholder="Select target..." />
                </SelectTrigger>
                <SelectContent>
                  {targetOptions.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mt-2 flex items-center gap-2">
              <Checkbox
                id="hierarchy-applies"
                checked={hierarchyApplies}
                onCheckedChange={checked => setHierarchyApplies(checked === true)}
                className="h-[14px] w-[14px] rounded-[3px] border-gray-300 shadow-none data-[state=checked]:border-brand data-[state=checked]:bg-brand"
              />
              <label htmlFor="hierarchy-applies" className="cursor-pointer text-[13px] text-gray-700">
                Reporting hierarchy still applies
              </label>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-[13px] font-medium hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={() => { onAdd({ type, targetId, hierarchyApplies }); onClose(); }}
              disabled={!isValid}
              className="px-4 py-2 rounded-lg bg-brand text-white text-[13px] font-medium hover:bg-brand-hover disabled:opacity-50"
            >
              Add filter
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function RolePermissionTable({
  role,
  roles,
  filteredModules,
  editing,
  onEdit,
  onCancel,
  onSaved,
}: {
  role: AppRole;
  roles: AppRole[];
  filteredModules: typeof MODULES;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { updateRolePermissions } = useAccessControlContext();
  const { users } = useEmployeeGroupsContext();
  const { departments, verticals, teams } = useOrgContext();
  const baseRole = useMemo(
    () => role.baseRoleId
      ? roles.find(candidate => candidate.id === role.baseRoleId)
      : undefined,
    [roles, role.baseRoleId],
  );
  const basePermissions = useMemo(
    () => baseRole ? resolveRolePermissions(baseRole, roles) : [],
    [baseRole, roles],
  );
  const persistedPermissions = useMemo(
    () => cloneRules(resolveRolePermissions(role, roles)),
    [role, roles],
  );

  const [permissions, setPermissions] = useState<PermissionRule[]>(persistedPermissions);

  const [exceptionDialogTarget, setExceptionDialogTarget] = useState<{
    moduleId: string;
    actionId: string;
    title: string;
  } | null>(null);
  const [expandedScopeModules, setExpandedScopeModules] = useState<Set<string>>(new Set());
  const matrixActions = useMemo(() => {
    const seen = new Set<string>();
    return filteredModules.flatMap(module => module.actions.filter(action => {
      if (seen.has(action.id)) return false;
      seen.add(action.id);
      return true;
    }));
  }, [filteredModules]);

  useEffect(() => {
    setPermissions(persistedPermissions);
  }, [persistedPermissions]);

  const granted = countGrantedModules(permissions);
  const total = MODULES.length;
  const coverage = Math.round((granted / total) * 100);
  const readOnly = role.isProtected || !editing;
  const hasChanges = JSON.stringify(permissions) !== JSON.stringify(persistedPermissions);

  function updateRule(moduleId: string, actionId: string, updates: Partial<PermissionRule>) {
    if (readOnly) return;
    setPermissions(current => {
      const idx = current.findIndex(r => r.moduleId === moduleId && r.actionId === actionId);
      if (idx === -1) {
        const defaultScope = MODULES.find(module => module.id === moduleId)?.availableScopes[0] ?? 'All';
        return [...current, { moduleId, actionId, enabled: false, scope: defaultScope, exceptions: [], ...updates }];
      }
      const newRules = [...current];
      newRules[idx] = { ...newRules[idx], ...updates };
      return newRules;
    });
  }

  function toggleAction(moduleId: string, actionId: string, currentEnabled: boolean) {
    const inheritedRule = basePermissions.find(
      rule => rule.moduleId === moduleId && rule.actionId === actionId,
    );
    if (inheritedRule?.enabled && currentEnabled) return;
    updateRule(moduleId, actionId, { enabled: !currentEnabled });
  }

  function setScope(moduleId: string, actionId: string, scope: DataScope) {
    const module = MODULES.find(item => item.id === moduleId);
    if (!module?.availableScopes.includes(scope)) return;
    const inheritedRule = basePermissions.find(
      rule => rule.moduleId === moduleId && rule.actionId === actionId,
    );
    if (inheritedRule?.enabled && SCOPE_RANK[scope] < SCOPE_RANK[inheritedRule.scope]) return;
    updateRule(moduleId, actionId, { scope, exceptions: [] });
  }

  function addException(moduleId: string, actionId: string, exceptionData: Omit<ScopeException, 'id'>) {
    if (isRoleOnlyPermissionModule(moduleId)) return;
    const inheritedRule = basePermissions.find(
      rule => rule.moduleId === moduleId && rule.actionId === actionId,
    );
    if (inheritedRule?.enabled) return;
    setPermissions(current => {
      const idx = current.findIndex(r => r.moduleId === moduleId && r.actionId === actionId);
      if (idx === -1) return current;
      const newRules = [...current];
      const ex = { ...exceptionData, id: `ex-${Date.now()}` };
      newRules[idx] = { ...newRules[idx], exceptions: [...(newRules[idx].exceptions || []), ex] };
      return newRules;
    });
  }

  function removeException(moduleId: string, actionId: string, exceptionId: string) {
    if (readOnly) return;
    setPermissions(current => {
      const idx = current.findIndex(r => r.moduleId === moduleId && r.actionId === actionId);
      if (idx === -1) return current;
      const newRules = [...current];
      newRules[idx] = { ...newRules[idx], exceptions: (newRules[idx].exceptions || []).filter(e => e.id !== exceptionId) };
      return newRules;
    });
  }

  function getRule(moduleId: string, actionId: string) {
    return permissions.find(r => r.moduleId === moduleId && r.actionId === actionId)
      || {
        moduleId,
        actionId,
        enabled: false,
        scope: MODULES.find(module => module.id === moduleId)?.availableScopes[0] ?? 'All',
        exceptions: [],
      };
  }

  function toggleScopeModule(moduleId: string) {
    setExpandedScopeModules(current => {
      const next = new Set(current);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  }

  function savePermissions() {
    updateRolePermissions(role.id, permissions);
    toast.success(`Permissions updated for ${role.name}`);
    onSaved();
  }

  function cancelEditing() {
    setPermissions(persistedPermissions);
    setExpandedScopeModules(new Set());
    setExceptionDialogTarget(null);
    onCancel();
  }

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-3 px-1 pb-3 pt-1">
        <div>
          <p className="text-[13px] font-semibold text-gray-900">Permission matrix</p>
          <p className="mt-0.5 text-[11px] text-gray-500">{granted} of {total} modules enabled</p>
        </div>
        {editing ? (
          <div className="flex flex-shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={cancelEditing}
              className="inline-flex h-8 items-center justify-center rounded-lg border border-gray-200 px-3 text-[12px] font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={savePermissions}
              disabled={!hasChanges}
              className="inline-flex h-8 items-center justify-center rounded-lg bg-brand px-3 text-[12px] font-semibold text-white transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save Changes
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onEdit}
            disabled={role.isProtected}
            title={role.isProtected ? 'Protected roles cannot be edited' : 'Edit permissions'}
            className="inline-flex h-8 flex-shrink-0 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 text-[12px] font-semibold text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Pencil size={13} aria-hidden="true" />
            Edit
          </button>
        )}
      </div>

      {filteredModules.length === 0 ? (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm">
          <Empty
            icon={SearchX}
            title="No matching modules"
            description="Try adjusting your search or filters to find what you’re looking for."
            className="py-16"
          />
        </div>
      ) : (
        <div className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain">
              <table
                className="w-full min-w-[1760px] table-auto"
              >
                <colgroup>
                  <col className="w-[250px]" />
                  {matrixActions.map(action => <col key={action.id} className="w-[76px]" />)}
                </colgroup>
                <thead className="whitespace-nowrap">
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="sticky left-0 z-10 h-10 bg-gray-50 px-4 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-700 shadow-[1px_0_0_#e5e7eb]">
                      Module
                    </th>
                {matrixActions.map(action => (
                  <th key={action.id} className="h-10 bg-gray-50 px-2 text-center text-[9.5px] font-semibold uppercase tracking-wide text-gray-600">
                    {action.label}
                  </th>
                ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredModules.map(module => {
                  const enabledRules = module.actions
                    .map(action => ({ action, rule: getRule(module.id, action.id) }))
                    .filter(item => item.rule.enabled);
                  const roleOnlyAccess = isRoleOnlyPermissionModule(module.id);
                  const enabledScopes = new Set(enabledRules.map(item => item.rule.scope));
                  const scopeSummary = enabledRules.length === 0
                    ? 'No permissions enabled'
                    : roleOnlyAccess
                      ? `${enabledRules.length} of ${module.actions.length} · Role-based access`
                      : enabledScopes.size === 1
                      ? `${enabledRules.length} of ${module.actions.length} · ${scopeLabel(enabledRules[0].rule.scope)}`
                      : `${enabledRules.length} of ${module.actions.length} · Mixed scopes`;
                  const scopeExpanded = !roleOnlyAccess && expandedScopeModules.has(module.id);

                  return (
                    <Fragment key={module.id}>
                      <tr className="group border-b border-gray-100 transition-colors hover:bg-gray-50/70">
                      <td className="sticky left-0 z-[5] min-w-0 bg-white p-0 align-middle shadow-[1px_0_0_#f3f4f6] transition-colors group-hover:bg-gray-50">
                        {roleOnlyAccess ? (
                          <div className="flex min-h-[52px] w-full min-w-0 items-center gap-2.5 px-4 py-2.5">
                            <span className="h-[14px] w-[14px] flex-shrink-0" aria-hidden="true" />
                            <span className="min-w-0">
                              <span className="block truncate text-[13px] font-semibold leading-snug text-gray-900">{module.label}</span>
                              <span className="mt-0.5 block truncate text-[10px] text-gray-400">{scopeSummary}</span>
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleScopeModule(module.id)}
                            aria-expanded={scopeExpanded}
                            aria-controls={`module-permissions-${module.id}`}
                            className="flex min-h-[52px] w-full min-w-0 items-center gap-2.5 px-4 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
                          >
                            <ChevronDown
                              size={14}
                              className={cn('flex-shrink-0 text-gray-400 transition-transform', !scopeExpanded && '-rotate-90')}
                            />
                            <span className="min-w-0">
                              <span className="block truncate text-[13px] font-semibold leading-snug text-gray-900">{module.label}</span>
                              <span className="mt-0.5 block truncate text-[10px] text-gray-400">{scopeSummary}</span>
                            </span>
                          </button>
                        )}
                      </td>

                      {matrixActions.map(action => {
                        const supportedAction = module.actions.find(candidate => candidate.id === action.id);
                        if (!supportedAction) {
                          return (
                            <td key={action.id} className="h-[52px] px-2 py-3 text-center align-middle">
                              <span className="text-gray-200">—</span>
                            </td>
                          );
                        }

                        const rule = getRule(module.id, action.id);
                        const inheritedRule = basePermissions.find(
                          permission => permission.moduleId === module.id && permission.actionId === action.id,
                        );
                        const isInherited = Boolean(inheritedRule?.enabled);

                        return (
                          <td key={action.id} className="h-[52px] px-2 py-3 text-center align-middle">
                            <Checkbox
                              checked={rule.enabled}
                              onCheckedChange={() => toggleAction(module.id, action.id, rule.enabled)}
                              disabled={readOnly || isInherited}
                              title={isInherited ? `Inherited from ${baseRole?.name}` : `${supportedAction.label} ${module.label}`}
                              aria-label={`${supportedAction.label} permission for ${module.label}`}
                              className={cn(
                                'mx-auto h-[14px] w-[14px] rounded-[3px] border-gray-300 shadow-none data-[state=checked]:border-brand data-[state=checked]:bg-brand',
                                readOnly || isInherited ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                              )}
                            />
                          </td>
                        );
                      })}
                      </tr>
                      {scopeExpanded && (
                        <tr id={`module-permissions-${module.id}`} className="border-b border-gray-100">
                          <td
                            colSpan={matrixActions.length + 1}
                            className="bg-gray-50 px-4 py-4"
                          >
                          {enabledRules.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-3">
                              <p className="text-[12px] font-medium text-gray-700">No data scope to configure yet</p>
                              <p className="mt-0.5 text-[11px] text-gray-500">Enable an action above to choose which records it can access.</p>
                            </div>
                          ) : (
                            <div>
                              <div className="mb-3">
                                <p className="text-[12px] font-semibold text-gray-800">Data access by action</p>
                                <p className="mt-0.5 text-[11px] text-gray-500">
                                  Choose which records each enabled action can access.
                                </p>
                              </div>
                              <div className="grid gap-3 md:grid-cols-2">
                              {enabledRules.map(({ action, rule }) => {
                                const inheritedRule = basePermissions.find(
                                  permission => permission.moduleId === module.id && permission.actionId === action.id,
                                );
                                const isInherited = Boolean(inheritedRule?.enabled);

                                return (
                                  <fieldset key={action.id} className="min-w-0 rounded-lg border border-gray-200 bg-white p-3">
                                    <legend className="sr-only">{action.label} data access</legend>
                                    <div className="mb-2.5 flex items-start justify-between gap-2">
                                      <div>
                                        <p className="text-[12px] font-semibold text-gray-900">{action.label}</p>
                                        <p className="mt-0.5 text-[10px] text-gray-500">
                                          {isInherited ? `Inherited from ${baseRole?.name}` : 'Select one data scope'}
                                        </p>
                                      </div>
                                      {isInherited && (
                                        <span className="flex-shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-medium text-blue-700">
                                          Inherited
                                        </span>
                                      )}
                                    </div>
                                    <div
                                      role="group"
                                      aria-label={`Data scope for ${module.label} ${action.label}`}
                                      className="grid grid-cols-1 gap-1.5 sm:grid-cols-3"
                                    >
                                      {module.availableScopes.map(scope => {
                                        const belowInheritedScope = Boolean(
                                          inheritedRule?.enabled
                                          && SCOPE_RANK[scope] < SCOPE_RANK[inheritedRule.scope],
                                        );
                                        return (
                                          <button
                                            key={scope}
                                            type="button"
                                            onClick={() => setScope(module.id, action.id, scope)}
                                            disabled={readOnly || belowInheritedScope}
                                            aria-pressed={rule.scope === scope}
                                            title={belowInheritedScope
                                              ? `Cannot be narrower than ${scopeLabel(inheritedRule?.scope ?? 'All')}`
                                              : scopeDescription(scope)}
                                            className={cn(
                                              'min-h-[52px] rounded-md border px-2 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                                              rule.scope === scope
                                                ? 'border-brand/40 bg-orange-50 text-brand'
                                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                                              belowInheritedScope && 'cursor-not-allowed opacity-45',
                                              readOnly && !belowInheritedScope && 'cursor-not-allowed',
                                            )}
                                          >
                                            <span className="block text-[10.5px] font-semibold">{scopeLabel(scope)}</span>
                                            <span className="mt-0.5 block text-[9px] leading-tight text-gray-500">
                                              {scopeDescription(scope)}
                                            </span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                    {rule.scope === 'All' && (
                                      <div className="mt-3 border-t border-gray-100 pt-2.5">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <div>
                                            <p className="text-[10.5px] font-semibold text-gray-700">Additional access filters</p>
                                            <p className="text-[9px] text-gray-500">Limit records by a department, team, AM, or service.</p>
                                          </div>
                                          {!readOnly && !isInherited && (
                                            <button
                                              type="button"
                                              onClick={() => setExceptionDialogTarget({
                                                moduleId: module.id,
                                                actionId: action.id,
                                                title: `${module.label} > ${action.label}`,
                                              })}
                                              className="inline-flex min-h-8 items-center gap-1 rounded-md border border-brand/30 px-2.5 text-[10px] font-semibold text-brand transition-colors hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                                            >
                                              <Plus size={11} /> Add access filter
                                            </button>
                                          )}
                                        </div>
                                        {rule.exceptions && rule.exceptions.length > 0 && (
                                          <div className="mt-2 flex flex-wrap gap-1.5">
                                            {rule.exceptions.map(ex => {
                                              const targetName = ex.type === 'department'
                                                ? departments.find(d => d.id === ex.targetId)?.name
                                                : ex.type === 'service'
                                                  ? verticals.find(v => v.id === ex.targetId)?.name
                                                  : ex.type === 'team'
                                                    ? teams.find(team => team.id === ex.targetId)?.name
                                                    : (() => {
                                                        const manager = users.find(user => user.id === ex.targetId);
                                                        return manager ? `${manager.firstName} ${manager.lastName}` : 'Unavailable account manager';
                                                      })();
                                              return (
                                                <span key={ex.id} className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[10px] font-medium text-gray-700">
                                                  {targetName}
                                                  {!readOnly && !isInherited && (
                                                    <button
                                                      type="button"
                                                      onClick={() => removeException(module.id, action.id, ex.id)}
                                                      aria-label={`Remove ${targetName} exception`}
                                                      className="text-gray-400 hover:text-brand"
                                                    >
                                                      <X size={11} />
                                                    </button>
                                                  )}
                                                </span>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </fieldset>
                                );
                              })}
                              </div>
                            </div>
                          )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                </tbody>
              </table>
            </div>
        </div>
      )}

      <ExceptionDialog
        open={Boolean(exceptionDialogTarget)}
        title={exceptionDialogTarget?.title || ''}
        onClose={() => setExceptionDialogTarget(null)}
        onAdd={(ex) => exceptionDialogTarget && addException(exceptionDialogTarget.moduleId, exceptionDialogTarget.actionId, ex)}
      />
    </div>
  );
}

export function PermissionsScreen() {
  const searchParams = useSearchParams();
  const { roles } = useAccessControlContext();
  const defaultExpandedRoleId = searchParams.get('roleId') || 'role-admin';
  const initialExpandedRoleId = roles.some(role => role.id === defaultExpandedRoleId)
    ? defaultExpandedRoleId
    : roles[0]?.id;
  const [expandedRoleIds, setExpandedRoleIds] = useState<Set<string>>(
    () => initialExpandedRoleId ? new Set([initialExpandedRoleId]) : new Set(),
  );
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [permissionSearch, setPermissionSearch] = useState('');

  const filteredModules = useMemo(() => {
    const query = permissionSearch.trim().toLowerCase();
    if (!query) return MODULES;
    return MODULES.filter(module => module.label.toLowerCase().includes(query));
  }, [permissionSearch]);

  useEffect(() => {
    setExpandedRoleIds(current => {
      const validRoleIds = new Set(roles.map(role => role.id));
      const next = new Set([...current].filter(roleId => validRoleIds.has(roleId)));
      if (next.size > 0 || roles.length === 0) return next;

      const fallbackRoleId = roles.some(role => role.id === defaultExpandedRoleId)
        ? defaultExpandedRoleId
        : roles[0]?.id;
      return fallbackRoleId ? new Set([fallbackRoleId]) : next;
    });
  }, [defaultExpandedRoleId, roles]);

  function toggleRole(roleId: string) {
    if (editingRoleId === roleId) return;
    setExpandedRoleIds(current => {
      const next = new Set(current);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  }

  return (
    <div className="px-6 py-6 lg:px-8">
      <div className="mb-5">
        <h1 className="text-[20px] font-semibold leading-tight text-gray-900 sm:text-[22px]">Permissions Configuration</h1>
        <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-gray-500">
          Set role actions, record access scopes, and optional business-attribute filters.
        </p>
        <div className="mt-4 w-full sm:max-w-sm">
          <SearchInput
            value={permissionSearch}
            onChange={setPermissionSearch}
            placeholder="Find a module or permission…"
            aria-label="Search modules"
            className="w-full"
          />
        </div>
      </div>

      {roles.length === 0 ? (
        <Empty icon={SearchX} title="No roles found" description="Create a role before configuring permissions." />
      ) : (
        <div className="space-y-3">
          {roles.map(role => {
            const expanded = expandedRoleIds.has(role.id);
            const effectivePermissions = resolveRolePermissions(role, roles);
            const enabledModules = countGrantedModules(effectivePermissions);
            const enabledActions = effectivePermissions.filter(permission => permission.enabled).length;
            const isEditing = editingRoleId === role.id;

            return (
              <section
                key={role.id}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => toggleRole(role.id)}
                  disabled={isEditing}
                  aria-expanded={expanded}
                  aria-controls={`role-permissions-${role.id}`}
                  title={isEditing ? 'Finish editing before collapsing this role' : undefined}
                  className={cn(
                    'flex w-full items-center gap-3 px-5 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand',
                    expanded ? 'bg-white' : 'hover:bg-gray-50/70',
                    isEditing && 'cursor-default',
                  )}
                >
                  <ChevronDown
                    size={16}
                    className={cn(
                      'flex-shrink-0 text-gray-400 transition-transform',
                      !expanded && '-rotate-90',
                    )}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-[16px] font-semibold text-gray-900">{role.name}</h2>
                      {role.isProtected && <Lock size={12} className="text-violet-500" />}
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-[9.5px] font-medium',
                        role.type === 'system' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600',
                      )}>
                        {role.type === 'system' ? 'Base role' : 'Specialized'}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-gray-500">{role.description}</p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-5 text-right sm:gap-6">
                    <div>
                      <p className="text-[12px] font-semibold text-gray-800">{enabledModules}/{MODULES.length}</p>
                      <p className="text-[9.5px] text-gray-400">modules</p>
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-[12px] font-semibold text-gray-800">{enabledActions}</p>
                      <p className="text-[9.5px] text-gray-400">actions</p>
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-gray-800">{role.userCount}</p>
                      <p className="text-[9.5px] text-gray-400">users</p>
                    </div>
                  </div>
                </button>

                {expanded && (
                  <div id={`role-permissions-${role.id}`} className="border-t border-gray-200 px-4 pb-4 sm:px-5">
                    <RolePermissionTable
                      key={role.id}
                      role={role}
                      roles={roles}
                      filteredModules={filteredModules}
                      editing={isEditing}
                      onEdit={() => setEditingRoleId(role.id)}
                      onCancel={() => setEditingRoleId(null)}
                      onSaved={() => setEditingRoleId(null)}
                    />
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
