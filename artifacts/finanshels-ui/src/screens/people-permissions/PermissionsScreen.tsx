'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Lock, Save, ShieldCheck, SearchX } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { MODULES, MOCK_ROLES, type AppRole } from '@/screens/roles/mock-data';
import { SearchInput } from '@/components/ui/search-input';
import { Empty } from '@/components/ui/empty';

type PermissionMap = Record<string, string[]>;

function clonePermissions(permissions: PermissionMap): PermissionMap {
  return Object.fromEntries(
    MODULES.map(module => [
      module.id,
      (permissions[module.id] ?? []).length > 0 ? module.actions.map(action => action.id) : [],
    ]),
  );
}

function countGrantedModules(permissions: PermissionMap) {
  return MODULES.filter(module => (permissions[module.id] ?? []).length > 0).length;
}

function RoleBadge({ role }: { role: AppRole }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-medium',
      role.isProtected
        ? 'border-violet-200 bg-violet-50 text-violet-700'
        : role.type === 'system'
          ? 'border-blue-200 bg-blue-50 text-blue-700'
          : 'border-orange-200 bg-orange-50 text-brand',
    )}>
      {role.isProtected && <Lock size={10} className="mr-1" />}
      {role.isProtected ? 'Protected' : role.type === 'system' ? 'System role' : 'Custom role'}
    </span>
  );
}

export function PermissionsScreen() {
  const [selectedRoleId, setSelectedRoleId] = useState('role-admin');
  const [permissions, setPermissions] = useState<PermissionMap>(() =>
    clonePermissions(MOCK_ROLES.find(role => role.id === 'role-admin')?.permissions ?? {}),
  );
  const [isSaved, setIsSaved] = useState(true);
  const [permissionSearch, setPermissionSearch] = useState('');

  const selectedRole = useMemo(
    () => MOCK_ROLES.find(role => role.id === selectedRoleId) ?? MOCK_ROLES[0],
    [selectedRoleId],
  );

  useEffect(() => {
    setPermissions(clonePermissions(selectedRole.permissions));
    setIsSaved(true);
  }, [selectedRole]);

  const granted = countGrantedModules(permissions);
  const total = MODULES.length;
  const coverage = Math.round((granted / total) * 100);
  const readOnly = selectedRole.isProtected;
  const filteredModules = useMemo(() => {
    const query = permissionSearch.trim().toLowerCase();
    if (!query) return MODULES;

    return MODULES.filter(module => module.label.toLowerCase().includes(query));
  }, [permissionSearch]);

  function toggleModule(moduleId: string) {
    if (readOnly) return;
    const module = MODULES.find(item => item.id === moduleId);
    if (!module) return;
    const current = permissions[moduleId] ?? [];
    const allGranted = module.actions.every(action => current.includes(action.id));
    setPermissions({
      ...permissions,
      [moduleId]: allGranted ? [] : module.actions.map(action => action.id),
    });
    setIsSaved(false);
  }

  function savePermissions() {
    toast.success(`Permissions updated for ${selectedRole.name}`);
    setIsSaved(true);
  }

  return (
    <div className="px-6 py-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-gray-900">Permissions</h2>
          <p className="mt-0.5 text-[13px] text-gray-500">
            Configure module-level access for each role.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end">
          <SearchInput
            value={permissionSearch}
            onChange={setPermissionSearch}
            placeholder="Search modules…"
            aria-label="Search modules"
            className="w-full sm:w-80"
          />
          <div className="w-full sm:w-[260px]">
            <label htmlFor="permission-role" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-gray-400">
              Configure role
            </label>
            <select
              id="permission-role"
              value={selectedRoleId}
              onChange={event => setSelectedRoleId(event.target.value)}
              className="h-9 w-full rounded-xl border border-gray-200 bg-white px-3 text-[13px] font-medium text-gray-800 shadow-sm outline-none transition-colors hover:border-gray-300 focus:border-brand focus:ring-1 focus:ring-brand/20"
            >
              {MOCK_ROLES.map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          { label: 'Selected Role', value: selectedRole.name, icon: ShieldCheck, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Granted Modules', value: `${granted} / ${total}`, icon: Check, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Coverage', value: `${coverage}%`, icon: Save, color: 'text-brand', bg: 'bg-orange-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="flex min-w-0 items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
            <div className={cn('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl', bg)}>
              <Icon size={17} className={color} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[16px] font-bold text-gray-900">{value}</p>
              <p className="truncate text-[11.5px] text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-semibold text-gray-900">Permission Matrix</h3>
              <RoleBadge role={selectedRole} />
            </div>
            <p className="mt-1 text-[12px] text-gray-500">
              {readOnly
                ? 'Protected roles cannot be modified.'
                : 'Grant full module access. Individual actions are not configurable.'}
            </p>
          </div>
          <button
            type="button"
            onClick={savePermissions}
            disabled={readOnly || isSaved}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-brand px-3.5 text-[12px] font-semibold text-white transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
          >
            <Save size={14} />
            Save Changes
          </button>
        </div>

          <div className="space-y-2 p-4">
          {filteredModules.length === 0 ? (
            <Empty
              icon={SearchX}
              title="No matching permissions"
              description="Try adjusting your search to find what you’re looking for."
              className="py-16"
            />
          ) : filteredModules.map(module => {
            const grantedActions = permissions[module.id] ?? [];
            const allGranted = module.actions.every(action => grantedActions.includes(action.id));
            const someGranted = module.actions.some(action => grantedActions.includes(action.id));

            return (
              <div key={module.id} className="overflow-hidden rounded-xl border border-gray-200">
                <div className={cn(
                  'flex items-center justify-between border-b border-gray-100 px-4 py-3',
                  someGranted ? 'bg-orange-50/50' : 'bg-gray-50/60',
                )}>
                    <div>
                      <span className="text-[12.5px] font-semibold text-gray-800">{module.label}</span>
                      <p className={cn('mt-0.5 text-[11.5px]', grantedActions.length > 0 ? 'text-brand' : 'text-gray-400')}>
                        {grantedActions.length > 0 ? 'Full module access' : 'No access'}
                      </p>
                    </div>
                  <button
                    type="button"
                    onClick={() => toggleModule(module.id)}
                    disabled={readOnly}
                    aria-label={`${allGranted ? 'Remove' : 'Grant'} all ${module.label} permissions`}
                    className={cn(
                      'inline-flex items-center gap-1.5 text-[11.5px] font-medium',
                      readOnly ? 'cursor-not-allowed text-gray-300' : 'text-gray-500 hover:text-brand',
                    )}
                  >
                    <span className={cn(
                      'flex h-[15px] w-[15px] items-center justify-center rounded-[3px] border-[1.5px]',
                      allGranted ? 'border-brand bg-brand' : someGranted ? 'border-brand/40 bg-brand/30' : 'border-gray-300 bg-white',
                    )}>
                      {(allGranted || someGranted) && <Check size={8} className="text-white" strokeWidth={3} />}
                    </span>
                    All
                    {allGranted ? 'Enabled' : 'Enable'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}