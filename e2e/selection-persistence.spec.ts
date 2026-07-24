import { expect, test } from '@playwright/test';
import {
  COMPANY_DROPDOWN,
  PATH_DROPDOWN,
  closeDropdown,
  dropdownChips,
  dropdownTrigger,
  gotoCompare,
  openDropdown,
  switchMode,
} from './helpers';

test.describe('selection persistence across mode switches', () => {
  test('auto-selects the first category on load', async ({ page }) => {
    await gotoCompare(page);
    await expect(page.locator('.category-picker__pot--active')).toBeVisible();
  });

  test('keeps category, path, and company selections when switching by-path <-> by-company', async ({ page }) => {
    await gotoCompare(page);

    const selectedCategoryLabel = await page.locator('.category-picker__pot--active .category-picker__pot-label').textContent();

    await openDropdown(page, PATH_DROPDOWN);
    await page.locator('.multiselect-dropdown__item').nth(0).click();
    await page.locator('.multiselect-dropdown__item').nth(1).click();
    await closeDropdown(page, PATH_DROPDOWN);
    const pathChipsBefore = await dropdownChips(page, PATH_DROPDOWN).count();
    expect(pathChipsBefore).toBeGreaterThan(0);

    await openDropdown(page, COMPANY_DROPDOWN);
    await page.locator('.multiselect-dropdown__item').nth(0).click();
    await closeDropdown(page, COMPANY_DROPDOWN);
    const companyChipsBefore = await dropdownChips(page, COMPANY_DROPDOWN).count();
    expect(companyChipsBefore).toBeGreaterThan(0);

    // DOM order of the two dropdowns must never change — only their visual `order` and
    // label do — so the same nth-index still means the same control after switching mode.
    await switchMode(page, 'לפי מסלול');

    await expect(page.locator('.category-picker__pot--active .category-picker__pot-label')).toHaveText(
      selectedCategoryLabel ?? '',
    );
    await expect(dropdownChips(page, PATH_DROPDOWN)).toHaveCount(pathChipsBefore);
    await expect(dropdownChips(page, COMPANY_DROPDOWN)).toHaveCount(companyChipsBefore);

    await switchMode(page, 'לפי חברה');

    await expect(dropdownChips(page, PATH_DROPDOWN)).toHaveCount(pathChipsBefore);
    await expect(dropdownChips(page, COMPANY_DROPDOWN)).toHaveCount(companyChipsBefore);
  });

  test('keeps selected period types when switching modes', async ({ page }) => {
    await gotoCompare(page);

    // A single combined selector, not `.locator('.yield-switch__option').locator(':not([disabled])')`
    // — chaining two `.locator()` calls searches for a *descendant* matching the second
    // selector, and these buttons have no child elements, so that would never match anything.
    const enabledOption = page.locator('.yield-switch__option:not([disabled])').first();
    await enabledOption.click();
    const activeCountBefore = await page.locator('.yield-switch__option--active').count();
    expect(activeCountBefore).toBeGreaterThan(1);

    await switchMode(page, 'לפי מסלול');
    await expect(page.locator('.yield-switch__option--active')).toHaveCount(activeCountBefore);

    await switchMode(page, 'לפי חברה');
    await expect(page.locator('.yield-switch__option--active')).toHaveCount(activeCountBefore);
  });

  test('dropdown trigger label swaps singular/plural by mode without changing element position', async ({
    page,
  }) => {
    await gotoCompare(page);

    // default mode is "by company": path control is the secondary (plural "מסלולים"),
    // company control is the primary (singular "חברה"). Exact-text (not substring) match
    // matters here — "מסלול" is itself a prefix of "מסלולים", so a substring check
    // wouldn't actually prove the label swapped to the singular form.
    await expect(dropdownTrigger(page, PATH_DROPDOWN)).toHaveText('מסלולים');
    await expect(dropdownTrigger(page, COMPANY_DROPDOWN)).toHaveText('חברה');

    await switchMode(page, 'לפי מסלול');

    await expect(dropdownTrigger(page, PATH_DROPDOWN)).toHaveText('מסלול');
    await expect(dropdownTrigger(page, COMPANY_DROPDOWN)).toHaveText('חברות');
  });
});
