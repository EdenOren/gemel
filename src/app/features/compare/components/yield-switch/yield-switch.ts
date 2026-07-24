import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { PeriodType } from '../../../../core/enums/period-type.enum';
import { PERIOD_TYPE_OPTIONS } from '../../utils/period-type.constants';

@Component({
  selector: 'app-yield-switch',
  imports: [],
  templateUrl: './yield-switch.html',
  styleUrl: './yield-switch.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'yield-switch',
  },
})
export class YieldSwitch {
  readonly value = input.required<readonly PeriodType[]>();
  readonly valueChange = output<PeriodType[]>();

  protected readonly options = PERIOD_TYPE_OPTIONS;

  protected isActive(periodType: PeriodType): boolean {
    return this.value().includes(periodType);
  }

  // At least one period must stay selected — there's nothing meaningful to render
  // (and no API call to make) once the last one is deselected. Disabling the button
  // (rather than silently no-opping the click) makes that constraint visible instead
  // of the option looking clickable but doing nothing.
  protected isDisabled(periodType: PeriodType): boolean {
    return this.isActive(periodType) && this.value().length === 1;
  }

  protected toggle(periodType: PeriodType): void {
    const current = this.value();
    if (current.includes(periodType)) {
      if (current.length === 1) {
        return;
      }
      this.valueChange.emit(current.filter((value) => value !== periodType));
      return;
    }
    this.valueChange.emit([...current, periodType]);
  }
}
