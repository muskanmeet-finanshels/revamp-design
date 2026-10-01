'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ColumnDownloadDialog } from '@/components/ColumnDownloadDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { useOrgContext } from '@/contexts/OrgContext';
import { TASK_EXPORT_COLUMNS, type TaskExportColumnKey } from './task-export';
import {
  EMPTY_TASK_FILTERS, countActiveTaskFilters, type SavedTaskFilter, type TaskFilterState,
} from './TaskFilterDrawer';
import {
  ALL_STATUS, CURRENT_VIEW, readSavedTaskFilters, sameTaskFilters, sanitizeSavedTaskFilter,
} from './task-saved-export-filters';

interface Props {
  count: number;
  totalCount: number;
  currentFilters: TaskFilterState;
  defaultColumns: TaskExportColumnKey[];
  onClose: () => void;
  onConfirm: (columns: TaskExportColumnKey[]) => void;
  onFilterChange: (filters: TaskFilterState | null) => void;
}

function DefaultBadge() {
  return (
    <span className="shrink-0 rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-brand">
      Default
    </span>
  );
}

export function TaskDownloadDialog({ currentFilters, onFilterChange, ...props }: Props) {
  const [savedFilters, setSavedFilters] = useState<SavedTaskFilter[]>([]);
  const [selectedId, setSelectedId] = useState(CURRENT_VIEW);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const { departments } = useOrgContext();
  const activeDepartmentIds = departments.filter(department => department.status === 'Active').map(department => department.id);
  const selectedFilter = savedFilters.find(filter => filter.id === selectedId);
  const matchingViewFilters = savedFilters.filter(filter =>
    sameTaskFilters(sanitizeSavedTaskFilter(filter.filters, activeDepartmentIds).sanitized, currentFilters),
  );
  const appliedSavedFilter = matchingViewFilters.find(filter => filter.isDefault) ?? matchingViewFilters[0];
  const currentViewLabel = appliedSavedFilter
    ? `Current view — ${appliedSavedFilter.name}`
    : countActiveTaskFilters(currentFilters) > 0 ? 'Current view — Custom filters' : 'Current view';

  useEffect(() => {
    try { setSavedFilters(readSavedTaskFilters()); }
    catch { setLoadError(true); }
    setLoaded(true);
  }, []);

  function selectFilter(id: string) {
    if (id === CURRENT_VIEW || id === ALL_STATUS) {
      setSelectedId(id);
      onFilterChange(id === CURRENT_VIEW ? null : EMPTY_TASK_FILTERS);
      return;
    }
    const savedFilter = savedFilters.find(filter => filter.id === id);
    if (!savedFilter) return;
    const { sanitized, removedByField } = sanitizeSavedTaskFilter(savedFilter.filters, activeDepartmentIds);
    if (Object.keys(removedByField).length > 0) {
      toast.warning('Unavailable options removed', {
        description: `${Object.keys(removedByField).join(', ')}. Check download count.`,
      });
    }
    setSelectedId(id);
    onFilterChange(sanitized);
  }

  return (
    <ColumnDownloadDialog
      {...props}
      item="task"
      columns={TASK_EXPORT_COLUMNS}
      scopeDescription={selectedFilter
        ? `matching “${selectedFilter.name}” across All Status.`
        : selectedId === ALL_STATUS ? 'across All Status, without filters.' : undefined}
    >
      <div className="mt-2 space-y-1.5">
        <div className="flex items-center gap-1">
          <label htmlFor="task-download-filter" className="text-[12px] font-semibold text-gray-700">
            Saved filter
          </label>
          <InfoTooltip label="About saved filters">
            {loadError
              ? 'Saved filters could not be loaded. You can still download the current view.'
              : loaded && savedFilters.length === 0
                ? 'No saved filters yet. Save one from the Tasks Filters panel.'
                : 'Current view starts with the filters already applied to your view. Choose a saved filter or All Status to filter all tasks independently of the current tab and search. Your table view won’t change.'}
          </InfoTooltip>
        </div>
        <Select value={selectedId} onValueChange={selectFilter} disabled={!loaded}>
          <SelectTrigger id="task-download-filter" className="text-[13px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={CURRENT_VIEW} textValue={currentViewLabel}>
              <span className="inline-flex items-center gap-1.5">
                <span>{currentViewLabel}</span>
                {appliedSavedFilter?.isDefault && <DefaultBadge />}
              </span>
            </SelectItem>
            <SelectItem value={ALL_STATUS}>All Status (no filters)</SelectItem>
            {savedFilters.map(filter => (
              <SelectItem key={filter.id} value={filter.id} textValue={filter.name}>
                <span className="inline-flex items-center gap-1.5">
                  <span>{filter.name}</span>
                  {filter.isDefault && <DefaultBadge />}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {loadError && (
          <span className="sr-only" role="alert">
            Saved filters could not be loaded. You can still download the current view.
          </span>
        )}
      </div>
    </ColumnDownloadDialog>
  );
}