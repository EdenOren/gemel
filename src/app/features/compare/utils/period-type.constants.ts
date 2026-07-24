import { PeriodType } from '../../../core/enums/period-type.enum';

export interface PeriodTypeOption {
  value: PeriodType;
  label: string;
}

/**
 * The API supports more period types (YTD, annualized variants), but the yield switch
 * deliberately surfaces only these three — the ones people actually compare by day to
 * day. Widen this list later if the extra metrics turn out to be wanted in the UI too.
 */
export const PERIOD_TYPE_OPTIONS: PeriodTypeOption[] = [
  { value: PeriodType.Monthly, label: 'חודשי' },
  { value: PeriodType.Trailing3Y, label: '3 שנים' },
  { value: PeriodType.Trailing5Y, label: '5 שנים' },
];
