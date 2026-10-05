import { expect, type Page } from '@playwright/test';
import { composer, panel } from './assistant-fixture';

export const floatingTimer = (page: Page) => page.locator('[data-pms-floating-timer]');

export async function forceScrollbar(page: Page) {
  await page.addStyleTag({ content: 'html { overflow-y: scroll !important; } body { min-height: 2000px !important; } ::-webkit-scrollbar { width: 16px; }' });
}

export async function expectUsableAssistantAboveTimer(page: Page) {
  const chat = panel(page);
  const timer = floatingTimer(page);
  await expect(timer).toBeVisible();
  await expect(chat).toBeVisible();
  // Enable Send before hit-testing; disabled controls intentionally ignore
  // pointer events. Probe the interior, not transparent rounded corners.
  await composer(page).fill('Test-only timer layout question');
  // Poll actual geometry, not a sleep or the panel's CSS bottom value. This
  // waits for ResizeObserver, React layout, and timer hover transitions.
  await expect.poll(() => chat.evaluate((node) => {
    const root = document.documentElement;
    const usableRight = Math.min(root.clientWidth, root.getBoundingClientRect().right);
    const bounds = node.getBoundingClientRect();
    const timerBounds = document.querySelector('[data-pms-floating-timer]')!.getBoundingClientRect();
    const controls = [
      node.querySelector('header'),
      node.querySelector('[aria-label="Reset conversation"]'),
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
      // Measured height should leave the intended 16px separation, not a
      // stale expanded/minimized offset that happens not to overlap.
      measuredTimerGap: Math.abs(timerBounds.top - bounds.bottom - 16) <= 1,
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
  })).toEqual({
    scrollbar: true,
    panelInsideViewport: true,
    measuredTimerGap: true,
    controlsInsidePanel: true,
    controlsUnobscured: true,
  });
  await composer(page).click();
  await expect(composer(page)).toBeFocused();
  for (const name of ['Reset conversation', 'Minimise chat', 'Send live question']) {
    await chat.getByRole('button', { name, exact: true }).click({ trial: true });
  }
}
