'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { cn } from '@/lib/utils';
import { Shield, Users, KeyRound, Building2, UsersRound } from 'lucide-react';

const ADMIN_TABS = [
  { label: 'Users', href: '/settings/users', icon: Users },
  { label: 'Roles', href: '/settings/roles', icon: Shield },
  { label: 'Permissions', href: '/settings/permissions', icon: KeyRound },
  { label: 'Employee Groups', href: '/settings/employee-management', icon: UsersRound },
  { label: 'Organisation', href: '/settings/organisation', icon: Building2 },
];

export function AdminShell({ children, breadcrumbLabel }: { children: React.ReactNode, breadcrumbLabel: string }) {
  const pathname = usePathname();

  return (
    <AppShell
      breadcrumbs={[
        { label: 'Admin', href: '/settings/admin' },
        { label: breadcrumbLabel },
      ]}
    >
      <div className="flex h-full flex-col bg-white">
        <div className="border-b border-gray-200 bg-white px-4 pt-3 sm:px-6 sm:pt-4">
          <div className="-mx-4 flex gap-5 overflow-x-auto whitespace-nowrap px-4 sm:mx-0 sm:gap-6 sm:px-0">
            {ADMIN_TABS.map(tab => {
              const active = pathname === tab.href;
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    'flex items-center gap-2 pb-3 text-[13.5px] font-medium transition-colors border-b-2',
                    active ? 'border-brand text-brand' : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                  )}
                >
                  <Icon size={16} />
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </AppShell>
  );
}
