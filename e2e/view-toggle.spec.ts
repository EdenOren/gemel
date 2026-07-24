import { expect, test } from '@playwright/test';
import { gotoCompare, setViewMode, waitForResultsSettled } from './helpers';

test.describe('graph / table view toggle', () => {
  test.beforeEach(async ({ page }) => {
    await gotoCompare(page);
    // Switch to "by path" mode first: its primary selection is paths, which is also the
    // dropdown at DOM index 0 regardless of mode — selecting it in the default "by
    // company" mode would only fill the *secondary* filter and never satisfy
    // hasSelection(), leaving the results area on its hint text forever.
    await page.locator('.compare__tab', { hasText: 'לפי מסלול' }).click();
    const trigger = page.locator('.multiselect-dropdown__trigger').first();
    await trigger.click();
    // Select several paths, not just one — a single path can genuinely have zero funds
    // with reported data yet, which would make every assertion below about bars/rows
    // flaky through no fault of the app. Several paths across real, live data makes an
    // all-empty result implausible without masking a real regression.
    const items = page.locator('.multiselect-dropdown__item');
    const selectCount = Math.min(5, await items.count());
    for (let i = 0; i < selectCount; i++) {
      await items.nth(i).click();
    }
    await trigger.click();
    await waitForResultsSettled(page);

    const hasBars = (await page.locator('.comparison-bed__bar').count()) > 0;
    test.skip(!hasBars, 'none of the sampled paths had reported yield data on this run');
  });

  test('graph view is the default', async ({ page }) => {
    await expect(page.locator('.comparison-bed__bar').first()).toBeVisible();
    await expect(page.locator('.comparison-table__table')).toHaveCount(0);
  });

  test('switching to table view renders the same total row count as the graph', async ({ page }) => {
    // One table per selected group (path/company), same as one `.comparison-bed__group`
    // per group in graph view — with several paths selected (see beforeEach), there can
    // be more than one of each, so this compares totals across all of them.
    const graphRowCount = await page.locator('.comparison-bed__row').count();
    expect(graphRowCount).toBeGreaterThan(0);

    await setViewMode(page, 'טבלה');

    await expect(page.locator('.comparison-table__table').first()).toBeVisible();
    await expect(page.locator('.comparison-bed')).toHaveCount(0);
    await expect(page.locator('.comparison-table__table tbody tr')).toHaveCount(graphRowCount);
  });

  test('table header shows the resolved month, not just the generic period label', async ({ page }) => {
    await setViewMode(page, 'טבלה');

    const header = page.locator('.comparison-table__table thead th').nth(1);
    await expect(header).toContainText('חודשי');
    await expect(header.locator('.comparison-table__col-sub')).toBeVisible();
  });

  test('switching back to graph view restores the bars', async ({ page }) => {
    await setViewMode(page, 'טבלה');
    await setViewMode(page, 'גרף');

    await expect(page.locator('.comparison-bed__bar').first()).toBeVisible();
    await expect(page.locator('.comparison-table__table')).toHaveCount(0);
  });

  test('toggle survives switching compare mode', async ({ page }) => {
    await setViewMode(page, 'טבלה');
    await page.locator('.compare__tab', { hasText: 'לפי חברה' }).click();
    await expect(page.locator('.compare__view-btn', { hasText: 'טבלה' })).toHaveClass(/--active/);
  });
});
