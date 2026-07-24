import { Service, Signal, computed, inject } from '@angular/core';

import {
  ByCompaniesParams,
  ComparisonService,
} from '../../../../../core/services/data/comparison.service';
import { ComparisonGroupViewModel } from '../../../models/compare-view.model';
import { CompareSelectionFacade } from '../../../facades/compare-selection.facade';

@Service({ autoProvided: false })
export class CompareByCompanyFacade {
  private readonly comparisonService = inject(ComparisonService);
  readonly selection = inject(CompareSelectionFacade);

  private readonly compareParams: Signal<ByCompaniesParams> = computed(() => ({
    companyIds: this.selection.selectedCompanyIds(),
    periodTypes: this.selection.selectedPeriodTypes(),
    pathIds: this.selection.selectedPathIds(),
  }));

  private readonly compareGroups = this.comparisonService.byCompanyGroups(this.compareParams);

  readonly isLoading: Signal<boolean> = this.compareGroups.isLoading;
  readonly isError: Signal<boolean> = this.compareGroups.isError;
  readonly hasSelection: Signal<boolean> = computed(() => this.selection.selectedCompanyIds().length > 0);

  readonly resultGroups: Signal<ComparisonGroupViewModel[]> = computed(() =>
    this.compareGroups.groups().map((group) => ({
      id: group.id,
      title: group.title,
      rows: group.rows.map((row) => ({
        id: row.fundId,
        // row.primaryLabel here is the path's classification label, which for some
        // categories (e.g. child savings) is a coarse catch-all shared by several funds
        // ("מודל חכ"מ אחר") because the dataset doesn't split risk tiers into their own
        // field — the fund's own name is what actually distinguishes the row, so it gets
        // top billing instead of the repeated, uninformative path label.
        primaryLabel: row.fundName,
        secondaryLabel: row.primaryLabel,
        values: row.values,
      })),
    })),
  );
}
