import { readFile } from 'node:fs/promises';
import { expect, test, type Download, type Page } from '@playwright/test';

// Parse the downloaded bytes, not the data passed into downloadCsv. CSV cells
// may contain commas and doubled quotes; the file also starts with a UTF-8 BOM.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const input = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && char === ',') {
      row.push(cell);
      cell = '';
    } else if (!quoted && (char === '\r' || char === '\n')) {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      if (char === '\r' && input[i + 1] === '\n') i++;
    } else {
      cell += char;
    }
  }
  if (cell || row.length) rows.push([...row, cell]);
  return rows;
}

async function downloadRows(page: Page, count: number): Promise<string[][]> {
  const dialog = page.getByRole('dialog', { name: 'Download Projects' });
  const downloaded = page.waitForEvent('download');
  await dialog.getByRole('button', { name: `Download ${count} ${count === 1 ? 'project' : 'projects'}` }).click();
  const file: Download = await downloaded;
  expect(file.suggestedFilename()).toBe('projects.csv');
  const rows = parseCsv(await readFile(await file.path(), 'utf8'));
  expect(rows.slice(1)).toHaveLength(count);
  expect(rows.every(row => row.length === rows[0].length)).toBe(true);
  return rows;
}

async function openDownload(page: Page, count: number) {
  await page.getByRole('button', { name: 'Download data' }).click();
  const dialog = page.getByRole('dialog', { name: 'Download Projects' });
  await expect(dialog).toContainText(`${count} ${count === 1 ? 'project' : 'projects'} matching`);
  return dialog;
}

test('Projects CSV respects filters across pages, export columns, and archived tab', async ({ page }) => {
  let downloads = 0;
  page.on('download', () => { downloads++; });
  await page.goto('/projects?view=list');
  await expect(page.getByRole('heading', { name: 'Projects', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'List View' }).click();
  await page.getByRole('combobox', { name: 'Rows per page' }).selectOption('10');

  // All Status must not leak archived records even before any search/filter.
  const allTab = page.getByRole('tab', { name: /All Status/ });
  const allCount = Number((await allTab.innerText()).match(/\d+/)?.[0]);
  expect(allCount).toBeGreaterThan(10);
  let dialog = await openDownload(page, allCount);
  await dialog.getByRole('button', { name: 'Clear', exact: true }).click();
  await dialog.getByRole('checkbox', { name: 'Status', exact: true }).check();
  const allRows = await downloadRows(page, allCount);
  expect(allRows[0]).toEqual(['Status']);
  expect(allRows.slice(1).every(row => row[0] !== 'Archived')).toBe(true);

  // Exercise the real drawer + search + pagination, not just an isolated exporter.
  await page.getByRole('button', { name: 'Filters' }).click();
  await page.getByRole('button', { name: 'All Project Status' }).click();
  await page.getByRole('button', { name: 'Current', exact: true }).click();
  await page.getByRole('button', { name: 'Apply Filter' }).click();
  await page.getByPlaceholder('Search by...').fill('Review');
  const filteredCount = Number((await allTab.innerText()).match(/\d+/)?.[0]);
  expect(filteredCount).toBeGreaterThan(10);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  const secondPageNames = await page.locator('tbody tr td:nth-child(2)').allTextContents();
  expect(secondPageNames.length).toBeGreaterThan(0);
  expect(secondPageNames.length).toBeLessThan(filteredCount);
  const tableHeaders = await page.locator('thead th').allTextContents();

  dialog = await openDownload(page, filteredCount);
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).not.toBeVisible();
  expect(downloads).toBe(1);

  dialog = await openDownload(page, filteredCount);
  await dialog.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(dialog.getByRole('button', { name: /^Download \d+ projects$/ })).toBeDisabled();
  expect(downloads).toBe(1);
  await dialog.getByRole('checkbox', { name: 'Project', exact: true }).check();
  await dialog.getByRole('checkbox', { name: 'Client', exact: true }).check();
  await dialog.getByRole('checkbox', { name: 'Tasks Completed' }).check();
  await dialog.getByRole('button', { name: 'Move Tasks Completed up' }).click();
  const filteredRows = await downloadRows(page, filteredCount);
  expect(filteredRows[0]).toEqual(['Project', 'Tasks Completed', 'Client']);
  expect(filteredRows.slice(1).every(row => row[0].includes('Review') && row[0].startsWith(`${row[2]}- `) && /^\d+$/.test(row[1]))).toBe(true);
  for (const name of secondPageNames) {
    expect(filteredRows.slice(1).map(row => row[0])).toContain(name.trim());
  }
  expect(await page.locator('thead th').allTextContents()).toEqual(tableHeaders);

  // A fresh view removes temporary filters; archived rows belong only here.
  await page.reload();
  await page.getByRole('tab', { name: /Archived/ }).click();
  const archivedTab = page.getByRole('tab', { name: /Archived/ });
  const archivedCount = Number((await archivedTab.innerText()).match(/\d+/)?.[0]);
  expect(archivedCount).toBeGreaterThan(0);
  dialog = await openDownload(page, archivedCount);
  await dialog.getByRole('button', { name: 'Clear', exact: true }).click();
  await dialog.getByRole('checkbox', { name: 'Status', exact: true }).check();
  const archivedRows = await downloadRows(page, archivedCount);
  expect(archivedRows[0]).toEqual(['Status']);
  expect(archivedRows.slice(1).every(row => row[0] === 'Archived')).toBe(true);
  expect(downloads).toBe(3);
});