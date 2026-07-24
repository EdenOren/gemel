import { Directive, ElementRef, Signal, WritableSignal, computed, effect, inject, input, signal } from '@angular/core';

// Applied to a results container that swaps between real content and a lightweight
// loading placeholder. While `appHoldLastHeight` is true, the host keeps a `min-height`
// equal to the last real (non-loading) content height it measured, so the card doesn't
// collapse to the placeholder's height and then pop back up once data arrives.
@Directive({
  selector: '[appHoldLastHeight]',
  host: {
    '[style.min-height.px]': 'holdHeightPx()',
  },
})
export class HoldLastHeight {
  readonly appHoldLastHeight = input.required<boolean>();

  private readonly elementRef: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly _lastHeight: WritableSignal<number | null> = signal(null);
  protected readonly holdHeightPx: Signal<number | null> = computed(() =>
    this.appHoldLastHeight() ? this._lastHeight() : null,
  );

  constructor() {
    effect((onCleanup) => {
      const element = this.elementRef.nativeElement;
      const observer = new ResizeObserver((entries) => {
        // Ignore resizes while the placeholder is showing — that's the height we're
        // deliberately overriding, not one worth remembering.
        if (this.appHoldLastHeight()) {
          return;
        }
        const height = entries[0]?.contentRect.height ?? 0;
        if (height > 0) {
          this._lastHeight.set(height);
        }
      });
      observer.observe(element);
      onCleanup(() => observer.disconnect());
    });
  }
}
