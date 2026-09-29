import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('Tasks CSV uses the column order chosen in the download dialog', async ({ page }) => {
  await page.goto('/tasks');
  await expect(page.getByRole('heading', { name: 'Tasks', exact: true })).toBeVisible();
  const allCount = Number((await page.getByRole('tab', { name: /All Status/ }).innerText()).match(/\d+/)?.[0]);
  expect(allCount).toBeGreaterThan(0);
  const tableHeaders = await page.locator('thead th').allTextContents();

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

  const downloaded = page.waitForEvent('download');
  await dialog.getByRole('button', { name: `Download ${allCount} tasks` }).click();
  const file = await downloaded;
  expect(file.suggestedFilename()).toBe('tasks.csv');
  const csv = (await readFile(await file.path(), 'utf8')).replace(/^\uFEFF/, '');
  const rows = csv.trimEnd().split(/\r?\n/);
  expect(rows[0]).toBe('"Due Date","Status","Task"');
  expect(rows.slice(1)).toHaveLength(allCount);
  expect(rows.slice(1).every(row => !row.includes(',"Archived",'))).toBe(true);
  expect(await page.locator('thead th').allTextContents()).toEqual(tableHeaders);
});