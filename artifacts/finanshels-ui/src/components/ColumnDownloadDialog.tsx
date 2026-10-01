'use client';

import { useRef, useState, type DragEvent, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, Download, GripVertical } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { InfoTooltip } from '@/components/ui/info-tooltip';

interface Props<Key extends string> {
  item: 'project' | 'task';
  count: number;
  totalCount?: number;
  columns: Array<{ key: Key; label: string }>;
  defaultColumns: Key[];
  onClose: () => void;
  onConfirm: (columns: Key[]) => void;
  scopeDescription?: string;
  children?: ReactNode;
}

export function ColumnDownloadDialog<Key extends string>({
  item, count, totalCount, columns, defaultColumns, onClose, onConfirm, scopeDescription, children,
}: Props<Key>) {
  // Mounted afresh for each download; changes here never alter table visibility.
  const [selectedColumns, setSelectedColumns] = useState<Key[]>(() => {
    const available = new Set(columns.map(({ key }) => key));
    return [...new Set(defaultColumns.filter(key => available.has(key)))];
  });
  const [dropTarget, setDropTarget] = useState<Key | null>(null);
  const dragKey = useRef<Key | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const selected = new Set(selectedColumns);
  const otherColumns = columns.filter(({ key }) => !selected.has(key));
  const plural = item === 'project' ? 'projects' : 'tasks';

  function toggle(key: Key) {
    setSelectedColumns(previous =>
      previous.includes(key) ? previous.filter(column => column !== key) : [...previous, key],
    );
  }

  function move(from: Key, to: Key) {
    setSelectedColumns(previous => {
      const source = previous.indexOf(from);
      const destination = previous.indexOf(to);
      if (source < 0 || destination < 0 || source === destination) return previous;
      const next = [...previous];
      next.splice(source, 1);
      next.splice(destination, 0, from);
      return next;
    });
  }

  function startDrag(event: DragEvent, key: Key) {
    dragKey.current = key;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', key);
  }

  function endDrag() {
    dragKey.current = null;
    setDropTarget(null);
  }

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent
        className="max-h-[90vh] max-w-[540px] overflow-y-auto rounded-2xl p-6"
        onOpenAutoFocus={event => {
          event.preventDefault();
          titleRef.current?.focus();
        }}
      >
        <DialogHeader className="gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
            <Download size={20} className="text-brand" />
          </div>
          <DialogTitle ref={titleRef} tabIndex={-1} className="text-[16px] font-semibold text-gray-900 outline-none">
            Download {item === 'project' ? 'Projects' : 'Tasks'}
          </DialogTitle>
          <DialogDescription className="text-[13.5px] leading-relaxed text-gray-500">
            {totalCount === undefined
              ? `${count} ${count === 1 ? item : plural}`
              : `Showing ${count} of ${totalCount} ${totalCount === 1 ? item : plural}`}{' '}
            {scopeDescription ?? 'matching your current tab, search and filters across all pages.'}{' '}
            Choose and arrange the CSV columns. This won’t change your table view.
          </DialogDescription>
        </DialogHeader>
        {children}
        <div className="mt-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <span className="text-[12px] font-semibold text-gray-700">
                CSV columns <span className="font-normal text-gray-500">({selectedColumns.length} selected)</span>
              </span>
              <InfoTooltip label="About CSV columns">
                Choose the columns to include, then drag or use the arrows to arrange their CSV order.
                This won’t change your table view.
              </InfoTooltip>
            </div>
            <div className="flex items-center gap-3 text-[12px] font-medium">
              <button
                type="button"
                disabled={selectedColumns.length === columns.length}
                onClick={() => setSelectedColumns(previous => [
                  ...previous, ...columns.map(({ key }) => key).filter(key => !previous.includes(key)),
                ])}
                className="text-brand hover:text-brand-hover disabled:cursor-not-allowed disabled:text-gray-400"
              >
                Select all
              </button>
              <button
                type="button"
                disabled={selectedColumns.length === 0}
                onClick={() => setSelectedColumns([])}
                className="text-brand hover:text-brand-hover disabled:cursor-not-allowed disabled:text-gray-400"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="max-h-[min(300px,40vh)] overflow-y-auto overscroll-contain rounded-lg border border-gray-200 p-2">
            {selectedColumns.length > 0 && (
              <div className="mb-2">
                <p className="px-2 py-1 text-[11px] font-semibold text-gray-500">
                  Included in CSV
                </p>
                <div className="space-y-0.5">
                  {selectedColumns.map((key, index) => {
                    const label = columns.find(column => column.key === key)?.label ?? key;
                    return (
                      <div
                        key={key}
                        onDragOver={event => {
                          if (!dragKey.current) return;
                          event.preventDefault();
                          event.dataTransfer.dropEffect = 'move';
                          setDropTarget(key);
                        }}
                        onDrop={event => {
                          event.preventDefault();
                          if (dragKey.current) move(dragKey.current, key);
                          endDrag();
                        }}
                        className={`flex items-center gap-2 rounded-md px-2 py-1 text-[12.5px] text-gray-700 hover:bg-gray-50 ${dropTarget === key ? 'bg-orange-50 ring-1 ring-brand/40' : ''}`}
                      >
                        <span className="w-4 shrink-0 text-right text-[11px] text-gray-400">{index + 1}</span>
                        <span
                          draggable
                          onDragStart={event => startDrag(event, key)}
                          onDragEnd={endDrag}
                          title={`Drag ${label} to reorder`}
                          className="shrink-0 cursor-grab text-gray-400 hover:text-brand active:cursor-grabbing"
                        >
                          <GripVertical size={15} aria-hidden="true" />
                        </span>
                        <Checkbox id={`${item}-export-${key}`} checked onCheckedChange={() => toggle(key)} />
                        <label htmlFor={`${item}-export-${key}`} className="min-w-0 flex-1 cursor-pointer truncate">{label}</label>
                        <button
                          type="button"
                          aria-label={`Move ${label} up`}
                          disabled={index === 0}
                          onClick={() => move(key, selectedColumns[index - 1])}
                          className="rounded p-0.5 text-gray-500 hover:bg-orange-50 hover:text-brand disabled:cursor-not-allowed disabled:text-gray-300"
                        >
                          <ChevronUp size={15} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Move ${label} down`}
                          disabled={index === selectedColumns.length - 1}
                          onClick={() => move(key, selectedColumns[index + 1])}
                          className="rounded p-0.5 text-gray-500 hover:bg-orange-50 hover:text-brand disabled:cursor-not-allowed disabled:text-gray-300"
                        >
                          <ChevronDown size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {otherColumns.length > 0 && (
              <div>
                <p className="px-2 py-1 text-[11px] font-semibold text-gray-500">Other columns</p>
                <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
                  {otherColumns.map(({ key, label }) => (
                    <label key={key} htmlFor={`${item}-export-${key}`} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] text-gray-700 hover:bg-gray-50">
                      <Checkbox id={`${item}-export-${key}`} checked={false} onCheckedChange={() => toggle(key)} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          {selectedColumns.length === 0 && <p className="mt-1 text-[12px] text-gray-500">Select at least one column to download.</p>}
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
            Download {count} {count === 1 ? item : plural}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}