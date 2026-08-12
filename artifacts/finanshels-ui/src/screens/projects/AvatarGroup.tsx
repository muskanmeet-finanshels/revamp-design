'use client';

import { Users2 } from 'lucide-react';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import type { TeamMember } from './mock-data';

const MAX_VISIBLE = 2;

/* ── Single avatar bubble ── */
function AvatarBubble({
  initials, name, size = 26,
}: { initials: string; name: string; size?: number }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          aria-label={name}
          style={{ width: size, height: size }}
          className="flex flex-shrink-0 cursor-default items-center justify-center rounded-full
                     bg-gray-100 text-brand ring-[1.5px] ring-white -ml-1 first:ml-0
                     hover:z-10 hover:ring-2 transition-all"
        >
          <span style={{ fontSize: size * 0.34 }} className="font-semibold leading-none select-none">
            {initials}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="rounded-md bg-[#082032] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg">
        {name}
      </TooltipContent>
    </Tooltip>
  );
}

/* ── +N overflow bubble ── */
function OverflowBubble({
  count, names, size = 26,
}: { count: number; names: string[]; size?: number }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          aria-label={`${count} more assignee${count === 1 ? '' : 's'}`}
          style={{ width: size, height: size }}
          className="flex flex-shrink-0 cursor-default items-center justify-center rounded-full
                     bg-gray-200 text-gray-700 ring-[1.5px] ring-white -ml-1
                     hover:z-10 hover:ring-2 transition-all"
        >
          <span style={{ fontSize: size * 0.32 }} className="font-semibold leading-none select-none">
            +{count}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="rounded-md bg-[#082032] px-2.5 py-2 text-[12px] font-medium text-white shadow-lg">
        <div className="flex flex-col gap-0.5">
          {names.map((name) => <span key={name}>{name}</span>)}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/* ── Empty placeholder when no members ── */
function EmptyAvatar({ size = 26 }: { size?: number }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            aria-label="Unassigned"
            style={{ width: size, height: size }}
            className="flex flex-shrink-0 cursor-default items-center justify-center rounded-full bg-gray-100 ring-[1.5px] ring-white"
          >
            <Users2 style={{ width: size * 0.45, height: size * 0.45 }} className="text-gray-400" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="rounded-md bg-[#082032] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg">
          Unassigned
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/* ══════════════════════════════════════════════════════ */
interface AvatarGroupProps {
  members: TeamMember[];
  size?: number;
  max?: number;
}

export function AvatarGroup({ members, size = 26, max = MAX_VISIBLE }: AvatarGroupProps) {
  if (members.length === 0) return <EmptyAvatar size={size} />;

  const visible  = members.slice(0, max);
  const overflow = members.slice(max);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex items-center pl-1">
      {visible.map((m, i) => (
          <AvatarBubble key={`${m.name}-${i}`} initials={m.initials} name={m.name} size={size} />
      ))}
      {overflow.length > 0 && (
        <OverflowBubble
          count={overflow.length}
          names={overflow.map(m => m.name)}
          size={size}
        />
      )}
      </div>
    </TooltipProvider>
  );
}
