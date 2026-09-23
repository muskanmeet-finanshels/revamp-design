type CsvValue = string | number | boolean | null | undefined;

function escapeCell(value: CsvValue): string {
  const text = value == null ? '' : String(value);
  // Prevent spreadsheet apps from evaluating user-entered text as a formula.
  const safeText = typeof value === 'string' && /^[\s\uFEFF]*[=+\-@]/.test(text)
    ? `'${text}`
    : text;
  return `"${safeText.replace(/"/g, '""')}"`;
}

export function downloadCsv(filename: string, headers: string[], rows: CsvValue[][]): void {
  const csv = [headers, ...rows].map(row => row.map(escapeCell).join(',')).join('\r\n');
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}