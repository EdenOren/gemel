import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Signal,
  WritableSignal,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';

export interface MultiselectOption {
  id: string;
  label: string;
}

// Must match the CSS `gap` on `.multiselect-dropdown__chips` /
// `.multiselect-dropdown__chips-measure` — the fit calculation below adds this
// between every pair of chips it sums, so a mismatch would make the count off by
// a few pixels per chip.
const CHIP_GAP_PX = 6;
const FALLBACK_MORE_CHIP_WIDTH_PX = 40;

@Component({
  selector: 'app-multiselect-dropdown',
  imports: [],
  templateUrl: './multiselect-dropdown.html',
  styleUrl: './multiselect-dropdown.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'multiselect-dropdown',
  },
})
export class MultiselectDropdown {
  private readonly elementRef: ElementRef<HTMLElement> = inject(ElementRef);

  readonly label = input.required<string>();
  readonly options = input.required<readonly MultiselectOption[]>();
  readonly selectedIds = input<readonly string[]>([]);
  // Opt-in: sections the menu by each option's first label word (e.g. every "אג\"ח …"
  // path under one "אג\"ח" header) instead of one flat list. Off by default since it
  // only makes sense where labels are auto-derived, growing, and share real prefixes
  // (paths) — not where they're distinct proper names (companies).
  readonly groupSimilar = input<boolean>(false);
  readonly selectionChange = output<string[]>();

  private readonly chipsRow = viewChild<ElementRef<HTMLElement>>('chipsRow');
  private readonly hiddenChips = viewChildren<ElementRef<HTMLElement>>('hiddenChip');
  private readonly hiddenMoreChip = viewChild<ElementRef<HTMLElement>>('hiddenMoreChip');

  protected readonly isOpen = signal(false);
  private readonly _searchQuery: WritableSignal<string> = signal('');
  protected readonly searchQuery: Signal<string> = computed(() => this._searchQuery());

  // Edits accumulate here while the menu is open; the parent (and therefore the API
  // call driven by its selection state) only hears about them when the menu closes.
  // Note this swaps effectiveIds' source array (selectedIds -> pendingIds) the instant
  // the menu opens, but pendingIds starts as a same-content copy, and every chip loop
  // below tracks by option id, so Angular reuses the existing chip DOM nodes rather than
  // recreating them — opening never causes the trigger's chips to visibly change.
  private readonly _pendingIds: WritableSignal<string[]> = signal([]);
  private readonly effectiveIds: Signal<readonly string[]> = computed(() =>
    this.isOpen() ? this._pendingIds() : this.selectedIds(),
  );

  protected readonly selectedCount: Signal<number> = computed(() => this.effectiveIds().length);

  protected readonly selectedOptions: Signal<MultiselectOption[]> = computed(() => {
    const selected = new Set(this.effectiveIds());
    return this.options().filter((option) => selected.has(option.id));
  });

  protected readonly tooltipText: Signal<string> = computed(() =>
    this.selectedOptions()
      .map((option) => option.label)
      .join(', '),
  );

  // How many chips actually fit in the trigger's available width, measured against the
  // hidden mirror row below — see the afterRenderEffect in the constructor.
  private readonly _visibleChipCount: WritableSignal<number> = signal(0);
  protected readonly visibleChips: Signal<MultiselectOption[]> = computed(() =>
    this.selectedOptions().slice(0, this._visibleChipCount()),
  );
  protected readonly hiddenChipCount: Signal<number> = computed(() =>
    Math.max(0, this.selectedOptions().length - this._visibleChipCount()),
  );

  private readonly _availableWidth: WritableSignal<number> = signal(0);

  protected readonly filteredOptions: Signal<MultiselectOption[]> = computed(() => {
    const query = this._searchQuery().trim().toLowerCase();
    if (!query) {
      return [...this.options()];
    }
    return this.options().filter((option) => option.label.toLowerCase().includes(query));
  });

