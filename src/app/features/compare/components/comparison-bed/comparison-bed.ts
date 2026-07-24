import { ChangeDetectionStrategy, Component, Signal, computed, input } from '@angular/core';

import { SortDirection } from '../../enums/sort-direction.enum';
import { ComparisonGroupViewModel } from '../../models/compare-view.model';
import { RenderedGroup, buildRenderedGroups } from '../../utils/rendered-comparison.util';

@Component({
  selector: 'app-comparison-bed',
  imports: [],
  templateUrl: './comparison-bed.html',
  styleUrl: './comparison-bed.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'comparison-bed',
  },
})
export class ComparisonBed {
  readonly groups = input.required<readonly ComparisonGroupViewModel[]>();
  readonly sortDirection = input<SortDirection>(SortDirection.Desc);

  protected readonly renderedGroups: Signal<RenderedGroup[]> = computed(() =>
    buildRenderedGroups(this.groups(), this.sortDirection()),
  );
}
