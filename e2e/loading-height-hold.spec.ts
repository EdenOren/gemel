import { expect, test } from '@playwright/test';
import { COMPANY_DROPDOWN, dropdownTrigger, gotoCompare, resultsContainer, waitForResultsSettled } from './helpers';

test('results container height is held at its last real value while a reload is in flight', async ({ page }) => {
  await gotoCompare(page);

  const companyTrigger = dropdownTrigger(page, COMPANY_DROPDOWN);
  await companyTrigger.click();
  await page.locator('.multiselect-dropdown__item').nth(0).click();
  await page.locator('.multiselect-dropdown__item').nth(1).click();
  await companyTrigger.click();
  await waitForResultsSettled(page);

  const container = resultsContainer(page);
  const heightBefore = await container.evaluate((el) => el.getBoundingClientRect().height);
  test.skip(heightBefore < 100, 'not enough real content rendered on this data set to make the assertion meaningful');

  // trigger a second, genuinely different fetch (a new period type) while real content is
  // already on screen, then sample height throughout the loading window — it must never
  // drop toward the loading placeholder's tiny height.
  const anotherPeriod = page.locator('.yield-switch__option:not(.yield-switch__option--active)').first();
  await anotherPeriod.click();

  const loadingText = page.getByText('טוען השוואה…');
  let sampledWhileLoading = false;
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (await loadingText.isVisible()) {
      sampledWhileLoading = true;
      const heightDuring = await container.evaluate((el) => el.getBoundingClientRect().height);
      expect(heightDuring).toBeGreaterThanOrEqual(heightBefore * 0.95);
    } else if (sampledWhileLoading) {
      break;
    }
    await page.waitForTimeout(50);
  }

  await waitForResultsSettled(page);
});
