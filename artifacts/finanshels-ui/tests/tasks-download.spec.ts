import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

test.describe('Tasks column order persistence', () => {
  // A fresh context keeps this test independent of downloads or any saved storage state.
  // Do not clear storage in an init script: it would also erase the order on reload.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('Tasks keeps the complete reordered header sequence after reload', async ({ page }) => {
    // Both drag endpoints must stay visible to avoid horizontal auto-scrolling.
    await page.setViewportSize({ width: 1800, height: 900 });
    await page.goto('/tasks');
    await expect(page.getByRole('heading', { name: 'Tasks', exact: true })).toBeVisible();
    const headers = page.locator('thead th');
    // Wait for local storage hydration/persistence before interacting with the table.
    await expect.poll(() => page.evaluate(() => localStorage.getItem('fh_tasks_column_order')))
      .not.toBeNull();
    const initialHeaders = await headers.allTextContents();
    const projectIndex = initialHeaders.findIndex(header => header.trim() === 'Project');
    const dueDateIndex = initialHeaders.findIndex(header => header.trim() === 'Due Date');
    expect(projectIndex).toBeGreaterThan(0);
    expect(dueDateIndex).toBeGreaterThan(projectIndex);
    const expectedHeaders = [...initialHeaders];
    const [dueDateHeader] = expectedHeaders.splice(dueDateIndex, 1);
    expectedHeaders.splice(projectIndex, 0, dueDateHeader);

    await headers.filter({ hasText: /^Due Date$/ })
      .dragTo(headers.filter({ hasText: /^Project$/ }));
    await expect(headers).toHaveText(expectedHeaders);
    expect(expectedHeaders).not.toEqual(initialHeaders);
    // Verify the drag was saved before reloading; the browser retains this context's storage.
    await expect.poll(() => page.evaluate(() => {
      const order = JSON.parse(localStorage.getItem('fh_tasks_column_order') ?? '[]') as string[];
      return order.slice(0, 2);
    })).toEqual(['dueDate', 'project']);

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Tasks', exact: true })).toBeVisible();
    await expect(headers).toHaveText(expectedHeaders);
  });
});

