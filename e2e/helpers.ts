import { Locator, Page, expect } from '@playwright/test';

// Shared across every spec below: nothing here is mocked (see the note atop
// playwright.config.ts), so every helper waits on real, structural signals — "some item
// rendered, or the empty state did" — rather than a fixed timeout, since real API latency
// varies run to run.

export async function gotoCompare(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('.yield-switch__option').first()).toBeVisible();
  // The category list and the first category's paths/companies load async right after
  // navigation — wait for the auto-select effect (CompareSelectionFacade) to have picked
  // a category before any test starts clicking dropdowns.
  await expect(page.locator('.category-picker__pot--active')).toBeVisible();
}

// DOM order of the two filter dropdowns is always [paths, companies] regardless of
// mode — only their visual flex `order` and label swap between "by path"/"by company".
export const PATH_DROPDOWN = 0;
export const COMPANY_DROPDOWN = 1;

export function dropdownTrigger(page: Page, which: 0 | 1): Locator {
  return page.locator('.multiselect-dropdown__trigger').nth(which);
}

export function dropdownMenu(page: Page, which: 0 | 1): Locator {
  return page.locator('.multiselect-dropdown').nth(which).locator('.multiselect-dropdown__menu');
}

// Scoped to the trigger button specifically, NOT `.multiselect-dropdown` as a whole —
// the component also renders an off-screen mirror row (`.multiselect-dropdown__chips-measure`,
// used to measure chip widths) containing its own `.multiselect-dropdown__chip` elements,
// which are real DOM nodes (just `visibility: hidden`) and would otherwise get counted
// right alongside the actually-visible ones.
export function dropdownChips(page: Page, which: 0 | 1): Locator {
  return dropdownTrigger(page, which).locator('.multiselect-dropdown__chip');
}

export async function openDropdown(page: Page, which: 0 | 1): Promise<void> {
  await dropdownTrigger(page, which).click();
  const menu = dropdownMenu(page, which);
  await expect(menu).toBeVisible();
  await expect
    .poll(async () => (await menu.locator('.multiselect-dropdown__item, .multiselect-dropdown__empty').count()) > 0)
    .toBe(true);
}

export async function closeDropdown(page: Page, which: 0 | 1): Promise<void> {
  await dropdownTrigger(page, which).click();
  await expect(dropdownMenu(page, which)).toBeHidden();
}

// Waits for the results area (either mode, either view) to settle on something other
// than the "טוען השוואה…" loading placeholder.
export async function waitForResultsSettled(page: Page): Promise<void> {
  const loading = page.getByText('טוען השוואה…');
  await expect(loading).toBeHidden({ timeout: 15_000 });
}

export function activeModeTab(page: Page): Locator {
  return page.locator('.compare__tab--active');
}

export async function switchMode(page: Page, label: 'לפי מסלול' | 'לפי חברה'): Promise<void> {
  await page.locator('.compare__tab', { hasText: label }).click();
  await expect(activeModeTab(page)).toHaveText(label);
}

export async function setViewMode(page: Page, view: 'גרף' | 'טבלה'): Promise<void> {
  await page.locator('.compare__view-btn', { hasText: view }).click();
  await expect(page.locator('.compare__view-btn', { hasText: view })).toHaveClass(/--active/);
}

export function resultsContainer(page: Page): Locator {
  return page.locator('.compare-by-path__results, .compare-by-company__results');
}
