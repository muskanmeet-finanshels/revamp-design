import { expect, test, type Locator } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 720 } });

async function expectInsideViewport(element: Locator) {
  await expect(element).toBeVisible();
  await expect.poll(async () => element.evaluate(node => {
    const bounds = node.getBoundingClientRect();
    return bounds.top >= 0 && bounds.left >= 0
      && bounds.bottom <= window.innerHeight && bounds.right <= window.innerWidth;
  })).toBe(true);
}

test('scrolled Projects filters keep multi-select and single-select options clickable', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/projects', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Projects', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Filters' }).click();

  const drawer = page.locator('div.fixed.inset-y-0.right-0');
  const scrollArea = drawer.locator('.overflow-y-auto').first();
  const clientTrigger = drawer.getByText('Client Name', { exact: true }).locator('..').getByRole('button');

  await scrollArea.evaluate(node => { node.scrollTop = 200; });
  expect(await scrollArea.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
  await clientTrigger.click({ force: true });

  // The options live in a portal outside the scrollable drawer.
  const clientMenu = page.getByPlaceholder('Search client...').locator('xpath=ancestor::div[contains(@class, "fixed")][1]');
  const clientOption = clientMenu.getByRole('button', { name: 'Nexora', exact: true });
  await expectInsideViewport(clientMenu);
  await expectInsideViewport(clientOption);
  await clientOption.click();
  await expect(clientOption).toHaveAttribute('aria-pressed', 'true');
  await expect(clientTrigger).toContainText('Nexora');

  await clientTrigger.click({ force: true });
  const dueDateTrigger = drawer.getByText('Due Date', { exact: true }).locator('..').getByRole('button');
  await scrollArea.evaluate(node => { node.scrollTop = node.scrollHeight; });
  expect(await scrollArea.evaluate(node => node.scrollTop)).toBeGreaterThan(200);
  await dueDateTrigger.click({ force: true });

  const dueDateOption = page.getByRole('button', { name: 'This Week', exact: true });
  const dueDateMenu = dueDateOption.locator('xpath=ancestor::div[contains(@class, "fixed")][1]');
  await expectInsideViewport(dueDateMenu);
  await expectInsideViewport(dueDateOption);
  await dueDateOption.click();
  await expect(dueDateTrigger).toContainText('This Week');
  await expect(drawer.getByRole('button', { name: 'Apply Filter' })).toBeEnabled();
});