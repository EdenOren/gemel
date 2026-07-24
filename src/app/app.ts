import { ChangeDetectionStrategy, Component, Signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { DisclaimerModal } from './shared/components/disclaimer-modal/disclaimer-modal';
import { ThemeService } from './core/services/platform/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, DisclaimerModal],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly themeService = inject(ThemeService);

  protected readonly currentYear: number = new Date().getFullYear();
  protected readonly isDark: Signal<boolean> = this.themeService.isDark;

  protected toggleTheme(): void {
    this.themeService.toggle();
  }
}
