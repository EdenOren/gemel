import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { DisclaimerModal } from './shared/components/disclaimer-modal/disclaimer-modal';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, DisclaimerModal],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly currentYear: number = new Date().getFullYear();
}
