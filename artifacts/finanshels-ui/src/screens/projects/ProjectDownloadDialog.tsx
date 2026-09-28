import { ColumnDownloadDialog } from '@/components/ColumnDownloadDialog';
import { PROJECT_EXPORT_COLUMNS, type ProjectExportColumnKey } from './project-export';

interface Props {
  count: number;
  defaultColumns: ProjectExportColumnKey[];
  onClose: () => void;
  onConfirm: (columns: ProjectExportColumnKey[]) => void;
}

export function ProjectDownloadDialog(props: Props) {
  return <ColumnDownloadDialog {...props} item="project" columns={PROJECT_EXPORT_COLUMNS} />;
}