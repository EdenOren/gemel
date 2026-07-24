import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Signal,
  WritableSignal,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';

import { PeriodType } from '../../core/enums/period-type.enum';
import { CategoryPicker } from './components/category-picker/category-picker';
import { CompareByCompany } from './components/compare-by-company/compare-by-company';
import { CompareByPath } from './components/compare-by-path/compare-by-path';
import { MultiselectDropdown, MultiselectOption } from './components/multiselect-dropdown/multiselect-dropdown';
import { YieldSwitch } from './components/yield-switch/yield-switch';
import { CompareMode } from './enums/compare-mode.enum';
import { SortDirection } from './enums/sort-direction.enum';
import { ViewMode } from './enums/view-mode.enum';
import { CompareSelectionFacade } from './facades/compare-selection.facade';

@Component({
  selector: 'app-compare',
  imports: [CategoryPicker, YieldSwitch, MultiselectDropdown, CompareByPath, CompareByCompany],
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

  private readonly _mode: WritableSignal<CompareMode> = signal(CompareMode.ByCompany);
  protected readonly mode: Signal<CompareMode> = this._mode.asReadonly();

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
