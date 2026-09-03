'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronDown, Lock, Save, SearchX, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

/* ── Exception Dialog ── */

function ExceptionDialog({ open, onClose, onAdd, title }: {
  open: boolean;
  onClose: () => void;
  onAdd: (exception: Omit<ScopeException, 'id'>) => void;
  title: string;
}) {
  const { users } = useEmployeeGroupsContext();
  const { departments, verticals } = useOrgContext();
  const [type, setType] = useState<'department' | 'service' | 'account_manager'>('department');
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
      : users
          .filter(user => user.status === 'Active')
          .map(user => ({ value: user.id, label: `${user.firstName} ${user.lastName}` }));

  return (
    <DialogPrimitive.Root open={open} onOpenChange={open => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed inset-0 z-50 m-auto h-fit w-[calc(100vw-3rem)] max-w-[420px] rounded-2xl bg-white p-6 shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <DialogPrimitive.Title className="text-[16px] font-semibold text-gray-900">
            Add Exception for {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-2 text-[13px] text-gray-500 mb-5">
            Narrow this All-scope permission by department, service, or account manager.
          </DialogPrimitive.Description>

          <div className="space-y-4">
            <div>
              <label className="text-[12px] font-medium text-gray-700 mb-1 block">Exception Type</label>
              <Select value={type} onValueChange={(v: any) => { setType(v); setTargetId(''); }}>
                <SelectTrigger className="h-9 w-full rounded-lg border border-gray-200 text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="department">Department</SelectItem>
                  <SelectItem value="service">Service (Vertical)</SelectItem>
                  <SelectItem value="account_manager">Account Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[12px] font-medium text-gray-700 mb-1 block">Target</label>
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

            <label className="flex items-center gap-2 cursor-pointer mt-2">
              <input
                type="checkbox"
                checked={hierarchyApplies}
                onChange={e => setHierarchyApplies(e.target.checked)}
                className="rounded border-gray-300 text-brand focus:ring-brand"
              />
              <span className="text-[13px] text-gray-700">Reporting hierarchy still applies</span>
            </label>
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
              Add Exception
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
}: {
  role: AppRole;
  roles: AppRole[];
  filteredModules: typeof MODULES;
}) {
  const { updateRolePermissions } = useAccessControlContext();
  const { users } = useEmployeeGroupsContext();
  const { departments, verticals } = useOrgContext();
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

  const [permissions, setPermissions] = useState<PermissionRule[]>(() =>
    cloneRules(resolveRolePermissions(role, roles)));
  const [isSaved, setIsSaved] = useState(true);

  const [exceptionDialogTarget, setExceptionDialogTarget] = useState<{ moduleId: string, actionId: string, title: string } | null>(null);
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
    setPermissions(cloneRules(resolveRolePermissions(role, roles)));
    setIsSaved(true);
  }, [role, roles]);

  const granted = countGrantedModules(permissions);
  const total = MODULES.length;
  const coverage = Math.round((granted / total) * 100);
  const readOnly = role.isProtected;

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
    setIsSaved(false);
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
    updateRule(moduleId, actionId, { scope });
  }

  function addException(moduleId: string, actionId: string, exceptionData: Omit<ScopeException, 'id'>) {
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
    setIsSaved(false);
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
    setIsSaved(false);
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
    setIsSaved(true);
  }

  return (
    <div className="overflow-hidden bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-white px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-gray-900">
              Permission matrix
            </p>
            <p className="text-[11.5px] text-gray-500">
              {granted} of {total} modules enabled
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={savePermissions}
          disabled={readOnly || isSaved}
          className="inline-flex h-8 flex-shrink-0 items-center justify-center gap-1.5 rounded-lg bg-brand px-3 text-[12px] font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
        >
          <Save size={14} />
          Save
        </button>
      </div>

      {filteredModules.length === 0 ? (
        <div className="p-5">
          <Empty icon={SearchX} title="No modules found" description="Try adjusting your search." />
        </div>
      ) : (
        <div className="bg-gray-50/50 p-3 sm:p-4">
          <div className="min-w-0 max-w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain">
              <Table className={cn(
                'w-full table-auto',
                matrixActions.length > 6 ? 'min-w-[1180px]' : 'min-w-[760px]',
              )}>
                <TableHeader className="whitespace-nowrap">
                  <TableRow className="border-b border-gray-200 bg-gray-50 hover:bg-gray-50">
                    <TableHead className="min-w-[230px] pl-5">Permissions</TableHead>
                    {matrixActions.map(action => (
                      <TableHead key={action.id} className="min-w-[105px] px-3 text-center">
                        {action.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody className="whitespace-nowrap">
                  {filteredModules.map(module => {
                    const enabledRules = module.actions
                      .map(action => ({ action, rule: getRule(module.id, action.id) }))
                      .filter(item => item.rule.enabled);
                    const enabledScopes = new Set(enabledRules.map(item => item.rule.scope));
                    const scopeSummary = enabledRules.length === 0
                      ? 'No permissions enabled'
                      : enabledScopes.size === 1
                        ? `${enabledRules.length} enabled · ${enabledRules[0].rule.scope}`
                        : `${enabledRules.length} enabled · Mixed scopes`;
                    const scopeExpanded = expandedScopeModules.has(module.id);

                    return [
                      <TableRow
                        key={module.id}
                        className="border-b border-gray-100 transition-colors hover:bg-gray-50/70"
                      >
                        <TableCell className="pl-5 py-4">
                          <div className="flex min-w-[210px] items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => toggleScopeModule(module.id)}
                              disabled={enabledRules.length === 0}
                              aria-label={`${scopeExpanded ? 'Hide' : 'Show'} scope settings for ${module.label}`}
                              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              <ChevronDown
                                size={15}
                                className={cn('transition-transform', !scopeExpanded && '-rotate-90')}
                              />
                            </button>
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold text-gray-900">{module.label}</p>
                              <p className="mt-0.5 text-[10.5px] text-gray-400">{scopeSummary}</p>
                            </div>
                          </div>
                        </TableCell>
                        {matrixActions.map(action => {
                          const supportedAction = module.actions.find(candidate => candidate.id === action.id);
                          if (!supportedAction) {
                            return (
                              <TableCell key={action.id} className="px-3 py-4 text-center">
                                <span className="text-[12px] text-gray-200">—</span>
                              </TableCell>
                            );
                          }

                          const rule = getRule(module.id, action.id);
                          const inheritedRule = basePermissions.find(
                            permission => permission.moduleId === module.id && permission.actionId === action.id,
                          );
                          const isInherited = Boolean(inheritedRule?.enabled);

                          return (
                            <TableCell key={action.id} className="px-3 py-4 text-center">
                              <input
                                type="checkbox"
                                checked={rule.enabled}
                                onChange={() => toggleAction(module.id, action.id, rule.enabled)}
                                disabled={readOnly || isInherited}
                                title={isInherited ? `Inherited from ${baseRole?.name}` : `${supportedAction.label} ${module.label}`}
                                aria-label={`${supportedAction.label} permission for ${module.label}`}
                                className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-[#F97316] disabled:cursor-not-allowed disabled:opacity-50"
                              />
                            </TableCell>
                          );
                        })}
                      </TableRow>,
                      scopeExpanded && (
                        <TableRow key={`${module.id}-scope`} className="border-b border-gray-100 bg-gray-50/70 hover:bg-gray-50/70">
                          <TableCell colSpan={matrixActions.length + 1} className="px-5 py-4">
                            <div className="grid gap-3 whitespace-normal md:grid-cols-2 xl:grid-cols-3">
                              {enabledRules.map(({ action, rule }) => {
                                const inheritedRule = basePermissions.find(
                                  permission => permission.moduleId === module.id && permission.actionId === action.id,
                                );
                                const isInherited = Boolean(inheritedRule?.enabled);

                                return (
                                  <div key={action.id} className="rounded-lg border border-gray-200 bg-white p-3">
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                      <p className="text-[12px] font-semibold text-gray-800">{action.label}</p>
                                      {isInherited && (
                                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                                          Inherited
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex w-fit rounded-lg border border-gray-200/60 bg-gray-100/80 p-0.5">
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
                                            title={belowInheritedScope ? `Cannot be narrower than ${inheritedRule?.scope}` : undefined}
                                            className={cn(
                                              'whitespace-nowrap rounded-md px-3 py-1.5 text-[11px] font-medium transition-all',
                                              rule.scope === scope
                                                ? 'border border-gray-200/50 bg-white text-brand shadow-sm'
                                                : 'text-gray-500 hover:text-gray-900',
                                              (readOnly || belowInheritedScope) && 'cursor-not-allowed opacity-40',
                                            )}
                                          >
                                            {scope}
                                          </button>
                                        );
                                      })}
                                    </div>
                                    {rule.scope === 'All' && (
                                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                        {rule.exceptions?.map(ex => {
                                          const targetName = ex.type === 'department'
                                            ? departments.find(d => d.id === ex.targetId)?.name
                                            : ex.type === 'service'
                                              ? verticals.find(v => v.id === ex.targetId)?.name
                                              : (() => {
                                                  const manager = users.find(user => user.id === ex.targetId);
                                                  return manager ? `${manager.firstName} ${manager.lastName}` : 'Unavailable account manager';
                                                })();
                                          return (
                                            <span key={ex.id} className="inline-flex items-center gap-1 rounded-md border border-brand/20 bg-orange-50 px-2 py-1 text-[10.5px] font-medium text-brand">
                                              Except: {targetName}
                                              {!readOnly && !isInherited && (
                                                <button
                                                  type="button"
                                                  onClick={() => removeException(module.id, action.id, ex.id)}
                                                  aria-label={`Remove ${targetName} exception`}
                                                  className="text-brand/60 hover:text-brand"
                                                >
                                                  <X size={11} />
                                                </button>
                                              )}
                                            </span>
                                          );
                                        })}
                                        {!readOnly && !isInherited && (
                                          <button
                                            type="button"
                                            onClick={() => setExceptionDialogTarget({
                                              moduleId: module.id,
                                              actionId: action.id,
                                              title: `${module.label} > ${action.label}`,
                                            })}
                                            className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-brand hover:underline"
                                          >
                                            <Plus size={11} /> Add Exception
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </TableCell>
                        </TableRow>
                      ),
                    ];
                  })}
                </TableBody>
              </Table>
            </div>
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
    : undefined;
  const [expandedRoleIds, setExpandedRoleIds] = useState<Set<string>>(
    () => new Set(initialExpandedRoleId ? [initialExpandedRoleId] : []),
  );
  const [mountedRoleIds, setMountedRoleIds] = useState<Set<string>>(
    () => new Set(initialExpandedRoleId ? [initialExpandedRoleId] : []),
  );
  const [permissionSearch, setPermissionSearch] = useState('');

  const filteredModules = useMemo(() => {
    const query = permissionSearch.trim().toLowerCase();
    if (!query) return MODULES;
    return MODULES.filter(module => module.label.toLowerCase().includes(query));
  }, [permissionSearch]);

  function toggleRole(roleId: string) {
    setMountedRoleIds(current => {
      if (current.has(roleId)) return current;
      const next = new Set(current);
      next.add(roleId);
      return next;
    });
    setExpandedRoleIds(current => {
      const next = new Set(current);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  }

  return (
    <div className="px-6 py-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold leading-tight text-gray-900 sm:text-[22px]">Permissions Configuration</h1>
        <p className="mt-0.5 text-[13px] text-gray-500">
          Configure each role using Module + Action + Data Scope. Expand a role to view and edit its permission matrix.
        </p>
        <div className="mt-4 flex w-full sm:w-80">
          <SearchInput
            value={permissionSearch}
            onChange={setPermissionSearch}
            placeholder="Search modules…"
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
            const isExpanded = expandedRoleIds.has(role.id);
            const effectivePermissions = resolveRolePermissions(role, roles);
            const enabledModules = countGrantedModules(effectivePermissions);

            return (
              <section key={role.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-controls={`permissions-${role.id}`}
                    onClick={() => toggleRole(role.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <ChevronDown
                      size={17}
                      className={cn(
                        'flex-shrink-0 text-gray-400 transition-transform',
                        !isExpanded && '-rotate-90',
                      )}
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-[14px] font-semibold text-gray-900">{role.name}</h2>
                        {role.isProtected && <Lock size={12} className="text-violet-500" />}
                        <span className={cn(
                          'rounded-full px-2 py-0.5 text-[10.5px] font-medium',
                          role.type === 'system'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-orange-50 text-brand',
                        )}>
                          {role.type === 'system' ? 'Base role' : 'Specialized'}
                        </span>
                      </div>
                      <p className="truncate text-[11.5px] text-gray-500">{role.description}</p>
                    </div>
                  </button>
                  <div className="hidden flex-shrink-0 text-right sm:block">
                    <p className="text-[12px] font-semibold text-gray-700">{enabledModules}/{MODULES.length} modules</p>
                    <p className="text-[10.5px] text-gray-400">{role.userCount} assigned users</p>
                  </div>
                </div>

                {mountedRoleIds.has(role.id) && (
                  <div
                    id={`permissions-${role.id}`}
                    className={cn('border-t border-gray-100', !isExpanded && 'hidden')}
                  >
                    <RolePermissionTable
                      role={role}
                      roles={roles}
                      filteredModules={filteredModules}
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
