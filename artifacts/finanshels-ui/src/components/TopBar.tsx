'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { Bell, Home, Menu } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface Crumb { label: string; href?: string }

interface TopBarProps {
  breadcrumbs: Crumb[];
  onMenuToggle: () => void;
  sidebarWidth?: number;
}

export function TopBar({ breadcrumbs, onMenuToggle, sidebarWidth = 240 }: TopBarProps) {
  return (
    <>
      {/* Mobile header — full width */}
      <header className="fixed left-0 right-0 top-0 z-20 flex h-[60px] items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 lg:hidden">
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          <button
            onClick={onMenuToggle}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
            aria-label="Toggle navigation"
          >
            <Menu size={18} className="text-gray-600" />
          </button>
          <div className="min-w-0 overflow-hidden">
            <Breadcrumbs crumbs={breadcrumbs} />
          </div>
        </div>
        <UserArea />
      </header>

      {/* Desktop header — starts at sidebar edge */}
      <header
        className="fixed right-0 top-0 z-20 hidden h-[60px] items-center justify-between border-b border-gray-200 bg-white px-6 lg:flex
                   transition-[left] duration-200 ease-in-out"
        style={{ left: sidebarWidth }}
      >
        <Breadcrumbs crumbs={breadcrumbs} />
        <UserArea />
      </header>
    </>
  );
}

function Breadcrumbs({ crumbs }: { crumbs: Array<{ label: string; href?: string }> }) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/projects" aria-label="Go to projects">
              <Home size={14} className="text-gray-400" />
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {crumbs.map((crumb, i) => {
          const isCurrent = i === crumbs.length - 1;
          return (
            <Fragment key={`${crumb.label}-${i}`}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isCurrent || !crumb.href ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    href={crumb.href}
                    className="underline-offset-2 hover:underline"
                  >
                    {crumb.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function UserArea() {
  return (
    <div className="flex flex-shrink-0 items-center gap-3 sm:gap-4">
      <button className="rounded-full p-1.5 hover:bg-gray-100 transition-colors">
        <Bell size={18} className="text-gray-500" />
      </button>
      <div className="h-6 w-px bg-gray-200" />
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-gray-300 to-gray-400 ring-2 ring-white">
          <div className="flex h-full w-full items-center justify-center text-[12px] font-bold text-white">WW</div>
        </div>
        <div className="hidden flex-col sm:flex">
          <span className="text-[13px] font-semibold text-gray-900 leading-tight">Wade Warren</span>
          <span className="text-[11px] text-gray-400 leading-tight">Finance Manager</span>
        </div>
      </div>
    </div>
  );
}
