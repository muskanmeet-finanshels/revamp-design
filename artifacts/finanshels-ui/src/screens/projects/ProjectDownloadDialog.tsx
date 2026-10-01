'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ColumnDownloadDialog } from '@/components/ColumnDownloadDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { useOrgContext } from '@/contexts/OrgContext';
import { PROJECT_EXPORT_COLUMNS, type ProjectExportColumnKey } from './project-export';
import { EMPTY_FILTERS, countActiveFilters, sanitizeSavedFilter, type FilterState, type SavedFilter } from './FilterDrawer';

interface Props {
  count: number;
  totalCount: number;
  currentFilters: FilterState;
  defaultColumns: ProjectExportColumnKey[];
  onClose: () => void;
  onConfirm: (columns: ProjectExportColumnKey[]) => void;
  onFilterChange: (filters: FilterState | null) => void;
}

const CURRENT_VIEW = 'current-view';
const ALL_STATUS = 'all-status';

function DefaultFilterBadge() {
  return (
    <span className="shrink-0 rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-brand">
      Default
    </span>
  );
}

function sameFilters(left: FilterState, right: FilterState): boolean {
  return (Object.keys(EMPTY_FILTERS) as Array<keyof FilterState>).every(key => {
    const a = left[key];
    const b = right[key];
    return Array.isArray(a) && Array.isArray(b)
      ? JSON.stringify([...a].sort()) === JSON.stringify([...b].sort())
      : a === b;
  });
}

// Support older saved filters with missing fields, but do not silently export
// a broader dataset when a stored field has the wrong shape.
function readSavedFilters(): SavedFilter[] {
  const parsed: unknown = JSON.parse(localStorage.getItem('finanshels-projects-filters') ?? '[]');
  if (!Array.isArray(parsed)) throw new Error('Invalid saved filters');
  const ids = new Set<string>();
  return parsed.map(entry => {
    if (!entry || typeof entry !== 'object'
      || typeof entry.id !== 'string' || !entry.id || ids.has(entry.id)
      || entry.id === CURRENT_VIEW || entry.id === ALL_STATUS
      || typeof entry.name !== 'string' || !entry.name.trim()
      || !entry.filters || typeof entry.filters !== 'object' || Array.isArray(entry.filters)) {
      throw new Error('Invalid saved filter');
    }
    ids.add(entry.id);
    const filters = Object.fromEntries(Object.entries(EMPTY_FILTERS).map(([key, fallback]) => {
      const value: unknown = entry.filters[key];
      if (value === undefined) return [key, Array.isArray(fallback) ? [] : fallback];
      if (Array.isArray(fallback)) {
        if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
          throw new Error('Invalid saved filter field');
        }
        return [key, value];
      }
      if (typeof value !== 'string') throw new Error('Invalid saved filter field');
      return [key, value];
    })) as unknown as FilterState;
    return {
      id: entry.id, name: entry.name, filters,
      createdAt: typeof entry.createdAt === 'number' ? entry.createdAt : 0,
      isDefault: entry.isDefault === true,
    };
  });
}

export function ProjectDownloadDialog({ onFilterChange, currentFilters, ...props }: Props) {
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [selectedId, setSelectedId] = useState(CURRENT_VIEW);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const { departments } = useOrgContext();
  const selectedFilter = savedFilters.find(filter => filter.id === selectedId);
  const activeDepartmentIds = departments.filter(department => department.status === 'Active').map(department => department.id);
  const matchingViewFilters = savedFilters.filter(filter =>
    sameFilters(sanitizeSavedFilter(filter.filters, activeDepartmentIds).sanitized, currentFilters),
  );
  const appliedSavedFilter = matchingViewFilters.find(filter => filter.isDefault) ?? matchingViewFilters[0];
  const currentViewLabel = appliedSavedFilter
    ? `Current view — ${appliedSavedFilter.name}`
    : countActiveFilters(currentFilters) > 0 ? 'Current view — Custom filters' : 'Current view';

  // The dialog mounts anew for each download, so newly saved, renamed and
  // deleted filters are picked up without changing the Projects page.
  useEffect(() => {
    try { setSavedFilters(readSavedFilters()); }
    catch { setLoadError(true); }
    setLoaded(true);
  }, []);

  function selectFilter(id: string) {
    if (id === CURRENT_VIEW) {
      setSelectedId(id);
      onFilterChange(null);
      return;
    }
    if (id === ALL_STATUS) {
      setSelectedId(id);
      onFilterChange(EMPTY_FILTERS);
      return;
    }
    const savedFilter = savedFilters.find(filter => filter.id === id);
    if (!savedFilter) return;
    const { sanitized, removedByField } = sanitizeSavedFilter(
      savedFilter.filters, departments.filter(department => department.status === 'Active').map(department => department.id),
    );
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
      item="project"
      columns={PROJECT_EXPORT_COLUMNS}
      scopeDescription={selectedFilter
        ? `matching “${selectedFilter.name}” across All Status.`
        : selectedId === ALL_STATUS
          ? 'across All Status, without filters.'
          : undefined}
    >
      <div className="mt-2 space-y-1.5">
        <div className="flex items-center gap-1">
          <label htmlFor="project-download-filter" className="text-[12px] font-semibold text-gray-700">
            Saved filter
          </label>
          <InfoTooltip label="About saved filters">
            {loadError
              ? 'Saved filters could not be loaded. You can still download the current view.'
              : loaded && savedFilters.length === 0
                ? 'No saved filters yet. Save one from the Projects Filters panel.'
                : 'Current view starts with the filters already applied to your view. Choose a saved filter or All Status to filter all projects independently of the current tab and search. Your table view won’t change.'}
          </InfoTooltip>
        </div>
        <Select value={selectedId} onValueChange={selectFilter} disabled={!loaded}>
          <SelectTrigger id="project-download-filter" className="text-[13px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={CURRENT_VIEW} textValue={currentViewLabel}>
              <span className="inline-flex items-center gap-1.5">
                <span>{currentViewLabel}</span>
                {appliedSavedFilter?.isDefault && <DefaultFilterBadge />}
              </span>
            </SelectItem>
            <SelectItem value={ALL_STATUS}>All Status (no filters)</SelectItem>
            {savedFilters.map(filter => (
              <SelectItem key={filter.id} value={filter.id} textValue={filter.name}>
                <span className="inline-flex items-center gap-1.5">
                  <span>{filter.name}</span>
                  {filter.isDefault && <DefaultFilterBadge />}
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