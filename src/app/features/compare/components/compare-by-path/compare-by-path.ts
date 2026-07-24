import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { HoldLastHeight } from '../../directives/hold-last-height.directive';
import { ViewMode } from '../../enums/view-mode.enum';
import { ComparisonBed } from '../comparison-bed/comparison-bed';
import { ComparisonTable } from '../comparison-table/comparison-table';
import { CompareByPathFacade } from './facades/compare-by-path.facade';

@Component({
  selector: 'app-compare-by-path',
  imports: [ComparisonBed, ComparisonTable, HoldLastHeight],
  templateUrl: './compare-by-path.html',
  styleUrl: './compare-by-path.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [CompareByPathFacade],
})
export class CompareByPath {
  protected readonly ViewMode = ViewMode;
  protected readonly facade = inject(CompareByPathFacade);
}
