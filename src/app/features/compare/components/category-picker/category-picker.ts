import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Signal,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';

import { Category } from '../../../../core/models/taxonomy.model';

const VISIBLE_COUNT = 3;

/** Matches $category-colors in _colors.scss (4 entries) — kept in sync by hand since
 * SCSS variables aren't readable from TypeScript. */
const ACCENT_COUNT = 4;

const ICON_SPROUT = 'M12 21V10M12 13c0-4-3-6-7-6 0 4 3 6 7 6ZM12 10c0-4 3-6 7-6 0 4-3 6-7 6Z';
const ICON_BOOK =
  'M4 5.5C4 4.7 4.7 4 5.5 4H12v16H5.5c-.8 0-1.5-.7-1.5-1.5ZM20 5.5C20 4.7 19.3 4 18.5 4H12v16h6.5c.8 0 1.5-.7 1.5-1.5Z';
const ICON_DIAMOND = 'M6 3h12l3 5-9 13L3 8ZM3 8h18M9 3l-2 5 5 13 5-13-2-5M7 8l5 13 5-13';
const ICON_BUILDING = 'M3 21h18M4 21V9M20 21V9M2 9l10-6 10 6M7 9v8M12 9v8M17 9v8';
const ICON_STAR = 'M12 2l2.9 6.4 6.9.7-5.2 4.7 1.5 6.9L12 17l-6.1 3.7 1.5-6.9L2.2 9.1l6.9-.7Z';
const ICON_TRENDING_UP = 'M3 17l6-6 4 4 8-8M15 7h6v6';
const ICON_COIN = 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM9 15V9c0-1.1 1.3-2 3-2s3 .9 3 2M9 12h6';
const ICON_OTHER = 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 10.6a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Z';

/** Keyed by the exact category label the backend returns (see gemel-api's
 * FUND_CLASSIFICATION values / taxonomy_overrides.yaml) — these labels are the
 * permanent, government-dataset text, so the mapping is meaning-based and stable
 * across category reordering, unlike cycling icons by array position. */
const ICON_BY_LABEL: Readonly<Record<string, string>> = {
  'קרנות השתלמות': ICON_BOOK,
  'קופת גמל להשקעה': ICON_TRENDING_UP,
  'תגמולים ואישית לפיצויים': ICON_COIN,
  'קופת גמל להשקעה - חסכון לילד': ICON_SPROUT,
  'מרכזית לפיצויים': ICON_BUILDING,
  'מטרה אחרת': ICON_STAR,
};

/** Used only for a label the dataset introduces that isn't in ICON_BY_LABEL yet.
 * Picked by a hash of the category id (not array position) so an unmapped category
 * keeps the same fallback icon across reloads instead of shuffling as the category
 * list changes. */
const FALLBACK_ICON_PATHS: readonly string[] = [ICON_DIAMOND, ICON_OTHER];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Display order for the pots, keyed by the same permanent labels as ICON_BY_LABEL —
 * "קופת גמל להשקעה - חסכון לילד" (child savings, "לכל ילד") is intentionally ahead of
 * "תגמולים ואישית לפיצויים" so it lands in the 3 visible slots instead of overflow.
 * Any label not listed here keeps its relative (API) order, after all listed ones. */
const CATEGORY_DISPLAY_ORDER: readonly string[] = [
  'קרנות השתלמות',
  'קופת גמל להשקעה',
  'קופת גמל להשקעה - חסכון לילד',
  'תגמולים ואישית לפיצויים',
  'מרכזית לפיצויים',
  'מטרה אחרת',
];

function displayOrderIndex(label: string): number {
  const index = CATEGORY_DISPLAY_ORDER.indexOf(label);
  return index === -1 ? CATEGORY_DISPLAY_ORDER.length : index;
}

@Component({
  selector: 'app-category-picker',
  imports: [],
  templateUrl: './category-picker.html',
  styleUrl: './category-picker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'category-picker',
  },
})
export class CategoryPicker {
  private readonly elementRef: ElementRef<HTMLElement> = inject(ElementRef);

  readonly categories = input.required<readonly Category[]>();
  readonly selectedCategoryId = input<string | undefined>();
  readonly categoryChange = output<string | undefined>();

  protected readonly isMoreOpen = signal(false);

  // Stable sort: only reorders the labels named in CATEGORY_DISPLAY_ORDER, everything
  // else keeps the order the API returned it in.
  private readonly orderedCategories: Signal<Category[]> = computed(() =>
    [...this.categories()].sort(
      (a, b) => displayOrderIndex(a.label) - displayOrderIndex(b.label),
    ),
  );
  protected readonly visibleCategories: Signal<Category[]> = computed(() =>
    this.orderedCategories().slice(0, VISIBLE_COUNT),
  );
  protected readonly overflowCategories: Signal<Category[]> = computed(() =>
    this.orderedCategories().slice(VISIBLE_COUNT),
  );
  protected readonly isOverflowSelected: Signal<boolean> = computed(() =>
    this.overflowCategories().some((category) => category.id === this.selectedCategoryId()),
  );
  private readonly selectedOverflowCategory: Signal<Category | undefined> = computed(() =>
    this.overflowCategories().find((category) => category.id === this.selectedCategoryId()),
  );
  protected readonly moreTileLabel: Signal<string> = computed(
    () => this.selectedOverflowCategory()?.label ?? 'עוד',
  );
  // null (not the dots glyph) once a hidden category is selected, so the "more" trigger
  // shows that category's own icon instead of staying generic.
  protected readonly moreTileIcon: Signal<string | null> = computed(() => {
    const selected = this.selectedOverflowCategory();
    return selected ? this.iconPathFor(selected.id) : null;
  });

  private readonly iconPathByCategoryId: Signal<Map<string, string>> = computed(() => {
    const map = new Map<string, string>();
    this.categories().forEach((category) => {
      const knownIcon = ICON_BY_LABEL[category.label];
      const icon =
        knownIcon ?? FALLBACK_ICON_PATHS[hashString(category.id) % FALLBACK_ICON_PATHS.length];
      map.set(category.id, icon);
    });
    return map;
  });

  // Indexed off the display order (not raw API order): accent-4 is reserved for the
  // "more" trigger itself, so whichever category is currently in the 3rd visible slot
  // must land on accent-1..3, never accent-4, or it'd collide with the "more" tile's color.
  private readonly accentClassByCategoryId: Signal<Map<string, string>> = computed(() => {
    const map = new Map<string, string>();
    this.orderedCategories().forEach((category, index) => {
      map.set(category.id, `category-picker__pot--accent-${(index % ACCENT_COUNT) + 1}`);
    });
    return map;
  });

  constructor() {
    fromEvent<MouseEvent>(document, 'click')
      .pipe(takeUntilDestroyed())
      .subscribe((event) => {
        if (this.isMoreOpen() && !this.elementRef.nativeElement.contains(event.target as Node)) {
          this.isMoreOpen.set(false);
        }
      });
  }

  protected iconPathFor(categoryId: string): string {
    return this.iconPathByCategoryId().get(categoryId) ?? ICON_STAR;
  }

  protected accentClassFor(categoryId: string): string {
    return this.accentClassByCategoryId().get(categoryId) ?? 'category-picker__pot--accent-1';
  }

  protected selectVisible(categoryId: string): void {
    this.categoryChange.emit(categoryId);
    this.isMoreOpen.set(false);
  }

  protected toggleMore(): void {
    this.isMoreOpen.update((open) => !open);
  }

  protected selectOverflow(categoryId: string): void {
    this.categoryChange.emit(categoryId);
    this.isMoreOpen.set(false);
  }
}
