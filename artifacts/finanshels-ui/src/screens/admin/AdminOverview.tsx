'use client';

import Link from 'next/link';
import { ArrowRight, KeyRound, Shield, Users } from 'lucide-react';
import { useAccessControlContext } from '@/contexts/AccessControlContext';
import { useEmployeeGroupsContext } from '@/contexts/EmployeeGroupsContext';

const SECTIONS = [
  { label: 'Users', description: 'Manage users, role assignments, and reporting managers.', href: '/settings/users', icon: Users },
  { label: 'Roles', description: 'Create reusable access profiles for users.', href: '/settings/roles', icon: Shield },
  { label: 'Permissions', description: 'Configure module actions with Own, Reporting Team, or All scope.', href: '/settings/permissions', icon: KeyRound },
];

export function AdminOverview() {
  const { roles } = useAccessControlContext();
  const { users } = useEmployeeGroupsContext();

  const stats = [
    { label: 'Active users', value: users.filter(user => user.status === 'Active').length },
    { label: 'Active roles', value: roles.filter(role => role.status === 'Active').length },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-6 lg:px-8">
      <div className="mb-6">
        <h2 className="text-[20px] font-semibold text-gray-900">Access control overview</h2>
        <p className="mt-1 text-[13px] text-gray-500">
          Manage the path from user assignments to effective actions and data scope.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3">
        {stats.map(stat => (
          <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[22px] font-bold text-gray-900">{stat.value}</p>
            <p className="mt-0.5 text-[12px] text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {SECTIONS.map(({ label, description, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:border-brand/40"
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-orange-50 text-brand">
              <Icon size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold text-gray-900">{label}</span>
              <span className="mt-1 block text-[12.5px] leading-relaxed text-gray-500">{description}</span>
            </span>
            <ArrowRight size={16} className="mt-1 flex-shrink-0 text-gray-300 transition-colors group-hover:text-brand" />
          </Link>
        ))}
      </div>
    </div>
  );
}