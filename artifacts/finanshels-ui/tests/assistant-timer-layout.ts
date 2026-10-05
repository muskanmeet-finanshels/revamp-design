import { expect, type Page } from '@playwright/test';
import { composer, panel } from './assistant-fixture';

export const floatingTimer = (page: Page) => page.locator('[data-pms-floating-timer]');

export async function forceScrollbar(page: Page) {
  await page.addStyleTag({ content: 'html { overflow-y: scroll !important; } body { min-height: 2000px !important; } ::-webkit-scrollbar { width: 16px; }' });
}

export async function expectUsableAssistantAboveTimer(page: Page) {
  await expectUsableAssistant(page, true);
}

export async function expectUsableAssistant(page: Page, timerActive: boolean) {
  const chat = panel(page);
  const timer = floatingTimer(page);
  if (timerActive) await expect(timer).toBeVisible();
  else await expect(timer).toHaveCount(0);
  await expect(chat).toBeVisible();
  // Enable Send before hit-testing; disabled controls intentionally ignore
  // pointer events. Probe the interior, not transparent rounded corners.
  await composer(page).fill('Test-only timer layout question');
  // Poll actual geometry, not a sleep or the panel's CSS bottom value. This
  // waits for ResizeObserver, React layout, and timer hover transitions.
  await expect.poll(() => chat.evaluate((node, timerActive) => {
    const root = document.documentElement;
    const usableRight = Math.min(root.clientWidth, root.getBoundingClientRect().right);
    const bounds = node.getBoundingClientRect();
    const timerBounds = document.querySelector('[data-pms-floating-timer]')?.getBoundingClientRect();
    const controls = [
      node.querySelector('header'),
      node.querySelector('[aria-label="Chat options"]'),
      node.querySelector('[aria-label="Minimise chat"]'),
      node.querySelector('textarea[data-composer]'),
      node.querySelector('[aria-label="Send live question"]'),
    ];
    const inside = (r: DOMRect) => r.width > 0 && r.height > 0
      && r.left >= 0 && r.right <= usableRight
      && r.top >= 0 && r.bottom <= window.innerHeight;
    return {
      scrollbar: window.innerWidth > root.getBoundingClientRect().right,
      panelInsideViewport: inside(bounds),
      // Leave space for the 56px chevron plus 16px gaps above and below it.
       measuredTimerGap: timerActive
         ? !!timerBounds && Math.abs(timerBounds.top - bounds.bottom - 88) <= 1
         : !timerBounds && Math.abs(window.innerHeight - bounds.bottom - 96) <= 1,
      controlsInsidePanel: controls.every((control) => {
        if (!control) return false;
        const rect = control.getBoundingClientRect();
        return inside(rect) && rect.left >= bounds.left && rect.right <= bounds.right
          && rect.top >= bounds.top && rect.bottom <= bounds.bottom;
      }),
      controlsUnobscured: controls.slice(1).every((control) => {
        if (!control) return false;
        const r = control.getBoundingClientRect();
        return [[r.left + r.width / 2, r.top + r.height / 2], [r.left + r.width / 4, r.top + r.height / 2], [r.right - r.width / 4, r.top + r.height / 2]]
          .every(([x, y]) => control.contains(document.elementFromPoint(x, y)));
      }),
    };
  }, timerActive)).toEqual({
    scrollbar: true,
    panelInsideViewport: true,
    measuredTimerGap: true,
    controlsInsidePanel: true,
    controlsUnobscured: true,
  });
  await composer(page).click();
  await expect(composer(page)).toBeFocused();
  for (const name of ['Chat options', 'Minimise chat', 'Send live question']) {
    await chat.getByRole('button', { name, exact: true }).click({ trial: true });
  }
  await chat.getByRole('button', { name: 'Chat options', exact: true }).click();
  await chat.getByRole('menuitem', { name: 'Reset conversation', exact: true }).click({ trial: true });
  await chat.getByRole('menuitem', { name: /^(Expand|Collapse) window$/ }).click({ trial: true });
  await page.keyboard.press('Escape');
  await composer(page).focus();
}

export async function expectUsableLauncher(page: Page, timerActive: boolean) {
  const launcher = page.getByRole('button', { name: 'Open PMS assistant chat', exact: true });
  await expect(panel(page)).toHaveCount(0);
  if (timerActive) await expect(floatingTimer(page)).toBeVisible();
  else await expect(floatingTimer(page)).toHaveCount(0);
  await expect(launcher).toBeVisible();
  // Hover grows this button. Move away before comparing its settled bounds.
  await page.mouse.move(0, 0);
  await expect.poll(() => launcher.evaluate((node, active) => {
    const root = document.documentElement;
    const r = node.getBoundingClientRect();
    const timerBounds = document.querySelector('[data-pms-floating-timer]')?.getBoundingClientRect();
    return r.left >= 0 && r.top >= 0
      && r.right <= Math.min(root.clientWidth, root.getBoundingClientRect().right)
      && r.bottom <= window.innerHeight
      && (active ? !!timerBounds && Math.abs(timerBounds.top - r.bottom - 16) <= 1
        : !timerBounds && Math.abs(window.innerHeight - r.bottom - 24) <= 1)
      && node.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
  }, timerActive)).toBe(true);
  await launcher.click({ trial: true });
}
