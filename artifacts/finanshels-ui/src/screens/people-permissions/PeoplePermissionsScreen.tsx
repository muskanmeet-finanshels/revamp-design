'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
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
      <div className="border-b border-gray-100 bg-white px-6 pb-0 pt-6 lg:px-8">
        <div className="mb-4">
          <h1 className="text-[20px] font-bold text-gray-900">People & Permissions</h1>
          <p className="mt-0.5 text-[13.5px] text-gray-500">{current.description}</p>
        </div>

        {/* ── Line tabs ────────────────────────────────────────────── */}
        <div className="flex gap-0 overflow-x-auto scrollbar-none">
          {TABS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => changeTab(value)}
              className={cn(
                'relative flex-none whitespace-nowrap border-b-2 px-5 pb-3 pt-0.5 text-[13px] font-medium transition-colors focus:outline-none',
                tab === value
                  ? 'border-brand font-semibold text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700',
              )}
            >
              {label}
            </button>
          ))}
        </div>
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
