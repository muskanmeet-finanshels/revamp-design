import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

test.describe('Tasks column order persistence', () => {
  // A fresh context keeps these tests independent of downloads or any saved storage state.
  // Do not clear storage in an init script: it would also erase the order on reload.
  test.use({ storageState: { cookies: [], origins: [] } });

  const columnLabels = {
    project: 'Project',
    assignee: 'Assignee',
    reassignmentNote: 'Reassignment Note',
    dueDate: 'Due Date',
    status: 'Status',
    timeSpent: 'Time Spent',
    timer: 'Timer',
    comments: 'Comments',
    tags: '', // Tags intentionally has an unlabelled table header.
    action: 'Action',
    adhoc: 'Adhoc',
    frequency: 'Frequency',
    createdDate: 'Created Date',
    lastUpdated: 'Last Updated',
  };
  type ColumnKey = keyof typeof columnLabels;
  const allColumns = Object.keys(columnLabels) as ColumnKey[];
  const defaultVisibleColumns = allColumns.slice(0, 10);
  const recoveryCases: Array<{ name: string; saved: string; retained: ColumnKey[] }> = [
    { name: 'malformed JSON', saved: '["dueDate",', retained: [] },
    {
      name: 'duplicate column keys',
      saved: JSON.stringify(['status', 'dueDate', 'status', 'project', 'dueDate', 'lastUpdated']),
      retained: ['status', 'dueDate', 'project', 'lastUpdated'],
    },
    {
      name: 'unknown and non-string column keys',
      saved: JSON.stringify(['lastUpdated', 'removedColumn', null, 'comments', 42, {}, 'project']),
      retained: ['lastUpdated', 'comments', 'project'],
    },
    {
      name: 'an older order missing newly available columns',
      saved: JSON.stringify(['dueDate', 'project', 'status', 'assignee', 'reassignmentNote',
        'timeSpent', 'timer', 'comments', 'tags', 'action']),
      retained: ['dueDate', 'project', 'status', 'assignee', 'reassignmentNote',
        'timeSpent', 'timer', 'comments', 'tags', 'action'],
    },
    { name: 'an order with no known columns', saved: '["removedColumn", null, 42]', retained: [] },
    { name: 'a non-array JSON value', saved: '{"project":true}', retained: [] },
  ];

  for (const { name, saved, retained } of recoveryCases) {
    test(`Tasks recovers a complete column order from ${name}`, async ({ page }) => {
      // Seed before hydration, but never overwrite the repaired order on reload.
      await page.addInitScript(value => {
        if (localStorage.getItem('fh_tasks_column_order') === null) {
          localStorage.setItem('fh_tasks_column_order', value);
        }
      }, saved);
      const expectedOrder = [
        ...retained,
        ...allColumns.filter(key => !retained.includes(key)),
      ];
      await page.goto('/tasks');

      for (const phase of ['initial load', 'reload']) {
        await test.step(phase, async () => {
          await expect(page.getByRole('heading', { name: 'Tasks', exact: true })).toBeVisible();
          // Exact equality checks completeness, uniqueness, relative order, and persistence.
          await expect.poll(() => page.evaluate(() =>
            localStorage.getItem('fh_tasks_column_order'),
          )).toBe(JSON.stringify(expectedOrder));
          await expect(page.locator('thead th[draggable="true"]')).toHaveText(
            expectedOrder.filter(key => defaultVisibleColumns.includes(key))
              .map(key => columnLabels[key]),
          );
          await expect(page.locator('tbody tr').first()).toBeVisible();

          // Include normally hidden/new columns so storage alone cannot mask a rendering bug.
          await page.getByRole('button', { name: 'Select columns' }).click();
          await page.getByRole('dialog').getByRole('button', { name: 'Select All', exact: true }).click();
          await page.getByRole('button', { name: 'Select columns' }).click();
          await expect(page.locator('thead th[draggable="true"]')).toHaveText(
            expectedOrder.map(key => columnLabels[key]),
          );
          await expect(page.locator('tbody tr').first().locator('td')).toHaveCount(allColumns.length + 2);
        });
        if (phase === 'initial load') await page.reload();
      }
    });
  }

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

test('Tasks CSV defaults to the visible table columns in their customized order, excluding table-only controls', async ({ page }) => {
  // Keep both drag endpoints visible to avoid horizontal auto-scrolling during the drop.
  await page.setViewportSize({ width: 1800, height: 900 });
  await page.goto('/tasks');
  await expect(page.getByRole('heading', { name: 'Tasks', exact: true })).toBeVisible();
  const allCount = Number((await page.getByRole('tab', { name: /All Status/ }).innerText()).match(/\d+/)?.[0]);
  expect(allCount).toBeGreaterThan(0);

  await page.getByRole('button', { name: 'Select columns' }).click();
  const columns = page.getByRole('dialog');
  await columns.getByRole('button', { name: 'Status', exact: true }).click();
  await columns.getByRole('button', { name: 'Frequency', exact: true }).click();
  await page.getByRole('button', { name: 'Select columns' }).click();
  const headers = page.locator('thead th');
  await headers.filter({ hasText: 'Due Date' }).dragTo(headers.filter({ hasText: 'Project' }));
  const tableHeaders = await headers.allTextContents();
  expect(tableHeaders.map(header => header.trim()).slice(1, 4)).toEqual(['Task', 'Due Date', 'Project']);
  expect(tableHeaders.map(header => header.trim())).not.toContain('Status');
  expect(tableHeaders.map(header => header.trim())).toContain('Frequency');
  expect(tableHeaders.map(header => header.trim())).toContain('Timer');

  const expectedColumns = [
    'Task', 'Due Date', 'Projects', 'Assignee', 'Reassignment Note',
    'Time Spent (seconds)', 'Comments', 'Tags', 'Frequency',
  ];
  const dialog = await openDownload(page, allCount);
  // Do not clear, toggle, or reorder anything in the export dialog: its defaults are under test.
  const checked = dialog.getByRole('checkbox', { checked: true });
  await expect(checked).toHaveCount(expectedColumns.length);
  for (const [index, label] of expectedColumns.entries()) {
    await expect(checked.nth(index)).toHaveAccessibleName(label);
    await expect(dialog.getByRole('checkbox', { name: label, exact: true })).toBeChecked();
  }
  for (const label of ['Status', 'Adhoc', 'Created Date', 'Last Updated', 'Priority']) {
    await expect(dialog.getByRole('checkbox', { name: label, exact: true })).not.toBeChecked();
  }
  for (const label of ['Timer', 'Action', 'Select all tasks']) {
    await expect(dialog.getByRole('checkbox', { name: label, exact: true })).toHaveCount(0);
  }

  const rows = await downloadRows(page, allCount);
  expect(rows[0]).toEqual(expectedColumns);
  await expect(headers).toHaveText(tableHeaders);
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
  await expect(dialog).toContainText(`Showing ${allCount} of ${allCount} tasks`);
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
  await expect(dialog).toContainText(new RegExp(`Showing ${count} of \\d+ tasks`));
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

test('Tasks download applies saved filters across All Status without changing the view', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('finanshels-tasks-filters', JSON.stringify([
      { id: 'finovo-view', name: 'Finovo portfolio', isDefault: true, createdAt: 1, filters: { clients: ['Finovo'] } },
      { id: 'nexora-done', name: 'Nexora completed tasks', createdAt: 2, filters: { clients: ['Nexora'], taskStatuses: ['Done'] } },
      { id: 'no-results', name: 'Future tasks', createdAt: 3, filters: {
        dueDateFilter: 'Custom Date Range', dueDateStart: '2099-01-01', dueDateEnd: '2099-01-31',
      } },
    ]));
  });
  await page.goto('/tasks');
  await expect(page.getByRole('heading', { name: 'Tasks', exact: true })).toBeVisible();
  const allTab = page.getByRole('tab', { name: /All Status/ });
  const total = Number((await allTab.innerText()).match(/\d+/)?.[0]);
  expect(total).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await page.getByRole('button', { name: 'Select clients...' }).click();
  await page.getByRole('listitem').filter({ hasText: 'Finovo' }).locator('label > span').first().click();
  await page.getByRole('button', { name: 'Apply Filter' }).click();
  const onHoldTab = page.getByRole('tab', { name: /^On Hold/ });
  await onHoldTab.click();
  await page.getByPlaceholder('Search by...').fill('Finovo');
  const currentCount = Number((await onHoldTab.innerText()).match(/\d+/)?.[0]);
  expect(currentCount).toBeGreaterThan(0);
  const beforeRows = await page.locator('tbody tr').allTextContents();
  const beforeHeaders = await page.locator('thead th').allTextContents();
  const beforeAllCount = await allTab.innerText();

  const dialog = await openDownload(page, currentCount);
  await expect(dialog).toContainText(`Showing ${currentCount} of ${total} tasks`);
  const select = dialog.getByRole('combobox', { name: 'Saved filter', exact: true });
  await expect(select).toContainText('Current view — Finovo portfolio');
  await expect(select.getByText('Default', { exact: true })).toBeVisible();
  await select.click();
  const defaultOption = page.getByRole('option', { name: /^Finovo portfolio/ });
  await expect(defaultOption.getByText('Default', { exact: true })).toBeVisible();
  await page.getByRole('option', { name: 'Nexora completed tasks', exact: true }).click();
  await expect(dialog).toContainText('matching “Nexora completed tasks” across All Status.');
  await dialog.getByRole('button', { name: 'Clear', exact: true }).click();
  for (const label of ['Status', 'Task', 'Projects']) {
    await dialog.getByRole('checkbox', { name: label, exact: true }).check();
  }
  await dialog.getByRole('button', { name: 'Move Projects up' }).click();
  const downloadButton = dialog.getByRole('button', { name: /^Download \d+ tasks?$/ });
  const exportCount = Number((await downloadButton.innerText()).match(/\d+/)?.[0]);
  expect(exportCount).toBeGreaterThan(0);
  await expect(dialog).toContainText(`Showing ${exportCount} of ${total} tasks`);
  await page.screenshot({ path: test.info().outputPath('tasks-saved-filter-download.png') });
  const rows = await downloadRows(page, exportCount);
  expect(rows[0]).toEqual(['Status', 'Projects', 'Task']);
  expect(rows.slice(1).every(row => row[0] === 'Done' && row[1].includes('Nexora- '))).toBe(true);
  expect(await page.locator('tbody tr').allTextContents()).toEqual(beforeRows);
  expect(await page.locator('thead th').allTextContents()).toEqual(beforeHeaders);
  expect(await allTab.innerText()).toBe(beforeAllCount);
  await expect(onHoldTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByPlaceholder('Search by...')).toHaveValue('Finovo');

  await openDownload(page, currentCount);
  await expect(select).toContainText('Current view — Finovo portfolio');
  await select.click();
  await page.getByRole('option', { name: 'Future tasks', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Download 0 tasks', exact: true })).toBeDisabled();
  await expect(dialog).toContainText(`Showing 0 of ${total} tasks`);
  await select.click();
  await page.getByRole('option', { name: 'All Status (no filters)', exact: true }).click();
  await expect(dialog).toContainText(`Showing ${total} of ${total} tasks`);
  await expect(dialog.getByRole('button', { name: `Download ${total} tasks`, exact: true })).toBeEnabled();
  await select.click();
  await page.getByRole('option', { name: /^Current view/ }).click();
  await expect(dialog).toContainText(`Showing ${currentCount} of ${total} tasks`);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(await page.locator('tbody tr').allTextContents()).toEqual(beforeRows);

  // An empty current view can still open the modal and choose another export filter.
  await page.getByPlaceholder('Search by...').fill('no-task-can-match-this-search');
  await openDownload(page, 0);
  await expect(dialog.getByRole('button', { name: 'Download 0 tasks', exact: true })).toBeDisabled();
  await select.click();
  await page.getByRole('option', { name: 'Nexora completed tasks', exact: true }).click();
  await expect(dialog.getByRole('button', { name: `Download ${exportCount} tasks`, exact: true })).toBeEnabled();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
});

for (const [name, saved] of [
  ['malformed JSON', '[broken'],
  ['invalid filter fields', JSON.stringify([{ id: 'broken', name: 'Broken filter', filters: { clients: 42 } }])],
]) {
  test(`Tasks download reports ${name} without blocking the current view`, async ({ page }) => {
    await page.addInitScript(value => localStorage.setItem('finanshels-tasks-filters', value), saved);
    await page.goto('/tasks');
    const total = Number((await page.getByRole('tab', { name: /All Status/ }).innerText()).match(/\d+/)?.[0]);
    const dialog = await openDownload(page, total);
    await expect(dialog.getByRole('combobox', { name: 'Saved filter', exact: true })).toContainText('Current view');
    await expect(dialog.getByRole('alert')).toContainText('Saved filters could not be loaded.');
    await dialog.getByRole('button', { name: 'About saved filters', exact: true }).hover();
    await expect(page.getByRole('tooltip').filter({ hasText: 'Saved filters could not be loaded.' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: `Download ${total} tasks`, exact: true })).toBeEnabled();
  });
}

test('Tasks download warns when unavailable saved filter options are removed', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('finanshels-tasks-filters', JSON.stringify([
    { id: 'stale', name: 'Old department tasks', filters: { clients: ['Nexora'], departments: ['removed-department'] } },
  ])));
  await page.goto('/tasks');
  const total = Number((await page.getByRole('tab', { name: /All Status/ }).innerText()).match(/\d+/)?.[0]);
  const dialog = await openDownload(page, total);
  await dialog.getByRole('combobox', { name: 'Saved filter', exact: true }).click();
  await page.getByRole('option', { name: 'Old department tasks', exact: true }).click();
  await expect(page.getByText('Unavailable options removed', { exact: true })).toBeVisible();
  await expect(page.getByText('Department. Check download count.', { exact: true })).toBeVisible();
  await expect(dialog).toContainText('matching “Old department tasks” across All Status.');
});