  // A header appears once, right before the first option of each *contiguous* run
  // sharing the same first word — relies on options() already arriving sorted by label
  // (true for paths, from the backend), which puts every shared-prefix label next to
  // each other for free. Groups of size 1 don't get a header — it'd just repeat the
  // item's own text.
  protected readonly groupedItems: Signal<{ option: MultiselectOption; headerLabel: string | null }[]> = computed(() => {
    const options = this.filteredOptions();
    if (!this.groupSimilar()) {
      return options.map((option) => ({ option, headerLabel: null }));
    }

    const keyOf = (option: MultiselectOption): string => option.label.trim().split(/\s+/)[0];
    const counts = new Map<string, number>();
    for (const option of options) {
      const key = keyOf(option);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    let lastKey: string | null = null;
    return options.map((option) => {
      const key = keyOf(option);
      const isNewGroup = key !== lastKey;
      lastKey = key;
      return { option, headerLabel: isNewGroup && (counts.get(key) ?? 0) > 1 ? key : null };
    });
  });

  constructor() {
    fromEvent<MouseEvent>(document, 'click')
      .pipe(takeUntilDestroyed())
      .subscribe((event) => {
        if (this.isOpen() && !this.elementRef.nativeElement.contains(event.target as Node)) {
          this.close();
        }
      });

    // Tracks the trigger's available width for chips, independent of how many chips are
    // currently rendered inside it (the row is flex: 1 1 auto, so its box width comes
    // from the button's layout, not its own content).
    effect((onCleanup) => {
      const container = this.chipsRow()?.nativeElement;
      if (!container) {
        return;
      }
      const observer = new ResizeObserver((entries) => {
        const width = entries[0]?.contentRect.width ?? 0;
        this._availableWidth.set(width);
      });
      observer.observe(container);
      onCleanup(() => observer.disconnect());
    });

    // earlyRead measures the hidden mirror chips (real widths, real font) and the
    // available width, then write applies the result — both phases run before the
    // browser paints, so the trigger never shows an unmeasured "all chips" frame that
    // then visibly collapses down to the fitted count.
    afterRenderEffect({
      earlyRead: () => this.computeVisibleChipCount(),
      write: (count) => {
        if (count() !== this._visibleChipCount()) {
          this._visibleChipCount.set(count());
        }
      },
    });
  }

  private computeVisibleChipCount(): number {
    const options = this.selectedOptions();
    if (options.length === 0) {
      return 0;
    }

    const container = this.chipsRow()?.nativeElement;
    const hiddenEls = this.hiddenChips().map((ref) => ref.nativeElement);
    const availableWidth = this._availableWidth();

    if (!container || availableWidth === 0 || hiddenEls.length !== options.length) {
      // Not measured yet this pass (or the trigger is currently hidden) — keep whatever
      // count we last settled on instead of flashing every chip visible.
      return Math.min(this._visibleChipCount(), options.length);
    }

    const widths = hiddenEls.map((el) => el.getBoundingClientRect().width);
    const totalWidth = widths.reduce((sum, w) => sum + w, 0) + CHIP_GAP_PX * (widths.length - 1);
    if (totalWidth <= availableWidth) {
      return options.length;
    }

    const moreWidth = this.hiddenMoreChip()?.nativeElement.getBoundingClientRect().width ?? FALLBACK_MORE_CHIP_WIDTH_PX;
    const budget = availableWidth - moreWidth - CHIP_GAP_PX;

    let used = 0;
    let count = 0;
    for (const width of widths) {
      const next = used + (count > 0 ? CHIP_GAP_PX : 0) + width;
      if (next > budget) {
        break;
      }
      used = next;
      count++;
    }
    return count;
  }

  protected toggleOpen(): void {
    if (this.isOpen()) {
      this.close();
      return;
    }
    this._pendingIds.set([...this.selectedIds()]);
    this._searchQuery.set('');
    this.isOpen.set(true);
  }

  protected isSelected(optionId: string): boolean {
    return this.effectiveIds().includes(optionId);
  }

  protected toggleOption(optionId: string): void {
    const current = this._pendingIds();
    const next = current.includes(optionId)
      ? current.filter((id) => id !== optionId)
      : [...current, optionId];
    this._pendingIds.set(next);
  }

  protected onSearchInput(event: Event): void {
    this._searchQuery.set((event.target as HTMLInputElement).value);
  }

  protected onClear(): void {
    this._pendingIds.set([]);
  }

  protected onSelectAll(): void {
    const ids = new Set(this._pendingIds());
    this.filteredOptions().forEach((option) => ids.add(option.id));
    this._pendingIds.set([...ids]);
  }

  private close(): void {
    this.isOpen.set(false);
    const pending = this._pendingIds();
    const current = this.selectedIds();
    const changed = pending.length !== current.length || pending.some((id) => !current.includes(id));
    if (changed) {
      this.selectionChange.emit(pending);
    }
  }
}
