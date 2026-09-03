'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, ArrowLeft, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MODULES, type AppRole, type DataScope, type ScopeException } from '@/screens/roles/mock-data';
import { useEmployeeGroupsContext } from '@/contexts/EmployeeGroupsContext';
import { useAccessControlContext, resolveEffectiveRoleNames } from '@/contexts/AccessControlContext';
import { useOrgContext } from '@/contexts/OrgContext';
import type { AppUser } from '@/screens/users/mock-data';

interface EffectiveAccessDrawerProps {
  user: AppUser | null;
  onClose: () => void;
}

const SCOPE_PRIORITY: Record<DataScope, number> = {
  All: 3,
  Team: 2,
  Own: 1,
};

export function EffectiveAccessDrawer({ user, onClose }: EffectiveAccessDrawerProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    document.body.style.overflow = user ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [user]);

  const { groups, users } = useEmployeeGroupsContext();
  const { roles: allRoles } = useAccessControlContext();
  const { departments, verticals } = useOrgContext();
  const resolvedRoles = useMemo(
    () => user ? resolveEffectiveRoleNames(user.roles) : [],
    [user],
  );
  const activeGroups = useMemo(
    () => user
      ? groups.filter(group => group.status === 'Active' && user.employeeGroups.includes(group.name))
      : [],
    [groups, user],
  );
  const resolvedGroupRoles = useMemo(
    () => resolveEffectiveRoleNames(activeGroups.flatMap(group => group.roles)),
    [activeGroups],
  );
  const activeDirectRoleNames = resolvedRoles.filter(name =>
    allRoles.some(role => role.name === name && role.status === 'Active'));
  const activeGroupRoleNames = resolvedGroupRoles.filter(name =>
    allRoles.some(role => role.name === name && role.status === 'Active'));

  const effectiveRoles = useMemo(() => {
    if (!user || user.status !== 'Active') return [];
    const allRoleNames = Array.from(new Set([...resolvedRoles, ...resolvedGroupRoles]));
    
    return allRoleNames
      .map(name => allRoles.find(r => r.name === name && r.status === 'Active'))
      .filter((r): r is AppRole => r !== undefined);
  }, [allRoles, resolvedGroupRoles, resolvedRoles, user]);

  const activeReports = useMemo(() => {
    if (!user) return [];
    const reports: AppUser[] = [];
    const pending = users.filter(candidate => candidate.reportingManagerId === user.id);
    const visited = new Set<string>([user.id]);
    while (pending.length > 0) {
      const report = pending.shift()!;
      if (visited.has(report.id)) continue;
      visited.add(report.id);
      if (report.status === 'Active') reports.push(report);
      pending.push(...users.filter(candidate => candidate.reportingManagerId === report.id));
    }
    return reports;
  }, [user, users]);

  const mergedPermissions = useMemo(() => {
    const map = new Map<string, { scope: DataScope, sources: string[], exceptions: ScopeException[] }>();

    for (const role of effectiveRoles) {
      for (const rule of role.permissions) {
        if (!rule.enabled) continue;
        
        const key = `${rule.moduleId}:${rule.actionId}`;
        const existing = map.get(key);

        if (!existing || SCOPE_PRIORITY[rule.scope] > SCOPE_PRIORITY[existing.scope]) {
          map.set(key, { scope: rule.scope, sources: [role.name], exceptions: rule.exceptions || [] });
        } else if (existing && rule.scope === existing.scope) {
          if (!existing.sources.includes(role.name)) {
            existing.sources.push(role.name);
          }
          // Merge exceptions if scopes match
          const allEx = [...existing.exceptions, ...(rule.exceptions || [])];
          // deduplicate by id/target
          existing.exceptions = Array.from(new Map(allEx.map(e => [e.targetId, e])).values());
        }
      }
    }
    return map;
  }, [effectiveRoles]);

  if (!mounted || !user) return null;

  const content = (
    <>
      <div onClick={onClose}
        className={cn('fixed inset-0 z-40 bg-black/20 transition-opacity duration-300',
          user ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none')} />

      <div className={cn(
        'fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-2xl transition-transform duration-300 ease-out sm:w-[500px]',
        user ? 'translate-x-0' : 'translate-x-full',
      )}>
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-5 py-[14px] bg-gray-50/50">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-200 transition-colors">
              <ArrowLeft size={17} />
            </button>
            <div>
              <p className="text-[15px] font-semibold text-gray-900">Effective Access</p>
              <p className="text-[12px] text-gray-500">{user.firstName} {user.lastName}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto bg-gray-50/30">
          <div className="p-5 space-y-6">
            
            {/* Context */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                <ShieldCheck size={16} className="text-brand" />
                <h3 className="text-[13.5px] font-semibold text-gray-900">Access Sources</h3>
              </div>
              <div className="p-4 space-y-4">
                {user.status !== 'Active' ? (
                  <p className="text-[13px] text-red-600 font-medium">User is {user.status}. No access is granted.</p>
                ) : (
                  <>
                    <div>
                      <span className="text-[12px] font-medium text-gray-700 block mb-1">Direct Roles</span>
                      <div className="flex flex-wrap gap-1.5">
                        {resolvedRoles.length > 0 
                          ? activeDirectRoleNames.map(r => <span key={r} className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-[11.5px] font-medium text-blue-700">{r}</span>)
                          : <span className="text-[12px] text-gray-400">None</span>}
                      </div>
                    </div>
                    <div>
                      <span className="text-[12px] font-medium text-gray-700 block mb-1">Group Inherited Roles</span>
                      <div className="flex flex-wrap gap-1.5">
                        {activeGroupRoleNames.length > 0 
                          ? activeGroupRoleNames.map(r => <span key={r} className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-[11.5px] font-medium text-purple-700">{r}</span>)
                          : <span className="text-[12px] text-gray-400">None</span>}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Matrix */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                <Check size={16} className="text-emerald-500" />
                <h3 className="text-[13.5px] font-semibold text-gray-900">Resulting Permissions</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {user.status === 'Active' && MODULES.map(module => {
                  const moduleActions = module.actions.filter(a => mergedPermissions.has(`${module.id}:${a.id}`));
                  if (moduleActions.length === 0) return null;

                  return (
                    <div key={module.id} className="p-4">
                      <h4 className="text-[13px] font-bold text-gray-800 mb-3">{module.label}</h4>
                      <div className="space-y-3 pl-2">
                        {moduleActions.map(action => {
                          const access = mergedPermissions.get(`${module.id}:${action.id}`)!;
                          return (
                            <div key={action.id} className="flex flex-col gap-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[13px] font-medium text-gray-700">{action.label}</span>
                                <span className={cn(
                                  'text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider',
                                  access.scope === 'All' ? 'bg-emerald-100 text-emerald-700' :
                                  access.scope === 'Team' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                                )}>{access.scope}</span>
                              </div>
                              <p className="text-[11.5px] text-gray-400 mb-1">
                                Granted by: {access.sources.join(', ')}
                              </p>
                              {access.scope === 'Own' && (
                                <p className="text-[11px] text-gray-500 italic">User's own assigned records only.</p>
                              )}
                              {access.scope === 'Team' && (
                                <p className="text-[11px] text-gray-500 italic">
                                  User&apos;s own records plus {activeReports.length} active direct/indirect {activeReports.length === 1 ? 'report' : 'reports'}
                                  {activeReports.length > 0 ? ` (${activeReports.map(report => `${report.firstName} ${report.lastName}`).join(', ')})` : ''}.
                                </p>
                              )}
                              {access.exceptions && access.exceptions.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1.5">
                                  {access.exceptions.map(ex => {
                                    const targetName = ex.type === 'department' 
                                      ? departments.find(d => d.id === ex.targetId)?.name 
                                      : ex.type === 'service'
                                        ? verticals.find(v => v.id === ex.targetId)?.name
                                        : (() => {
                                            const manager = users.find(candidate => candidate.id === ex.targetId);
                                            return manager ? `${manager.firstName} ${manager.lastName}` : 'Unavailable account manager';
                                          })();
                                    return (
                                      <span key={ex.targetId} className="inline-flex items-center rounded bg-orange-50 px-1.5 py-0.5 text-[11px] font-medium text-brand border border-brand/20">
                                        Except {ex.type === 'department' ? 'Dept' : ex.type === 'service' ? 'Service' : 'Manager'}: {targetName} {ex.hierarchyApplies && '(+Hierarchy)'}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {user.status !== 'Active' || effectiveRoles.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 text-[13px]">No permissions granted.</div>
                ) : null}
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );

  return createPortal(content, document.body);
}