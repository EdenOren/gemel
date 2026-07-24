import { PeriodType } from '../../../core/enums/period-type.enum';
import { SortDirection } from '../enums/sort-direction.enum';
import { ComparisonGroupViewModel, ComparisonRowViewModel } from '../models/compare-view.model';
import { computeFillPercent } from './fill-percent.util';
import { PERIOD_TYPE_OPTIONS } from './period-type.constants';

const PERIOD_TYPE_LABELS = new Map<PeriodType, string>(
  PERIOD_TYPE_OPTIONS.map((option) => [option.value, option.label]),
);

const PERIOD_TYPE_ORDER: readonly PeriodType[] = PERIOD_TYPE_OPTIONS.map((option) => option.value);

const HEBREW_MONTHS: readonly string[] = [
  'ינואר',
  'פברואר',
  'מרץ',
  'אפריל',
  'מאי',
  'יוני',
  'יולי',
  'אוגוסט',
  'ספטמבר',
  'אוקטובר',
  'נובמבר',
  'דצמבר',
];

export interface RenderedPeriod {
  periodType: PeriodType;
  periodLabel: string;
  showLabel: boolean;
  value: number | null;
  valuePeriod: number | null;
  isStale: boolean;
  isWilt: boolean;
  fillPercent: number;
}

export interface RenderedRow {
  id: number;
  primaryLabel: string;
  secondaryLabel: string;
  hasAnyData: boolean;
  periods: RenderedPeriod[];
}

export interface RenderedGroup {
  id: string;
  title: string;
  rows: RenderedRow[];
}

// Rows are ranked by whichever selected period comes first in the fixed switch order
// (monthly, then 3y, then 5y) that actually has a value — stable regardless of the order
// the checkboxes were clicked in. A row with no value in any selected period sorts last.
function primarySortValue(row: ComparisonRowViewModel): number | null {
  for (const periodType of PERIOD_TYPE_ORDER) {
    const match = row.values.find((value) => value.periodType === periodType);
    if (match && match.value !== null) {
      return match.value;
    }
  }
  return null;
}

// The "monthly" period always resolves to one concrete calendar month — showing that
// month by name is more informative than a static "חודשי" label. Trailing 3y/5y periods
// can land on a different month per fund (walk-back on stale data), so those keep their
// generic label.
function formatMonthlyLabel(valuePeriod: number | null): string {
  if (valuePeriod === null) {
    return PERIOD_TYPE_LABELS.get(PeriodType.Monthly) ?? 'חודשי';
  }
  const year = Math.floor(valuePeriod / 100);
  const month = valuePeriod % 100;
  const monthName = HEBREW_MONTHS[month - 1];
  return monthName ? `${monthName} ${year}` : (PERIOD_TYPE_LABELS.get(PeriodType.Monthly) ?? 'חודשי');
}

// Resolved once per render rather than per row: every row in the monthly column shares
// the same calendar month, so a row with no monthly value still shows e.g. "יוני 2026"
// instead of falling back to the generic "חודשי" label that other rows in the same
// column don't show.
function resolveMonthlyLabel(groups: readonly ComparisonGroupViewModel[]): string {
  for (const group of groups) {
    for (const row of group.rows) {
      const monthly = row.values.find(
        (value) => value.periodType === PeriodType.Monthly && value.valuePeriod !== null,
      );
      if (monthly) {
        return formatMonthlyLabel(monthly.valuePeriod);
      }
    }
  }
  return PERIOD_TYPE_LABELS.get(PeriodType.Monthly) ?? 'חודשי';
}

// Shared by both the graph (comparison-bed) and table (comparison-table) result views so
// row order, "no data" bucketing, and period labels never drift between the two.
export function buildRenderedGroups(
  groups: readonly ComparisonGroupViewModel[],
  sortDirection: SortDirection = SortDirection.Desc,
): RenderedGroup[] {
  const monthlyLabel = resolveMonthlyLabel(groups);

  return groups.map((group) => {
    // Each period type gets its own bar scale — mixing e.g. ~1% monthly yields with
    // ~30% five-year trailing yields on one shared scale would make the monthly bars
    // all but invisible. (Only consumed by the graph view, but computed once here.)
    const maxByPeriod = new Map<PeriodType, number>();
    for (const row of group.rows) {
      for (const periodValue of row.values) {
        if (periodValue.value === null || periodValue.value <= 0) {
          continue;
        }
        const current = maxByPeriod.get(periodValue.periodType) ?? 0;
        if (periodValue.value > current) {
          maxByPeriod.set(periodValue.periodType, periodValue.value);
        }
      }
    }

    const sortedRows = [...group.rows].sort((a, b) => {
      const aValue = primarySortValue(a);
      const bValue = primarySortValue(b);
      if (aValue === null && bValue === null) {
        return 0;
      }
      if (aValue === null) {
        return 1;
      }
      if (bValue === null) {
        return -1;
      }
      // Rows with no value in any selected period always sort last (handled above),
      // regardless of direction — only the value-vs-value comparison flips.
      return sortDirection === SortDirection.Asc ? aValue - bValue : bValue - aValue;
    });

    return {
      id: group.id,
      title: group.title,
      rows: sortedRows.map((row) => {
        const hasAnyData = row.values.some((value) => value.value !== null);
        return {
          id: row.id,
          primaryLabel: row.primaryLabel,
          secondaryLabel: row.secondaryLabel,
          hasAnyData,
          periods: row.values.map((periodValue) => ({
            periodType: periodValue.periodType,
            periodLabel:
              periodValue.periodType === PeriodType.Monthly
                ? monthlyLabel
                : (PERIOD_TYPE_LABELS.get(periodValue.periodType) ?? periodValue.periodType),
            showLabel: row.values.length > 1 || periodValue.periodType === PeriodType.Monthly,
            value: periodValue.value,
            valuePeriod: periodValue.valuePeriod,
            isStale: periodValue.isStale,
            isWilt: periodValue.value !== null && periodValue.value < 0,
            fillPercent: computeFillPercent(periodValue.value, maxByPeriod.get(periodValue.periodType) ?? 0),
          })),
        };
      }),
    };
  });
}
