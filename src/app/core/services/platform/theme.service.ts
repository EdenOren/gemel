import { Service, Signal, WritableSignal, computed, signal } from '@angular/core';

import { LocalStorageKeys } from '../../enums/local-storage-keys.enum';
import { Theme } from '../../enums/theme.enum';

@Service()
export class ThemeService {
  readonly theme: WritableSignal<Theme> = signal<Theme>(Theme.Light);
  readonly isDark: Signal<boolean> = computed(() => this.theme() === Theme.Dark);

  private applyTheme(theme: Theme): void {
    this.theme.set(theme);
    document.documentElement.setAttribute('data-theme', theme);
  }

  init(): void {
    const stored = localStorage.getItem(LocalStorageKeys.Theme) as Theme | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolved = stored ?? (prefersDark ? Theme.Dark : Theme.Light);
    this.applyTheme(resolved);
  }

  toggle(): void {
    const next = this.theme() === Theme.Dark ? Theme.Light : Theme.Dark;
    this.applyTheme(next);
    localStorage.setItem(LocalStorageKeys.Theme, next);
  }
}
