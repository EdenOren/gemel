import { ChangeDetectionStrategy, Component, Signal, computed, input } from '@angular/core';

import { PeriodType } from '../../../../core/enums/period-type.enum';
import { SortDirection } from '../../enums/sort-direction.enum';
import { ComparisonGroupViewModel } from '../../models/compare-view.model';
import { PERIOD_TYPE_OPTIONS } from '../../utils/period-type.constants';
import { RenderedGroup, buildRenderedGroups } from '../../utils/rendered-comparison.util';

const PERIOD_TYPE_LABELS = new Map<PeriodType, string>(
  PERIOD_TYPE_OPTIONS.map((option) => [option.value, option.label]),
);

interface ColumnDef {
  periodType: PeriodType;
  label: string;
}

@Component({
  selector: 'app-comparison-table',
  imports: [],
  templateUrl: './comparison-table.html',
  styleUrl: './comparison-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'comparison-table',
  },
})
export class ComparisonTable {
  readonly groups = input.required<readonly ComparisonGroupViewModel[]>();
  readonly periodTypes = input.required<readonly PeriodType[]>();
  readonly sortDirection = input<SortDirection>(SortDirection.Desc);

  protected readonly renderedGroups: Signal<RenderedGroup[]> = computed(() =>
    buildRenderedGroups(this.groups(), this.sortDirection()),
  );

  protected readonly columns: Signal<ColumnDef[]> = computed(() => {
    const allPeriods = this.renderedGroups()
      .flatMap((group) => group.rows)
      .flatMap((row) => row.periods);

    return this.periodTypes().map((periodType) => {
      const resolved = allPeriods.find((period) => period.periodType === periodType)?.periodLabel;
      return { periodType, label: resolved ?? PERIOD_TYPE_LABELS.get(periodType) ?? periodType };
    });
  });
}