test('Tasks CSV exports hidden column values in dialog order without changing the reordered table', async ({ page }) => {
  // Keep both drag endpoints in view so horizontal auto-scrolling cannot change the drop target.
  await page.setViewportSize({ width: 1800, height: 900 });
  await page.goto('/tasks');
  await expect(page.getByRole('heading', { name: 'Tasks', exact: true })).toBeVisible();
  const allCount = Number((await page.getByRole('tab', { name: /All Status/ }).innerText()).match(/\d+/)?.[0]);
  expect(allCount).toBeGreaterThan(0);
  const initialHeaders = await page.locator('thead th').allTextContents();
  const statusIndex = initialHeaders.findIndex(header => header.trim() === 'Status');
  expect(statusIndex).toBeGreaterThan(0);
  const visibleStatuses = await page.locator('tbody tr').evaluateAll((rows, index) =>
    rows.map(row => ({
      task: row.querySelectorAll('td')[1].textContent?.trim() ?? '',
      status: row.querySelectorAll('td')[index].textContent?.trim() ?? '',
    })), statusIndex);
  expect(visibleStatuses.length).toBeGreaterThan(0);
  expect(visibleStatuses.every(row => row.task && row.status)).toBe(true);

  await page.getByRole('button', { name: 'Select columns' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Status', exact: true }).click();
  await page.getByRole('button', { name: 'Select columns' }).click();
  const headers = page.locator('thead th');
  await headers.filter({ hasText: 'Due Date' }).dragTo(headers.filter({ hasText: 'Project' }));
  const tableHeaders = await headers.allTextContents();
  expect(tableHeaders).not.toEqual(initialHeaders);
  expect(tableHeaders.map(header => header.trim()).slice(1, 4)).toEqual(['Task', 'Due Date', 'Project']);
  expect(tableHeaders.some(header => header.trim() === 'Status')).toBe(false);

  await page.getByRole('button', { name: 'Download data' }).click();
  const dialog = page.getByRole('dialog', { name: 'Download Tasks' });
  await expect(dialog).toContainText(`${allCount} tasks matching`);
  await dialog.getByRole('button', { name: 'Clear', exact: true }).click();
  await dialog.getByRole('checkbox', { name: 'Task', exact: true }).check();
  await dialog.getByRole('checkbox', { name: 'Status', exact: true }).check();
  await dialog.getByRole('checkbox', { name: 'Due Date', exact: true }).check();
  await dialog.getByRole('button', { name: 'Move Status up' }).click();
  await dialog.getByTitle('Drag Due Date to reorder')
    .dragTo(dialog.getByRole('button', { name: 'Move Status up' }).locator('..'));

  const rows = await downloadRows(page, allCount);
  expect(rows[0]).toEqual(['Due Date', 'Status', 'Task']);
  expect(rows.slice(1).every(row => row[1] !== 'Archived')).toBe(true);
  for (const { task, status } of visibleStatuses) {
    const exported = rows.slice(1).filter(row => row[2] === task);
    expect(exported).toHaveLength(1);
    expect(exported[0][1]).toBe(status);
  }
  await expect(headers).toHaveText(tableHeaders);
});

// Read the browser's downloaded file, including quoted commas and the UTF-8 BOM.
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

async function openDownload(page: Page, count: number) {
  await page.getByRole('button', { name: 'Download data' }).click();
  const dialog = page.getByRole('dialog', { name: 'Download Tasks' });
  await expect(dialog).toContainText(`${count} ${count === 1 ? 'task' : 'tasks'} matching`);
  return dialog;
}

async function downloadRows(page: Page, count: number): Promise<string[][]> {
  const downloaded = page.waitForEvent('download');
  await page.getByRole('dialog', { name: 'Download Tasks' })
    .getByRole('button', { name: `Download ${count} ${count === 1 ? 'task' : 'tasks'}` }).click();
  const file = await downloaded;
  expect(file.suggestedFilename()).toBe('tasks.csv');
  const rows = parseCsv(await readFile(await file.path(), 'utf8'));
  expect(rows.slice(1)).toHaveLength(count);
  expect(rows.every(row => row.length === rows[0].length)).toBe(true);
  return rows;
}

type VisibleTask = { task: string; projects: string; status: string; comments: string; tags: string };

async function visibleTasks(page: Page): Promise<VisibleTask[]> {
  return page.locator('tbody tr').evaluateAll(rows => {
    const headings = Array.from(document.querySelectorAll('thead th'), th => th.textContent?.trim().toLowerCase() ?? '');
    const index = (label: string) => headings.findIndex(heading => heading === label);
    const cell = (row: Element, label: string) => row.querySelectorAll('td')[index(label)]?.textContent?.trim() ?? '';
    const tagsIndex = index('comments') + 1; // tags header is icon-only, after Comments
    return rows.map(row => ({
      task: cell(row, 'task'),
      projects: cell(row, 'project'),
      status: cell(row, 'status'),
      comments: cell(row, 'comments'),
      tags: row.querySelectorAll('td')[tagsIndex]?.querySelector('span')?.textContent?.trim() ?? '',
    }));
  });
}

test('Tasks CSV preserves reversed Task sort order across pages', async ({ page }) => {
  await page.goto('/tasks');
  await expect(page.getByRole('heading', { name: 'Tasks', exact: true })).toBeVisible();
  const allCount = Number((await page.getByRole('tab', { name: /All Status/ }).innerText()).match(/\d+/)?.[0]);
  expect(allCount).toBeGreaterThan(20);

  const taskSort = page.locator('thead').getByRole('button', { name: 'Task', exact: true });
  await taskSort.click(); // default is Due Date; first click sorts Task ascending
  await expect.poll(async () => {
    const names = (await visibleTasks(page)).map(row => row.task);
    return names.length > 1 && names.every((name, i) => i === 0 || names[i - 1].localeCompare(name) <= 0);
  }).toBe(true);
  const ascendingFirstPage = (await visibleTasks(page)).map(row => row.task);

  await taskSort.click(); // reverse Task sort to descending
  await expect.poll(async () => (await visibleTasks(page)).map(row => row.task))
    .not.toEqual(ascendingFirstPage);
  const expected: string[][] = [];
  for (;;) {
    expected.push(...(await visibleTasks(page)).map(({ task, projects }) => [task, projects]));
    const next = page.getByRole('button', { name: 'Next', exact: true });
    if (await next.isDisabled()) break;
    await next.click();
  }
  expect(expected).toHaveLength(allCount);
  expect(expected.map(row => row[0])).toEqual(
    expected.map(row => row[0]).sort((a, b) => b.localeCompare(a)),
  );

  const dialog = await openDownload(page, allCount);
  await dialog.getByRole('button', { name: 'Clear', exact: true }).click();
  await dialog.getByRole('checkbox', { name: 'Task', exact: true }).check();
  await dialog.getByRole('checkbox', { name: 'Projects', exact: true }).check();
  const rows = await downloadRows(page, allCount);
  expect(rows[0]).toEqual(['Task', 'Projects']);
  expect(rows.slice(1)).toEqual(expected);
});

test('Tasks CSV contains the filtered results across pages with independent columns and live comments/tags', async ({ page }) => {
  let downloads = 0;
  page.on('download', () => { downloads++; });
  await page.goto('/tasks');
  await expect(page.getByRole('heading', { name: 'Tasks', exact: true })).toBeVisible();

  // All Status has more than one page and must exclude Archived, even before filtering.
  const allTab = page.getByRole('tab', { name: /All Status/ });
  const allCount = Number((await allTab.innerText()).match(/\d+/)?.[0]);
  expect(allCount).toBeGreaterThan(10);
  let dialog = await openDownload(page, allCount);
  await dialog.getByRole('button', { name: 'Clear', exact: true }).click();
  await dialog.getByRole('checkbox', { name: 'Status', exact: true }).check();
  const allRows = await downloadRows(page, allCount);
  expect(allRows[0]).toEqual(['Status']);
  expect(allRows.slice(1).every(row => row[0] !== 'Archived')).toBe(true);
  await page.getByRole('combobox', { name: 'Rows per page' }).selectOption('10');
  await expect(page.getByRole('combobox', { name: 'Rows per page' })).toHaveValue('10');

  // Combine a drawer filter and toolbar search; expected rows come from the table,
  // not the exporter or its mock data source.
  await page.getByRole('button', { name: 'Filters' }).click();
  await page.getByRole('button', { name: 'Select clients...' }).click();
  await page.getByRole('listitem').filter({ hasText: 'Finovo' }).locator('label > span').first().click();
  await page.getByRole('button', { name: 'Apply Filter' }).click();
  await page.getByPlaceholder('Search by...').fill('Finovo');
  const filteredCount = Number((await allTab.innerText()).match(/\d+/)?.[0]);
  expect(filteredCount).toBeGreaterThan(10);
  await expect(page.locator('tbody tr')).toHaveCount(10);

  // Change a tag and a comment through the list itself to catch stale export values.
  const first = page.locator('tbody tr').first();
  const firstName = (await first.locator('td').nth(1).innerText()).trim();
  await first.getByRole('button', { name: 'Add Tags' }).click();
  await page.getByRole('dialog', { name: 'Add Tags' }).getByRole('combobox').click();
  await page.getByRole('option', { name: 'A1' }).click();
  await page.getByRole('dialog', { name: 'Add Tags' }).getByRole('button', { name: 'Save' }).click();
  const commentBefore = (await first.locator('td').nth(
    (await page.locator('thead th').allTextContents()).findIndex(h => h.trim() === 'Comments'),
  ).innerText()).trim();
  await first.locator('td').nth(
    (await page.locator('thead th').allTextContents()).findIndex(h => h.trim() === 'Comments'),
  ).getByRole('button').click();
  await page.getByPlaceholder('Write a comment…').fill('Download regression comment');
  await page.getByRole('button', { name: 'Add Comment' }).click();
  await expect(first).toBeVisible();
  await expect(first).toContainText(String(Number(commentBefore) + 1));
  await page.locator('div.fixed.inset-y-0.right-0').filter({ hasText: 'Comments' })
    .getByRole('button').first().click();

  const expected: VisibleTask[] = [];
  for (let pageNumber = 1; ; pageNumber++) {
    expected.push(...await visibleTasks(page));
    const next = page.getByRole('button', { name: 'Next', exact: true });
    if (await next.isDisabled()) break;
    await next.click();
  }
  expect(expected).toHaveLength(filteredCount);
  expect(expected.filter(row => row.task === firstName)).toHaveLength(1);
  expect(expected.find(row => row.task === firstName)).toMatchObject({
    comments: String(Number(commentBefore) + 1), tags: 'A1',
  });
  const headersBefore = await page.locator('thead th').allTextContents();

  dialog = await openDownload(page, filteredCount);
  await dialog.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(dialog.getByRole('button', { name: `Download ${filteredCount} tasks` })).toBeDisabled();
  await expect(dialog).toContainText('Select at least one column to download.');
  expect(downloads).toBe(1);
  for (const column of ['Task', 'Projects', 'Status', 'Comments', 'Tags']) {
    await dialog.getByRole('checkbox', { name: column, exact: true }).check();
  }
  const filteredRows = await downloadRows(page, filteredCount);
  expect(filteredRows[0]).toEqual(['Task', 'Projects', 'Status', 'Comments', 'Tags']);
  expect(filteredRows.slice(1)).toEqual(expected.map(({ task, projects, status, comments, tags }) =>
    [task, projects, status, comments, tags]));
  expect(await page.locator('thead th').allTextContents()).toEqual(headersBefore);
  expect(downloads).toBe(2);

  // Switching tabs with the same search/filter must change the exported set.
  const archivedTab = page.getByRole('tab', { name: /Archived/ });
  await archivedTab.click();
  const archivedCount = Number((await archivedTab.innerText()).match(/\d+/)?.[0]);
  expect(archivedCount).toBeGreaterThan(0);
  const archivedNames = (await visibleTasks(page)).map(row => row.task);
  expect(archivedNames).toHaveLength(archivedCount);
  dialog = await openDownload(page, archivedCount);
  await dialog.getByRole('button', { name: 'Clear', exact: true }).click();
  await dialog.getByRole('checkbox', { name: 'Task', exact: true }).check();
  await dialog.getByRole('checkbox', { name: 'Status', exact: true }).check();
  const archivedRows = await downloadRows(page, archivedCount);
  expect(archivedRows[0]).toEqual(['Task', 'Status']);
  expect(archivedRows.slice(1)).toEqual(archivedNames.map(name => [name, 'Archived']));
  expect(downloads).toBe(3);
});