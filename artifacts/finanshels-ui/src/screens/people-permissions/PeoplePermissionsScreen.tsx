'use client';

import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { OrgScreen }   from '@/screens/organisation/OrgScreen';
import { UsersScreen } from '@/screens/users/UsersScreen';
import { RolesScreen } from '@/screens/roles/RolesScreen';

type Tab = 'organisation' | 'users' | 'roles';

const TABS: { value: Tab; label: string; description: string }[] = [
  {
    value: 'organisation',
    label: 'Organisation',
    description: 'Departments, verticals, and teams',
  },
  {
    value: 'users',
    label: 'User Management',
    description: 'Add, manage, and control user access',
  },
  {
    value: 'roles',
    label: 'Roles & Permissions',
    description: 'System and custom roles with module-level control',
  },
];

export function PeoplePermissionsScreen() {
  const [tab, setTab] = useState<Tab>('organisation');

  /* Restore tab from URL hash on mount */
  useEffect(() => {
    const hash = window.location.hash.replace('#', '') as Tab;
    if (['organisation', 'users', 'roles'].includes(hash)) setTab(hash as Tab);
  }, []);

  function changeTab(t: Tab) {
    setTab(t);
    window.history.replaceState(null, '', `#${t}`);
  }

  const current = TABS.find(t => t.value === tab)!;

  return (
    <div className="flex min-h-full flex-col">

      {/* ── Module header ───────────────────────────────────────────── */}
      <div className="border-b border-gray-100 bg-white px-6 py-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="text-[20px] font-bold text-gray-900">People & Permissions</h1>
          <div className="relative w-full sm:w-[260px]">
            <label htmlFor="people-permissions-section" className="sr-only">
              Select People & Permissions section
            </label>
            <select
              id="people-permissions-section"
              value={tab}
              onChange={event => changeTab(event.target.value as Tab)}
              className="h-10 w-full appearance-none rounded-lg border border-gray-200 bg-white px-3.5 pr-10 text-[13px] font-medium text-gray-800 shadow-sm outline-none transition-colors hover:border-gray-300 focus:border-brand focus:ring-2 focus:ring-brand/10"
            >
              {TABS.map(({ value, label }) => (
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

      {/* ── Tab content ─────────────────────────────────────────────── */}
      <div className="flex-1">
        {tab === 'organisation' && <OrgScreen   hideHeader />}
        {tab === 'users'        && <UsersScreen hideHeader />}
        {tab === 'roles'        && <RolesScreen hideHeader />}
      </div>
    </div>
  );
}
