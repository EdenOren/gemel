import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Signal,
  WritableSignal,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';

import { PeriodType } from '../../core/enums/period-type.enum';
import { CategoryPicker } from './components/category-picker/category-picker';
import { CompareByCompany } from './components/compare-by-company/compare-by-company';
import { CompareByPath } from './components/compare-by-path/compare-by-path';
import { MultiselectDropdown, MultiselectOption } from './components/multiselect-dropdown/multiselect-dropdown';
import { SelectionSummaryBar } from './components/selection-summary-bar/selection-summary-bar';
import { YieldSwitch } from './components/yield-switch/yield-switch';
import { ThemeToggle } from '../../shared/components/theme-toggle/theme-toggle';
import { CompareMode } from './enums/compare-mode.enum';
import { SortDirection } from './enums/sort-direction.enum';
import { ViewMode } from './enums/view-mode.enum';
import { CompareSelectionFacade } from './facades/compare-selection.facade';
import { PERIOD_TYPE_OPTIONS } from './utils/period-type.constants';

@Component({
  selector: 'app-compare',
  imports: [
    CategoryPicker,
    YieldSwitch,
    MultiselectDropdown,
    CompareByPath,
    CompareByCompany,
    SelectionSummaryBar,
    ThemeToggle,
  ],
  templateUrl: './compare.html',
  styleUrl: './compare.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [CompareSelectionFacade],
})
export class Compare {
  protected readonly CompareMode = CompareMode;
  protected readonly ViewMode = ViewMode;
  protected readonly SortDirection = SortDirection;
  // Category picker, period switch, and both filter dropdowns are mode-agnostic (same
  // shared selection state either way — see CompareSelectionFacade), so they're owned
  // here and rendered once. Only the results/graph area below swaps per mode, instead
  // of the previous by-path/by-company split destroying and remounting this whole
  // block (category picker included) on every tab click.
  protected readonly selection = inject(CompareSelectionFacade);

  private readonly content = viewChild.required<ElementRef<HTMLElement>>('content');
  // Non-required + guarded read below, since the observer effect runs before the view
  // initializes (same pattern as the ResizeObserver in multiselect-dropdown.ts).
  private readonly filtersRegion = viewChild<ElementRef<HTMLElement>>('filtersRegion');

  private readonly _mode: WritableSignal<CompareMode> = signal(CompareMode.ByCompany);
  protected readonly mode: Signal<CompareMode> = this._mode.asReadonly();

  // True once the filter controls have scrolled up out of view, driving both the sticky
  // selection summary bar and the scroll-to-top button. Set from an IntersectionObserver
  // below; the signal write is what triggers change detection in this zoneless app.
  private readonly _scrolledPastFilters: WritableSignal<boolean> = signal(false);
  protected readonly scrolledPastFilters: Signal<boolean> = this._scrolledPastFilters.asReadonly();

  protected readonly pathOptions: Signal<MultiselectOption[]> = computed(() =>
    this.selection.paths().map((path) => ({ id: path.id, label: path.label })),
  );
  protected readonly companyOptions: Signal<MultiselectOption[]> = computed(() =>
    this.selection.companies().map((company) => ({ id: String(company.legal_id), label: company.name })),
  );
  protected readonly selectedCompanyIdStrings: Signal<string[]> = computed(() =>
    this.selection.selectedCompanyIds().map(String),
  );

  // Mirrors each mode facade's own `hasSelection` (CompareByPathFacade/CompareByCompanyFacade):
  // sort only means something once there's at least one result row to sort.
  protected readonly hasSelection: Signal<boolean> = computed(() =>
    this.mode() === CompareMode.ByPath
      ? this.selection.selectedPathIds().length > 0
      : this.selection.selectedCompanyIds().length > 0,
  );

  // Inputs for the sticky SelectionSummaryBar — all resolved from existing facade state,
  // so the bar stays a dumb component taking plain strings.
  protected readonly modeLabel: Signal<string> = computed(() =>
    this.mode() === CompareMode.ByPath ? 'לפי מסלול' : 'לפי חברה',
  );
  protected readonly categoryLabel: Signal<string> = computed(() => {
    const id = this.selection.selectedCategoryId();
    return this.selection.categories().find((category) => category.id === id)?.label ?? '';
  });
  // The mode's primary dimension only (paths in by-path, companies in by-company) — the
  // secondary filter isn't what's being compared. Ids whose options aren't loaded (e.g.
  // an errored fetch the facade guards to []) simply resolve to nothing.
  protected readonly summaryItemLabels: Signal<string[]> = computed(() => {
    if (this.mode() === CompareMode.ByPath) {
      const selected = new Set(this.selection.selectedPathIds());
      return this.selection.paths().filter((path) => selected.has(path.id)).map((path) => path.label);
    }
    const selected = new Set(this.selection.selectedCompanyIds());
    return this.selection.companies().filter((company) => selected.has(company.legal_id)).map((company) => company.name);
  });
  protected readonly periodLabels: Signal<string[]> = computed(() => {
    const selected = new Set(this.selection.selectedPeriodTypes());
    return PERIOD_TYPE_OPTIONS.filter((option) => selected.has(option.value)).map((option) => option.label);
  });

  constructor() {
    effect((onCleanup) => {
      const element = this.filtersRegion()?.nativeElement;
      if (!element) {
        return;
      }
      const observer = new IntersectionObserver(
        ([entry]) => {
          // Show once the filters region has scrolled up past the top of the viewport
          // (its box is above the fold). `isIntersecting` is also false before the
          // region is first scrolled *to*, but the page always loads at the top with the
          // region on screen, so `boundingClientRect.top < 0` rules that case out.
          this._scrolledPastFilters.set(!entry.isIntersecting && entry.boundingClientRect.top < 0);
        },
        { threshold: 0 },
      );
      observer.observe(element);
      onCleanup(() => observer.disconnect());
    });
  }

  protected scrollToTop(): void {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  }

  protected onCategoryChange(categoryId: string | undefined): void {
    this.selection.onCategoryChange(categoryId);
  }

  protected onPeriodTypesChange(periodTypes: PeriodType[]): void {
    this.selection.onPeriodTypesChange(periodTypes);
  }

  protected onPathIdsChange(pathIds: string[]): void {
    this.selection.onPathIdsChange(pathIds);
  }

  protected onCompanyIdsChange(companyIds: string[]): void {
    this.selection.onCompanyIdsChange(companyIds.map(Number));
  }

  protected onViewModeChange(viewMode: ViewMode): void {
    this.selection.onViewModeChange(viewMode);
  }

  protected onSortDirectionToggle(): void {
    const next =
      this.selection.sortDirection() === SortDirection.Desc ? SortDirection.Asc : SortDirection.Desc;
    this.selection.onSortDirectionChange(next);
  }

  protected onModeChange(mode: CompareMode): void {
    if (mode === this._mode()) {
      return;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      this._mode.set(mode);
      return;
    }

    const element = this.content().nativeElement;
    const fromHeight = element.getBoundingClientRect().height;
    element.style.height = `${fromHeight}px`;
    element.classList.add('compare__content--animating');

    this._mode.set(mode);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const toHeight = element.scrollHeight;
        element.style.height = `${toHeight}px`;

        const onTransitionEnd = (event: TransitionEvent): void => {
          if (event.propertyName === 'height') {
            element.style.height = '';
            element.classList.remove('compare__content--animating');
            element.removeEventListener('transitionend', onTransitionEnd);
          }
        };
        element.addEventListener('transitionend', onTransitionEnd);
      });
    });
  }
}
