import { expect, test } from '@playwright/test';
import { gotoCompare, switchMode, waitForResultsSettled } from './helpers';

// The sticky summary bar and the scroll-to-top button both hang off one
// "scrolled past the filters" signal (Compare.scrolledPastFilters), so the suite
// drives them together: nothing is mocked, so the setup selects several real paths to
// make the results list long enough that the page actually scrolls.

const summaryBar = '.selection-summary-bar';
const summaryRegion = '.selection-summary-bar__summary';
const scrollTopBtn = '.compare__scroll-top';
const cornerToggle = '.app-theme-toggle';
const barToggle = '.selection-summary-bar .theme-toggle--bar';

async function scrollToBottom(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
}

test.describe('sticky selection summary + scroll-to-top', () => {
  test.beforeEach(async ({ page }) => {
    await gotoCompare(page);
    // "By path" mode: paths are the primary selection (dropdown at DOM index 0), the one
    // that satisfies hasSelection() and produces result rows. Same reasoning as
    // view-toggle.spec.ts.
    await switchMode(page, 'לפי מסלול');

    const trigger = page.locator('.multiselect-dropdown__trigger').first();
    await trigger.click();
    const items = page.locator('.multiselect-dropdown__item');
    const selectCount = Math.min(5, await items.count());
    for (let i = 0; i < selectCount; i++) {
      await items.nth(i).click();
    }
    await trigger.click();
    await waitForResultsSettled(page);

    // Need a genuinely scrollable page for the observer to ever fire; if this run's
    // sampled paths returned too little to overflow the viewport, there's nothing to test.
    const scrollable = await page.evaluate(
      () => document.documentElement.scrollHeight > window.innerHeight + 200,
    );
    test.skip(!scrollable, 'results did not fill enough to scroll on this run');
  });

  test('bar and button are absent at the top of the page', async ({ page }) => {
    await expect(page.locator(summaryBar)).toHaveCount(0);
    await expect(page.locator(scrollTopBtn)).toHaveCount(0);
    // The corner theme toggle is the one present while at the top.
    await expect(page.locator(cornerToggle)).toBeVisible();
  });

  test('scrolling past the filters reveals the bar with the current selection', async ({ page }) => {
    await scrollToBottom(page);

    await expect(page.locator(summaryBar)).toBeVisible();
    // The mode label is deterministic regardless of which live paths happened to load.
    await expect(page.locator(summaryBar)).toContainText('לפי מסלול');
    // At least one item chip resolved from the selected paths.
    await expect(page.locator(`${summaryBar} .selection-summary-bar__chip`).first()).toBeVisible();
    await expect(page.locator(scrollTopBtn)).toBeVisible();
    // The arrow was removed in favor of the theme toggle — the bar renders no arrow.
    await expect(page.locator('.selection-summary-bar__arrow')).toHaveCount(0);
  });

  test('the theme toggle moves into the bar while scrolled', async ({ page }) => {
    await scrollToBottom(page);

    // Corner toggle gone, the in-bar one takes over.
    await expect(page.locator(cornerToggle)).toHaveCount(0);
    await expect(page.locator(barToggle)).toBeVisible();

    // And it still toggles the theme from inside the bar.
    const root = page.locator('html');
    const before = await root.getAttribute('data-theme');
    await page.locator(barToggle).click();
    const after = before === 'dark' ? 'light' : 'dark';
    await expect(root).toHaveAttribute('data-theme', after);
    // Restore so storage state isn't mutated for whatever spec runs next.
    await page.locator(barToggle).click();
    await expect(root).toHaveAttribute('data-theme', before ?? 'light');
  });

  test('the brand logo moves into the bar while scrolled', async ({ page }) => {
    await scrollToBottom(page);
    // Corner header gone; the bar carries its own compact logo instead.
    await expect(page.locator('.compare__header')).toHaveCount(0);
    await expect(page.locator('.selection-summary-bar__logo')).toBeVisible();
  });

  test('clicking the scroll-to-top button returns to the top and hides the bar', async ({ page }) => {
    await scrollToBottom(page);
    await expect(page.locator(scrollTopBtn)).toBeVisible();

    await page.locator(scrollTopBtn).click();

    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(5);
    await expect(page.locator(summaryBar)).toHaveCount(0);
    await expect(page.locator(scrollTopBtn)).toHaveCount(0);
  });

  test('clicking the summary region scrolls back to the top', async ({ page }) => {
    await scrollToBottom(page);
    await expect(page.locator(summaryRegion)).toBeVisible();

    await page.locator(summaryRegion).click();

    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(5);
    await expect(page.locator(summaryBar)).toHaveCount(0);
  });
});
