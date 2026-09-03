'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, Lock, Save, ShieldCheck, SearchX, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  MODULES,
  resolveRolePermissions,
  type PermissionRule,
  type DataScope,
  type ScopeException,
} from '@/screens/roles/mock-data';
import { useAccessControlContext } from '@/contexts/AccessControlContext';
import { useEmployeeGroupsContext } from '@/contexts/EmployeeGroupsContext';
import { useOrgContext } from '@/contexts/OrgContext';
import { SearchInput } from '@/components/ui/search-input';
import { Empty } from '@/components/ui/empty';
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

export function PermissionsScreen() {
  const searchParams = useSearchParams();
  const { roles, updateRolePermissions } = useAccessControlContext();
  const { users } = useEmployeeGroupsContext();
  const { departments, verticals } = useOrgContext();
  const defaultRoleId = searchParams.get('roleId') || 'role-admin';

  const [selectedRoleId, setSelectedRoleId] = useState(defaultRoleId);
  const selectedRole = useMemo(
    () => roles.find(role => role.id === selectedRoleId) ?? roles[0],
    [selectedRoleId, roles],
  );
  const baseRole = useMemo(
    () => selectedRole.baseRoleId
      ? roles.find(role => role.id === selectedRole.baseRoleId)
      : undefined,
    [roles, selectedRole.baseRoleId],
  );

  const [permissions, setPermissions] = useState<PermissionRule[]>(() =>
    cloneRules(resolveRolePermissions(selectedRole, roles)));
  const [isSaved, setIsSaved] = useState(true);
  const [permissionSearch, setPermissionSearch] = useState('');

  const [exceptionDialogTarget, setExceptionDialogTarget] = useState<{ moduleId: string, actionId: string, title: string } | null>(null);

  useEffect(() => {
    setPermissions(cloneRules(resolveRolePermissions(selectedRole, roles)));
    setIsSaved(true);
  }, [selectedRole, baseRole, roles]);

  const granted = countGrantedModules(permissions);
  const total = MODULES.length;
  const coverage = Math.round((granted / total) * 100);
  const readOnly = selectedRole.isProtected;

  const filteredModules = useMemo(() => {
    const query = permissionSearch.trim().toLowerCase();
    if (!query) return MODULES;
    return MODULES.filter(module => module.label.toLowerCase().includes(query));
  }, [permissionSearch]);

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
    const inheritedRule = baseRole?.permissions.find(
      rule => rule.moduleId === moduleId && rule.actionId === actionId,
    );
    if (inheritedRule?.enabled && currentEnabled) return;
    updateRule(moduleId, actionId, { enabled: !currentEnabled });
  }

  function setScope(moduleId: string, actionId: string, scope: DataScope) {
    const module = MODULES.find(item => item.id === moduleId);
    if (!module?.availableScopes.includes(scope)) return;
    const inheritedRule = baseRole?.permissions.find(
      rule => rule.moduleId === moduleId && rule.actionId === actionId,
    );
    if (inheritedRule?.enabled && SCOPE_RANK[scope] < SCOPE_RANK[inheritedRule.scope]) return;
    updateRule(moduleId, actionId, { scope });
  }

  function addException(moduleId: string, actionId: string, exceptionData: Omit<ScopeException, 'id'>) {
    const inheritedRule = baseRole?.permissions.find(
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

  function savePermissions() {
    updateRolePermissions(selectedRole.id, permissions);
    toast.success(`Permissions updated for ${selectedRole.name}`);
    setIsSaved(true);
  }

  return (
    <div className="px-6 py-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-[20px] font-semibold leading-tight text-gray-900 sm:text-[22px]">Permissions Configuration</h1>
          <p className="mt-0.5 text-[13px] text-gray-500">
            Configure each role using Module + Action + Data Scope. Available scopes vary by module.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end">
          <SearchInput
            value={permissionSearch}
            onChange={setPermissionSearch}
            placeholder="Search modules…"
            className="w-full sm:w-80"
          />
          <div className="w-full sm:w-[260px]">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-gray-400">
              Editing Role
            </label>
            <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
              <SelectTrigger className="h-9 w-full rounded-xl border border-gray-200 bg-white text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map(role => (
                  <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-brand">
            <ShieldCheck size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[14px] font-bold text-gray-900 flex items-center gap-2">
              {selectedRole.name}
              {selectedRole.isProtected && <Lock size={12} className="text-violet-500" />}
            </h3>
            <p className="truncate text-[12px] text-gray-500">{selectedRole.description}</p>
            {baseRole && (
              <p className="mt-1 truncate text-[11.5px] font-medium text-brand">
                Based on {baseRole.name} · inherited actions and scopes are the minimum access
              </p>
            )}
          </div>
        </div>
        <button
          onClick={savePermissions}
          disabled={readOnly || isSaved}
          className="inline-flex h-9 w-full flex-shrink-0 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-50 sm:w-auto"
        >
          <Save size={15} />
          Save Changes
        </button>
      </div>

      <div className="space-y-4">
        {filteredModules.length === 0 ? (
          <Empty icon={SearchX} title="No modules found" description="Try adjusting your search." />
        ) : filteredModules.map(module => {
          return (
            <div key={module.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 bg-gray-50 px-5 py-3">
                <h4 className="text-[14px] font-semibold text-gray-900">{module.label}</h4>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10.5px] font-medium text-gray-400">Available scopes:</span>
                  {module.availableScopes.map(scope => (
                    <span
                      key={scope}
                      className="rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[10.5px] font-medium text-gray-600"
                    >
                      {scope}
                    </span>
                  ))}
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {module.actions.map(action => {
                  const rule = getRule(module.id, action.id);
                  const isEnabled = rule.enabled;
                  const isAll = rule.scope === 'All';
                  const inheritedRule = baseRole?.permissions.find(
                    permission => permission.moduleId === module.id && permission.actionId === action.id,
                  );
                  const isInherited = Boolean(inheritedRule?.enabled);

                  return (
                    <div key={action.id} className="flex flex-col lg:flex-row lg:items-center justify-between p-4 gap-4 transition-colors hover:bg-gray-50/50">

                      <div className="flex items-center gap-4 min-w-[200px]">
                        <button
                          type="button"
                          onClick={() => toggleAction(module.id, action.id, isEnabled)}
                          disabled={readOnly || isInherited}
                          title={isInherited ? `Inherited from ${baseRole?.name}` : undefined}
                          className={cn(
                            'flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-[4px] border-[1.5px] transition-colors',
                            isEnabled ? 'border-brand bg-brand' : 'border-gray-300 bg-white',
                            (readOnly || isInherited) && 'opacity-50 cursor-not-allowed'
                          )}
                        >
                          {isEnabled && <Check size={12} className="text-white" strokeWidth={3} />}
                        </button>
                        <span className="text-[13.5px] font-medium text-gray-800">{action.label}</span>
                        {isInherited && (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10.5px] font-medium text-blue-700">
                            Inherited
                          </span>
                        )}
                      </div>

                      {isEnabled && (
                        <div className="flex-1 flex flex-col gap-3 pl-8 lg:pl-0">
                          <div className="flex items-center gap-2">
                            <span className="w-20 text-[12px] text-gray-500">Data Scope:</span>
                            <div className="flex bg-gray-100/80 p-0.5 rounded-lg border border-gray-200/60">
                              {module.availableScopes.map(scope => (
                                (() => {
                                  const belowInheritedScope = Boolean(
                                    inheritedRule?.enabled
                                    && SCOPE_RANK[scope] < SCOPE_RANK[inheritedRule.scope],
                                  );
                                  return (
                                    <button
                                      key={scope}
                                      onClick={() => setScope(module.id, action.id, scope)}
                                      disabled={readOnly || belowInheritedScope}
                                      title={belowInheritedScope ? `Cannot be narrower than ${inheritedRule?.scope}` : undefined}
                                      className={cn(
                                        'px-3 py-1.5 text-[12px] font-medium rounded-md transition-all',
                                        rule.scope === scope
                                          ? 'bg-white text-brand shadow-sm border border-gray-200/50'
                                          : 'text-gray-500 hover:text-gray-900',
                                        (readOnly || belowInheritedScope) && 'cursor-not-allowed opacity-40'
                                      )}
                                    >
                                      {scope}
                                    </button>
                                  );
                                })()
                              ))}
                            </div>
                          </div>

                          {isAll && (
                            <div className="pl-[56px] flex flex-col gap-2">
                              {rule.exceptions && rule.exceptions.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {rule.exceptions.map(ex => {
                                    const targetName = ex.type === 'department'
                                      ? departments.find(d => d.id === ex.targetId)?.name
                                      : ex.type === 'service'
                                        ? verticals.find(v => v.id === ex.targetId)?.name
                                        : (() => {
                                            const manager = users.find(user => user.id === ex.targetId);
                                            return manager ? `${manager.firstName} ${manager.lastName}` : 'Unavailable account manager';
                                          })();
                                    return (
                                      <div key={ex.id} className="flex items-center gap-1.5 bg-orange-50 border border-brand/20 px-2 py-1 rounded-md">
                                        <span className="text-[11px] text-brand font-medium">
                                          Except: {ex.type === 'department' ? 'Dept' : ex.type === 'service' ? 'Service' : 'Manager'} - {targetName}
                                          {ex.hierarchyApplies && ' (Hierarchy)'}
                                        </span>
                                        {!readOnly && (
                                          <button onClick={() => removeException(module.id, action.id, ex.id)} className="text-brand/60 hover:text-brand">
                                            <X size={12} />
                                          </button>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                              {!readOnly && !isInherited && (
                                <button
                                  onClick={() => setExceptionDialogTarget({ moduleId: module.id, actionId: action.id, title: `${module.label} > ${action.label}` })}
                                  className="text-[11.5px] font-medium text-brand hover:underline inline-flex items-center gap-1 w-fit"
                                >
                                  <Plus size={12} /> Add Exception
                                </button>
                              )}
                              {isInherited && (
                                <p className="text-[11px] text-gray-400">
                                  Inherited access cannot be narrowed with new exceptions.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <ExceptionDialog
        open={Boolean(exceptionDialogTarget)}
        title={exceptionDialogTarget?.title || ''}
        onClose={() => setExceptionDialogTarget(null)}
        onAdd={(ex) => exceptionDialogTarget && addException(exceptionDialogTarget.moduleId, exceptionDialogTarget.actionId, ex)}
      />
    </div>
  );
}
