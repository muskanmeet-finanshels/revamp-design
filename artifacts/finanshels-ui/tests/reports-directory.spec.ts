import { expect, test } from '@playwright/test';

const REPORTS = [
  { id: 'pnl', name: 'Profit & loss (P&L)' },
  { id: 'balance-sheet', name: 'Balance sheet' },
  { id: 'ar-ageing', name: 'AR ageing' },
  { id: 'cash-flow', name: 'Cash flow' },
  { id: 'workspace', name: 'Report workspace' },
];

test('Reports is a five-destination directory with honest availability and keyboard-accessible details', async ({ page }) => {
  await page.goto('/reports');
  await expect(page).toHaveTitle(/Reports/);
  await expect(page.getByRole('heading', { name: 'Reports', exact: true })).toBeVisible();
  await expect(page.getByRole('complementary').getByRole('link', { name: 'Reports', exact: true })).toHaveAttribute('href', '/reports');
  await expect(page.getByRole('heading', { name: 'Standard Reports', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Build Your Own', exact: true })).toBeVisible();
  await expect(page.locator('[data-testid^="report-card-"]')).toHaveCount(5);
  await expect(page.locator('main').getByText('Not connected', { exact: true })).toHaveCount(5);
  await expect(page.locator('main').getByRole('combobox')).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText(/(?:[$₹€£]\s*\d|\b(?:July|August)\b|As of \d)/);

  for (const [index, report] of REPORTS.entries()) {
    const card = page.getByTestId(`report-card-${report.id}`);
    await expect(card).toHaveAttribute('aria-haspopup', 'dialog');
    await card.focus();
    await page.keyboard.press(index % 2 ? 'Space' : 'Enter');
    const dialog = page.getByRole('dialog', { name: report.name, exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('FinDelivery');
    await expect(dialog.getByText('Not connected', { exact: true })).toBeVisible();
    await expect(dialog).toContainText('Source information');
    await expect(dialog).toContainText('nothing is estimated from projects or tasks');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(card).toBeFocused();
    await expect(page).toHaveURL(/\/reports$/);
  }
});

test('Reports directory and availability details fit a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/reports');
  await expect(page.getByRole('heading', { name: 'Reports', exact: true })).toBeVisible();
  const cards = page.getByTestId('reports-standard').getByRole('button');
  await expect(cards).toHaveCount(4);
  const boxes = await cards.evaluateAll(elements => elements.map(element => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, top: rect.top };
  }));
  expect(boxes.every(box => box.left >= 0 && box.right <= 390)).toBe(true);
  expect(new Set(boxes.map(box => box.left)).size).toBe(1);
  expect(boxes.every((box, index) => index === 0 || box.top > boxes[index - 1].top)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByTestId('report-card-workspace').click();
  const dialog = page.getByRole('dialog', { name: 'Report workspace', exact: true });
  await expect(dialog).toBeVisible();
  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(dialog).toBeHidden();
});