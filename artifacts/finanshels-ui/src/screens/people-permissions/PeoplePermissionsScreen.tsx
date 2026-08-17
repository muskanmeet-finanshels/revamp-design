'use client';

import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { RolesScreen } from '@/screens/roles/RolesScreen';
import { PermissionsScreen } from './PermissionsScreen';

type AdminSection = 'roles' | 'permissions';

const SUBMODULES: { value: AdminSection; label: string; description: string }[] = [
  {
    value: 'roles',
    label: 'Roles',
    description: 'Create and manage system and custom roles',
  },
  {
    value: 'permissions',
    label: 'Permissions',
    description: 'Configure module-level access for each role',
  },
];

export function PeoplePermissionsScreen() {
  const [section, setSection] = useState<AdminSection>('roles');

  /* Keep the selected Admin submodule in sync with the URL hash and sidebar links. */
  useEffect(() => {
    const syncSection = () => {
      const hash = window.location.hash.replace('#', '') as AdminSection;
      if (['roles', 'permissions'].includes(hash)) setSection(hash);
    };
    syncSection();
    window.addEventListener('hashchange', syncSection);
    return () => window.removeEventListener('hashchange', syncSection);
  }, []);

  function changeSection(nextSection: AdminSection) {
    setSection(nextSection);
    window.history.replaceState(null, '', `#${nextSection}`);
  }

  const current = SUBMODULES.find(item => item.value === section)!;

  return (
    <div className="flex min-h-full flex-col">

      {/* ── Module header ───────────────────────────────────────────── */}
      <div className="border-b border-gray-100 bg-white px-6 py-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="text-[20px] font-bold text-gray-900">Admin</h1>
          <div className="relative w-full sm:w-[260px]">
            <label htmlFor="admin-section" className="sr-only">
              Select Admin submodule
            </label>
            <select
              id="admin-section"
              value={section}
              onChange={event => changeSection(event.target.value as AdminSection)}
              className="h-10 w-full appearance-none rounded-lg border border-gray-200 bg-white px-3.5 pr-10 text-[13px] font-medium text-gray-800 shadow-sm outline-none transition-colors hover:border-gray-300 focus:border-brand focus:ring-2 focus:ring-brand/10"
            >
              {SUBMODULES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <ChevronDown
              size={15}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
          </div>
        </div>
        <p className="mt-1 text-[13.5px] text-gray-500">{current.description}</p>
      </div>

      {/* ── Admin submodule content ─────────────────────────────────── */}
      <div className="flex-1">
        {section === 'roles' && <RolesScreen hideHeader />}
        {section === 'permissions' && <PermissionsScreen />}
      </div>
    </div>
  );
}
