import { Directive, ElementRef, HostListener, Input } from '@angular/core';

@Directive({
  selector: '[alignPopover]',
  standalone: true,
})
export class AlignPopoverDirective {
  @Input('alignPopover') trigger: HTMLButtonElement | undefined;

  constructor(private el: ElementRef<HTMLElement>) {}

  @HostListener('beforetoggle', ['$event']) onClick(event: ToggleEvent) {
    if (event.newState === 'open' && this.trigger) {
      const rect = this.trigger.getBoundingClientRect();
      const menu = this.el.nativeElement;

      menu.style.top = `${rect.bottom}px`;
      menu.style.right = `${document.documentElement.clientWidth - rect.left}px`;
    }
  }
}
