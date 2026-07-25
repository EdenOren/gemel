import { ChangeDetectionStrategy, Component, Signal, computed, input, output } from '@angular/core';

// How many item chips (paths/companies) the bar shows before collapsing the rest into a
// single "+N". The bar is a read-only reminder, not an interactive control, so a small
// fixed cap with a count is enough — no need for the dropdown trigger's pixel-measured
// chip fitting (see multiselect-dropdown.ts), which exists to avoid reflow mid-click.
const MAX_VISIBLE_ITEMS = 2;

/**
 * Read-only summary of the current comparison selection, shown fixed at the top of the
 * viewport once the real filter controls have scrolled out of view (see
 * `Compare.scrolledPastFilters`). The whole bar is one button that scrolls back up to the
 * filters — it never duplicates their interactivity. All label resolution happens in the
 * parent's computeds; this component just formats plain strings.
 */
@Component({
  selector: 'app-selection-summary-bar',
  imports: [],
  templateUrl: './selection-summary-bar.html',
  styleUrl: './selection-summary-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectionSummaryBar {
  readonly modeLabel = input.required<string>();
  readonly categoryLabel = input.required<string>();
  readonly itemLabels = input.required<readonly string[]>();
  readonly periodLabels = input.required<readonly string[]>();
  readonly activate = output<void>();

  protected readonly visibleItems: Signal<readonly string[]> = computed(() =>
    this.itemLabels().slice(0, MAX_VISIBLE_ITEMS),
  );
  protected readonly hiddenCount: Signal<number> = computed(() =>
    Math.max(0, this.itemLabels().length - MAX_VISIBLE_ITEMS),
  );
}
