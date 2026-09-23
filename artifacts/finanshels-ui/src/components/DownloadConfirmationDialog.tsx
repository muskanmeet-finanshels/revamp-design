'use client';

import { Download } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: 'project' | 'task';
  count: number;
  onConfirm: () => void;
}

export function DownloadConfirmationDialog({ open, onOpenChange, item, count, onConfirm }: Props) {
  const label = `${count} ${count === 1 ? item : `${item}s`}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] rounded-2xl p-6">
        <DialogHeader className="gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
            <Download size={20} className="text-brand" />
          </div>
          <DialogTitle className="text-[16px] font-semibold text-gray-900">
            Download {item === 'project' ? 'Projects' : 'Tasks'}
          </DialogTitle>
          <DialogDescription className="text-[13.5px] leading-relaxed text-gray-500">
            Download {label} matching your current filters across all pages as a CSV file?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-2 gap-2 sm:gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={count === 0}
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            Download CSV
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}