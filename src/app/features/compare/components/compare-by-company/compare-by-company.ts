import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { HoldLastHeight } from '../../directives/hold-last-height.directive';
import { ViewMode } from '../../enums/view-mode.enum';
import { ComparisonBed } from '../comparison-bed/comparison-bed';
import { ComparisonTable } from '../comparison-table/comparison-table';
import { CompareByCompanyFacade } from './facades/compare-by-company.facade';

@Component({
  selector: 'app-compare-by-company',
  imports: [ComparisonBed, ComparisonTable, HoldLastHeight],
  templateUrl: './compare-by-company.html',
  styleUrl: './compare-by-company.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [CompareByCompanyFacade],
})
export class CompareByCompany {
  protected readonly ViewMode = ViewMode;
  protected readonly facade = inject(CompareByCompanyFacade);
}
