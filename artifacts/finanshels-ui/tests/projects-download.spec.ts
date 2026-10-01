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
  await expect(dialog).toContainText(new RegExp(`Showing ${count} of \\d+ projects`));
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
  await expect(dialog).toContainText(`Showing ${allCount} of ${allCount} projects`);
  await expect(dialog.getByRole('combobox', { name: 'Saved filter', exact: true })).toContainText('Current view');
  await dialog.getByRole('button', { name: 'About saved filters', exact: true }).hover();
  await expect(page.getByRole('tooltip').filter({ hasText: 'No saved filters yet.' })).toBeVisible();
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

test('Projects download applies saved filters across All Status independently of the view tab and search', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('finanshels-projects-filters', JSON.stringify([
      {
        id: 'nexora-current', name: 'Nexora current projects', createdAt: 1,
        filters: { clients: ['Nexora'], projectStatuses: ['Current'] },
      },
      {
        id: 'no-results', name: 'High revenue projects', createdAt: 2,
        filters: { revenueCondition: 'Greater Than', revenueValue: '999999999' },
      },
      {
        id: 'audit-tag', name: 'Audit tagged projects', createdAt: 3,
        filters: { tags: ['Audit'] },
      },
      {
        id: 'finovo-view', name: 'Finovo portfolio', createdAt: 4, isDefault: true,
        filters: { clients: ['Finovo'] },
      },
    ]));
  });
  await page.goto('/projects?view=list');
  await expect(page.getByRole('heading', { name: 'Projects', exact: true })).toBeVisible();
  const totalAllStatusCount = Number((await page.getByRole('tab', { name: /All Status/ }).innerText()).match(/\d+/)?.[0]);
  await page.getByRole('button', { name: 'List View' }).click();
  await page.getByRole('button', { name: 'Filters' }).click();
  await page.getByRole('button', { name: 'All Client Name', exact: true }).click();
  await page.getByRole('button', { name: 'Finovo', exact: true }).click();
  await page.getByRole('button', { name: 'Apply Filter' }).click();
  await page.getByRole('tab', { name: /^Overdue/ }).click();
  await page.getByPlaceholder('Search by...').fill('Finovo');

  const activeTab = page.getByRole('tab', { name: /^Overdue/ });
  const listCount = Number((await activeTab.innerText()).match(/\d+/)?.[0]);
  expect(listCount).toBeGreaterThan(0);
  const listRows = await page.locator('tbody tr').allTextContents();
  const tableHeaders = await page.locator('thead th').allTextContents();
  const dialog = await openDownload(page, listCount);
  const savedFilter = dialog.getByRole('combobox', { name: 'Saved filter', exact: true });
  await expect(savedFilter).toContainText('Current view — Finovo portfolio');
  await expect(savedFilter.getByText('Default', { exact: true })).toBeVisible();
  await expect(dialog).toContainText(`Showing ${listCount} of ${totalAllStatusCount} projects`);
  await savedFilter.click();
  await expect(page.getByRole('option', { name: 'Nexora current projects', exact: true })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('saved-filter-menu.png') });
  await page.getByRole('option', { name: 'Nexora current projects', exact: true }).click();
  await expect(dialog).toContainText('matching “Nexora current projects”');
  await dialog.getByRole('button', { name: 'Clear', exact: true }).click();
  await dialog.getByRole('checkbox', { name: 'Client', exact: true }).check();
  await dialog.getByRole('checkbox', { name: 'Status', exact: true }).check();
  await dialog.getByRole('checkbox', { name: 'Project', exact: true }).check();
  const downloadButton = dialog.getByRole('button', { name: /^Download \d+ projects?$/ });
  const exportCount = Number((await downloadButton.innerText()).match(/\d+/)?.[0]);
  expect(exportCount).toBeGreaterThan(0);
  const rows = await downloadRows(page, exportCount);
  expect(rows[0]).toEqual(['Client', 'Status', 'Project']);
  expect(rows.slice(1).every(row => row[0] === 'Nexora' && row[1] === 'Current' && row[2].startsWith('Nexora- '))).toBe(true);
  expect(await page.locator('tbody tr').allTextContents()).toEqual(listRows);
  expect(await page.locator('thead th').allTextContents()).toEqual(tableHeaders);
  expect(Number((await activeTab.innerText()).match(/\d+/)?.[0])).toBe(listCount);
  await expect(activeTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByPlaceholder('Search by...')).toHaveValue('Finovo');

  // A fresh download starts from the current view, not the prior export filter.
  await openDownload(page, listCount);
  await expect(savedFilter).toContainText('Current view');
  await savedFilter.click();
  await page.getByRole('option', { name: 'High revenue projects', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Download 0 projects', exact: true })).toBeDisabled();
  await savedFilter.click();
  await page.getByRole('option', { name: /^Current view/ }).click();
  await expect(dialog.getByRole('button', { name: `Download ${listCount} projects`, exact: true })).toBeEnabled();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(await page.locator('tbody tr').allTextContents()).toEqual(listRows);

  await openDownload(page, listCount);
  await savedFilter.click();
  await page.getByRole('option', { name: 'All Status (no filters)', exact: true }).click();
  const allStatusCount = Number((await downloadButton.innerText()).match(/\d+/)?.[0]);
  expect(allStatusCount).toBe(totalAllStatusCount);
  expect(allStatusCount).toBeGreaterThan(listCount);
  await expect(dialog).toContainText(`Showing ${allStatusCount} of ${allStatusCount} projects`);
  await expect(dialog).toContainText('across All Status, without filters.');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();

  await openDownload(page, listCount);
  await savedFilter.click();
  await page.getByRole('option', { name: 'Audit tagged projects', exact: true }).click();
  await dialog.getByRole('button', { name: 'Clear', exact: true }).click();
  await dialog.getByRole('checkbox', { name: 'Tags', exact: true }).check();
  await dialog.getByRole('checkbox', { name: 'Project', exact: true }).check();
  const taggedCount = Number((await downloadButton.innerText()).match(/\d+/)?.[0]);
  expect(taggedCount).toBeGreaterThan(0);
  const taggedRows = await downloadRows(page, taggedCount);
  expect(taggedRows[0]).toEqual(['Tags', 'Project']);
  expect(taggedRows.slice(1).every(row => row[0].split(', ').includes('Audit'))).toBe(true);
  expect(await page.locator('tbody tr').allTextContents()).toEqual(listRows);
});