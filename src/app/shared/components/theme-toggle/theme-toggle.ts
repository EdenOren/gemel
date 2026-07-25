import { ChangeDetectionStrategy, Component, Signal, inject, input } from '@angular/core';

import { ThemeService } from '../../../core/services/platform/theme.service';

// Where this instance is rendered — drives its chrome, not its behavior:
// - 'corner': the standalone fixed round button pinned to the top corner.
// - 'bar':    a flat inline icon button living inside the sticky summary bar.
export type ThemeToggleVariant = 'corner' | 'bar';

@Component({
  selector: 'app-theme-toggle',
  imports: [],
  templateUrl: './theme-toggle.html',
  styleUrl: './theme-toggle.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeToggle {
  private readonly themeService = inject(ThemeService);

  readonly variant = input<ThemeToggleVariant>('corner');

  protected readonly isDark: Signal<boolean> = this.themeService.isDark;

  protected toggle(): void {
    this.themeService.toggle();
  }
}
