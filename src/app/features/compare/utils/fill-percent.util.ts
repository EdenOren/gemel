const MIN_FILL_PERCENT = 15;
const WILT_FILL_PERCENT = 8;

/**
 * Scales a yield value into a bar width relative to the highest positive value in its
 * comparison group — an absolute 0-100% scale would make small real-world differences
 * (e.g. 4.58% vs 4.83%) look nearly identical. Negative values always render as the
 * same small "wilted" width regardless of magnitude, since the bar is meant to show
 * relative standing, not encode how deep a loss goes.
 */
export function computeFillPercent(value: number | null, maxPositiveInGroup: number): number {
  if (value === null) {
    return 0;
  }
  if (value < 0) {
    return WILT_FILL_PERCENT;
  }
  if (maxPositiveInGroup <= 0) {
    return WILT_FILL_PERCENT;
  }
  return Math.max(MIN_FILL_PERCENT, Math.round((value / maxPositiveInGroup) * 100));
}

export function maxPositiveValue(values: readonly (number | null)[]): number {
  return values.reduce<number>((max, value) => (value !== null && value > max ? value : max), 0);
}
