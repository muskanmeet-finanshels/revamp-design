'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface EmptyProps {
  // Use React.FC<any> instead of LucideIcon to avoid React 18/19 peer type conflict
  icon: React.FC<any>;
  title: string;
  description?: string;
  className?: string;
}

export function Empty({ icon: Icon, title, description, className }: EmptyProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-24 px-6 text-center',
      className,
    )}>
      {/* Icon badge */}
      <div className="mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-2xl border border-orange-100 bg-orange-50 shadow-sm">
        <Icon size={30} className="text-brand" strokeWidth={1.5} />
      </div>

      {/* Heading */}
      <h3 className="mb-1.5 text-[15px] font-semibold text-gray-700">{title}</h3>

      {/* Description */}
      {description && (
        <p className="max-w-[340px] text-[13px] leading-relaxed text-gray-400">
          {description}
        </p>
      )}
    </div>
  );
}
