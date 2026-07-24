import { Service, Signal, WritableSignal, computed, effect, inject, signal } from '@angular/core';

import { CategoriesService } from '../../../core/services/data/categories.service';
import { PeriodType } from '../../../core/enums/period-type.enum';
import { Category, InvestmentPath } from '../../../core/models/taxonomy.model';
import { Company } from '../../../core/models/company.model';
import { SortDirection } from '../enums/sort-direction.enum';
import { ViewMode } from '../enums/view-mode.enum';

/**
 * Shared across both compare modes (provided on the parent `Compare` component) so that
 * switching between "לפי מסלול" and "לפי חברה" keeps the category/paths/companies/period
 * selection intact instead of resetting it per mode.
 */
@Service({ autoProvided: false })
export class CompareSelectionFacade {
  private readonly categoriesService = inject(CategoriesService);

  private readonly _selectedCategoryId: WritableSignal<string | undefined> = signal(undefined);
  private readonly _selectedPathIds: WritableSignal<string[]> = signal([]);
  private readonly _selectedCompanyIds: WritableSignal<number[]> = signal([]);
  private readonly _selectedPeriodTypes: WritableSignal<PeriodType[]> = signal([PeriodType.Monthly]);
  private readonly _viewMode: WritableSignal<ViewMode> = signal(ViewMode.Graph);
  // Descending (highest yield first) matches what buildRenderedGroups already did before
  // this was made user-toggleable, so the default view doesn't change for anyone.
  private readonly _sortDirection: WritableSignal<SortDirection> = signal(SortDirection.Desc);

  readonly selectedCategoryId: Signal<string | undefined> = computed(() => this._selectedCategoryId());
  readonly selectedPathIds: Signal<string[]> = computed(() => this._selectedPathIds());
  readonly selectedCompanyIds: Signal<number[]> = computed(() => this._selectedCompanyIds());
  readonly selectedPeriodTypes: Signal<PeriodType[]> = computed(() => this._selectedPeriodTypes());
  readonly viewMode: Signal<ViewMode> = computed(() => this._viewMode());
  readonly sortDirection: Signal<SortDirection> = computed(() => this._sortDirection());

  readonly categories: Signal<Category[]> = this.categoriesService.categories;

  // `.value()` re-throws the underlying error once a resource is in the 'error' state
  // (that's how httpResource surfaces failures), so every read here goes through
  // `.error()` first — an errored companies fetch (e.g. a transient upstream 404) must
  // not take down the reactive graph for the unrelated paths list next to it.
  private readonly pathsResource = this.categoriesService.pathsResource(this._selectedCategoryId);
  readonly paths: Signal<InvestmentPath[]> = computed(() =>
    this.pathsResource.error() ? [] : (this.pathsResource.value()?.paths ?? []),
  );
  readonly isPathsLoading: Signal<boolean> = this.pathsResource.isLoading;

  // Scoped to the selected category (not the flat global company list) so companies
  // with zero funds in this category never show up as a selectable dead end.
  private readonly companiesResource = this.categoriesService.companiesResource(this._selectedCategoryId);
  readonly companies: Signal<Company[]> = computed(() =>
    this.companiesResource.error() ? [] : (this.companiesResource.value()?.companies ?? []),
  );

  constructor() {
    effect(() => {
      const categories = this.categories();
      if (categories.length > 0 && this._selectedCategoryId() === undefined) {
        this._selectedCategoryId.set(categories[0].id);
      }
    });

    // Companies are category-scoped now, so a selection from the previous category may
    // no longer be valid — drop any selected id that's not in the new category's list.
    // Gated on isLoading so the transient empty list while a new category's companies
    // are still in flight doesn't wipe a selection that turns out to still be valid.
    effect(() => {
      if (this.companiesResource.isLoading()) {
        return;
      }
      const validIds = new Set(this.companies().map((company) => company.legal_id));
      const current = this._selectedCompanyIds();
      const filtered = current.filter((id) => validIds.has(id));
      if (filtered.length !== current.length) {
        this._selectedCompanyIds.set(filtered);
      }
    });
  }

  onCategoryChange(categoryId: string | undefined): void {
    this._selectedCategoryId.set(categoryId);
    this._selectedPathIds.set([]);
  }

  onPathIdsChange(pathIds: string[]): void {
    this._selectedPathIds.set(pathIds);
  }

  onCompanyIdsChange(companyIds: number[]): void {
    this._selectedCompanyIds.set(companyIds);
  }

  onPeriodTypesChange(periodTypes: PeriodType[]): void {
    if (periodTypes.length === 0) {
      return;
    }
    this._selectedPeriodTypes.set(periodTypes);
  }

  onViewModeChange(viewMode: ViewMode): void {
    this._viewMode.set(viewMode);
  }

  onSortDirectionChange(sortDirection: SortDirection): void {
    this._sortDirection.set(sortDirection);
  }
}
