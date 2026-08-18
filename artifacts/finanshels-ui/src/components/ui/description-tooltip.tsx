'use client';

import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DescriptionTooltipProps {
  value?: string;
  className?: string;
}

export function DescriptionTooltip({ value, className }: DescriptionTooltipProps) {
  const text = value?.trim();

  if (!text) {
    return <span className={cn('text-[13px] text-gray-600', className)}>—</span>;
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('block max-w-[320px] cursor-default truncate text-[13px] text-gray-600', className)}>
            {text}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          sideOffset={6}
          className="max-w-[360px] rounded-md bg-[#082032] px-2.5 py-1.5 text-[12px] font-medium leading-relaxed text-white shadow-lg"
        >
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}