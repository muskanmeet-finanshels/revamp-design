'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { PROJECT_EXPORT_COLUMNS, type ProjectExportColumnKey } from './project-export';

interface Props {
  count: number;
  defaultColumns: ProjectExportColumnKey[];
  onClose: () => void;
  onConfirm: (columns: ProjectExportColumnKey[]) => void;
}

export function ProjectDownloadDialog({ count, defaultColumns, onClose, onConfirm }: Props) {
  // The dialog mounts on each download, so changes here never alter table visibility.
  const [selected, setSelected] = useState(() => new Set(defaultColumns));
  const selectedColumns = PROJECT_EXPORT_COLUMNS.filter(({ key }) => selected.has(key)).map(({ key }) => key);

  function toggle(key: ProjectExportColumnKey) {
    setSelected(previous => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-[540px] overflow-y-auto rounded-2xl p-6">
        <DialogHeader className="gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
            <Download size={20} className="text-brand" />
          </div>
          <DialogTitle className="text-[16px] font-semibold text-gray-900">Download Projects</DialogTitle>
          <DialogDescription className="text-[13.5px] leading-relaxed text-gray-500">
            {count} {count === 1 ? 'project' : 'projects'} matching your current tab, search and filters across all pages.
            Choose which columns to include in the CSV. This won’t change your table view.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[12px] font-semibold text-gray-700">
              CSV columns <span className="font-normal text-gray-500">({selected.size} selected)</span>
            </span>
            <div className="flex items-center gap-3 text-[12px] font-medium">
              <button
                type="button"
                disabled={selected.size === PROJECT_EXPORT_COLUMNS.length}
                onClick={() => setSelected(new Set(PROJECT_EXPORT_COLUMNS.map(({ key }) => key)))}
                className="text-brand hover:text-brand-hover disabled:cursor-not-allowed disabled:text-gray-400"
              >
                Select all
              </button>
              <button
                type="button"
                disabled={selected.size === 0}
                onClick={() => setSelected(new Set())}
                className="text-brand hover:text-brand-hover disabled:cursor-not-allowed disabled:text-gray-400"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="max-h-[min(300px,40vh)] overflow-y-auto overscroll-contain rounded-lg border border-gray-200 p-2">
            <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
              {PROJECT_EXPORT_COLUMNS.map(({ key, label }) => (
                <label key={key} htmlFor={`project-export-${key}`} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] text-gray-700 hover:bg-gray-50">
                  <Checkbox
                    id={`project-export-${key}`}
                    checked={selected.has(key)}
                    onCheckedChange={() => toggle(key)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          {selected.size === 0 && <p className="mt-1 text-[12px] text-gray-500">Select at least one column to download.</p>}
        </div>
        <DialogFooter className="mt-2 gap-2 sm:gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button
            type="button"
            disabled={count === 0 || selectedColumns.length === 0}
            onClick={() => onConfirm(selectedColumns)}
            className="flex-1 rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            Download {count} {count === 1 ? 'project' : 'projects'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}