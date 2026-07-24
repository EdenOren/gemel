import { ChangeDetectionStrategy, Component, ElementRef, viewChild } from '@angular/core';

@Component({
  selector: 'app-disclaimer-modal',
  imports: [],
  templateUrl: './disclaimer-modal.html',
  styleUrl: './disclaimer-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DisclaimerModal {
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  open(): void {
    this.dialog().nativeElement.showModal();
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  protected onDialogClick(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) {
      this.close();
    }
  }
}
