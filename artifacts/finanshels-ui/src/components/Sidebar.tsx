'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronRight, ChevronLeft, ChevronDown, ChevronUp,
  LayoutGrid, Users2, ShieldCheck, Briefcase,
  ClipboardList, HelpCircle, Settings,
  FolderKanban, CheckSquare, Inbox, Timer, UsersRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';

/* ── Nav types ── */
type NavLeaf  = { kind: 'leaf';  label: string; href: string; icon: React.ReactNode };
type NavGroup = { kind: 'group'; label: string; icon: React.ReactNode; children: NavLeaf[] };
type NavEntry = NavLeaf | NavGroup;

/* ── Nav structure ── */
const NAV: NavEntry[] = [
  { kind: 'leaf',  label: 'Onboarding',           href: '/onboarding',  icon: <LayoutGrid   size={16} /> },
  { kind: 'leaf',  label: 'Clients',               href: '/clients',     icon: <Users2       size={16} /> },
  { kind: 'leaf',  label: 'Compliance Settings',   href: '/compliance',  icon: <ShieldCheck  size={16} /> },
  {
    kind: 'group', label: 'Workspace', icon: <Briefcase size={16} />,
    children: [
      { kind: 'leaf', label: 'Projects',  href: '/projects',  icon: <FolderKanban size={14} /> },
      { kind: 'leaf', label: 'Tasks',     href: '/tasks',     icon: <CheckSquare  size={14} /> },
      { kind: 'leaf', label: 'Requests',  href: '/requests',  icon: <Inbox        size={14} /> },
    ],
  },
  { kind: 'leaf', label: 'Timesheets', href: '/timesheets', icon: <Timer size={16} /> },
  { kind: 'leaf', label: 'Audit Trail', href: '/audit-trail', icon: <ClipboardList size={16} /> },
  { kind: 'leaf', label: 'People & Permissions', href: '/settings/people', icon: <UsersRound size={16} /> },
];

const BOTTOM: NavLeaf[] = [
  { kind: 'leaf', label: 'Help Center', href: '/help',     icon: <HelpCircle size={16} /> },
  { kind: 'leaf', label: 'Settings',   href: '/settings', icon: <Settings   size={16} /> },
];

/* ════════════════════════════════════════════════
   Expanded leaf link
   ════════════════════════════════════════════════ */
function ExpandedLeaf({ item, active, indent = false, onClick }: {
  item: NavLeaf; active: boolean; indent?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={() => onClick?.()}
      className={cn(
        'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors',
        indent && 'ml-6 pl-2.5',
        active
          ? 'bg-brand text-white'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
      )}
    >
      {!indent && (
        <span className={cn('flex-shrink-0', active ? 'text-white' : 'text-gray-400')}>
          {item.icon}
        </span>
      )}
      {item.label}
    </Link>
  );
}

/* ════════════════════════════════════════════════
   Expanded group
   ════════════════════════════════════════════════ */
