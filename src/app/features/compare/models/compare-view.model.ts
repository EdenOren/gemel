import { PeriodType } from '../../../core/enums/period-type.enum';

export interface MultiPeriodValueViewModel {
  periodType: PeriodType;
  value: number | null;
  valuePeriod: number | null;
  isStale: boolean;
}

export interface ComparisonRowViewModel {
  id: number;
  primaryLabel: string;
  secondaryLabel: string;
  values: MultiPeriodValueViewModel[];
}

export interface ComparisonGroupViewModel {
  id: string;
  title: string;
  rows: ComparisonRowViewModel[];
}
