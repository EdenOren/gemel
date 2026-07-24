import { Service, Signal, computed, inject } from '@angular/core';

import { ByPathsParams, ComparisonService } from '../../../../../core/services/data/comparison.service';
import { ComparisonGroupViewModel } from '../../../models/compare-view.model';
import { CompareSelectionFacade } from '../../../facades/compare-selection.facade';

@Service({ autoProvided: false })
export class CompareByPathFacade {
  private readonly comparisonService = inject(ComparisonService);
  readonly selection = inject(CompareSelectionFacade);

  private readonly compareParams: Signal<ByPathsParams> = computed(() => ({
    pathIds: this.selection.selectedPathIds(),
    periodTypes: this.selection.selectedPeriodTypes(),
    companyIds: this.selection.selectedCompanyIds(),
  }));

  private readonly compareGroups = this.comparisonService.byPathGroups(this.compareParams);

  readonly isLoading: Signal<boolean> = this.compareGroups.isLoading;
  readonly isError: Signal<boolean> = this.compareGroups.isError;
  readonly hasSelection: Signal<boolean> = computed(() => this.selection.selectedPathIds().length > 0);

  readonly resultGroups: Signal<ComparisonGroupViewModel[]> = computed(() =>
    this.compareGroups.groups().map((group) => ({
      id: group.id,
      title: group.title,
      rows: group.rows.map((row) => ({
        id: row.fundId,
        primaryLabel: row.primaryLabel,
        secondaryLabel: row.fundName,
        values: row.values,
      })),
    })),
  );
}