function ExpandedGroup({ group, pathname, onClick }: {
  group: NavGroup; pathname: string;
  onClick?: () => void;
}) {
  const hasActive = group.children.some(c => pathname === c.href || pathname.startsWith(c.href + '/'));
  const [open, setOpen] = useState(hasActive || group.label === 'Workspace');

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-[13.5px] font-medium text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <span className="flex items-center gap-2.5">
          <span className="flex-shrink-0 text-gray-400">{group.icon}</span>
          {group.label}
        </span>
        {open
          ? <ChevronUp   size={13} className="text-gray-400" />
          : <ChevronDown size={13} className="text-gray-400" />}
      </button>
      {open && (
        <div className="mt-0.5 space-y-0.5 pb-1">
          {group.children.map(child => (
            <ExpandedLeaf
              key={child.href}
              item={child}
              active={pathname === child.href || pathname.startsWith(child.href + '/')}
              indent
              onClick={onClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════
   Collapsed icon button
   ════════════════════════════════════════════════ */
function CollapsedLeafBtn({ item, active }: {
  item: NavLeaf; active: boolean;
}) {
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={item.href}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
              active ? 'bg-brand text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800',
            )}
          >
            {item.icon}
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" className="rounded-md bg-gray-900 px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg">
          {item.label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function CollapsedGroupBtn({ group, pathname }: {
  group: NavGroup; pathname: string;
}) {
  const hasActive = group.children.some(c => pathname === c.href || pathname.startsWith(c.href + '/'));
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              aria-label={group.label}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
                hasActive ? 'bg-brand/10 text-brand' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800',
              )}
            >
              {group.icon}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="rounded-md bg-gray-900 px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg">
            {group.label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Flyout panel */}
      {open && (
        <div className="absolute left-[48px] top-0 z-50 min-w-[160px] rounded-xl border border-gray-200 bg-white py-2 shadow-xl">
          <div className="mb-1 px-3 pb-1 text-[11px] font-semibold uppercase tracking-widest text-gray-400 border-b border-gray-100">
            {group.label}
          </div>
          {group.children.map(child => {
            const active = pathname === child.href || pathname.startsWith(child.href + '/');
            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-[13px] font-medium transition-colors',
                  active ? 'text-brand' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
                )}
              >
                <span className={cn('flex-shrink-0', active ? 'text-brand' : 'text-gray-400')}>
                  {child.icon}
                </span>
                {child.label}
                {active && <ChevronRight size={12} className="ml-auto text-brand" />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════
   Main Sidebar component
   ════════════════════════════════════════════════ */
interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  open = false,
  onClose,
  collapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const pathname  = usePathname();

  return (
    <>
      {/* ── Sidebar panel ── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex flex-col border-r border-gray-200 bg-white',
          'transition-[width] duration-200 ease-in-out',
          collapsed ? 'lg:w-12' : 'lg:w-64',
          'w-[min(18rem,calc(100vw-1rem))]',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          'transition-[transform,width] duration-200 ease-in-out',
        )}
      >
        {/* Logo row */}
        <div className={cn(
          'flex h-[60px] flex-shrink-0 items-center border-b border-gray-100 transition-all duration-200',
          collapsed ? 'lg:justify-center lg:px-0 px-5' : 'px-5',
        )}>
          {collapsed && (
            <div className="hidden h-8 w-8 items-center justify-center rounded-lg bg-brand lg:flex">
              <span className="text-[15px] font-bold text-white">F</span>
            </div>
          )}
          <Image
            src="/finanshels-logo.png"
            alt="Finanshels"
            width={720}
            height={102}
            className={cn('h-[22px] w-auto transition-all duration-200', collapsed ? 'lg:hidden' : '')}
            priority
          />
        </div>

        {/* Nav */}
        <nav className={cn(
          'flex flex-1 flex-col overflow-y-auto overflow-x-hidden py-3',
          collapsed ? 'lg:px-[10px] lg:items-center px-3' : 'px-3',
        )}>
          <div className={cn('flex flex-col gap-0.5', collapsed ? 'lg:w-auto w-full' : 'w-full')}>
            {/* collapsed icons — desktop only */}
            {NAV.map((entry, i) => {
              if (!collapsed) return null;
              if (entry.kind === 'leaf') {
                const active = pathname === entry.href || pathname.startsWith(entry.href + '/');
                return (
                  <div key={entry.href} className="hidden lg:flex lg:justify-center">
                    <CollapsedLeafBtn item={entry} active={active} />
                  </div>
                );
              }
              return (
                <div key={i} className="hidden lg:flex lg:justify-center">
                  <CollapsedGroupBtn group={entry} pathname={pathname} />
                </div>
              );
            })}

            {/* expanded links — always on mobile, desktop only when not collapsed */}
            <div className={cn(collapsed ? 'lg:hidden' : '', 'flex flex-col gap-0.5')}>
              {NAV.map((entry, i) =>
                entry.kind === 'leaf' ? (
                  <ExpandedLeaf
                    key={entry.href}
                    item={entry}
                    active={pathname === entry.href || pathname.startsWith(entry.href + '/')}
                    onClick={onClose}
                  />
                ) : (
                  <ExpandedGroup
                    key={i}
                    group={entry}
                    pathname={pathname}
                    onClick={onClose}
                  />
                ),
              )}
            </div>
          </div>
        </nav>

        {/* Bottom nav */}
        <div className={cn(
          'flex-shrink-0 border-t border-gray-100 py-3',
          collapsed ? 'lg:px-[10px] lg:items-center px-3' : 'px-3',
        )}>
          <div className={cn('flex-col gap-0.5', collapsed ? 'hidden lg:flex lg:items-center' : 'hidden')}>
            {BOTTOM.map(item => (
              <CollapsedLeafBtn key={item.href} item={item} active={pathname === item.href} />
            ))}
          </div>
          <div className={cn('flex flex-col gap-0.5', collapsed ? 'lg:hidden' : '')}>
            {BOTTOM.map(item => (
              <ExpandedLeaf key={item.href} item={item} active={pathname === item.href} onClick={onClose} />
            ))}
          </div>
        </div>

        {/* Collapse toggle (desktop only) */}
        <button
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'absolute top-[48px] hidden lg:flex',
            'h-6 w-6 items-center justify-center rounded-full',
            'border border-gray-200 bg-white shadow-sm',
            'text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-colors',
            '-right-3',
          )}
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </aside>
    </>
  );
}
