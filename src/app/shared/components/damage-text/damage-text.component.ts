import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

export type TextType = 'damage' | 'heal' | 'critical' | 'break';

@Component({
  selector: 'app-damage-text',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="float-text" [ngClass]="type" [style.left.px]="x" [style.top.px]="y">
      {{ value }}
    </div>
  `,
  styleUrls: ['./damage-text.component.scss']
})
export class DamageTextComponent implements OnInit {
  @Input() value: string | number = '';
  @Input() type: TextType = 'damage';
  @Input() x: number = 0;
  @Input() y: number = 0;

  ngOnInit() {
    // 設定隨機偏移，讓數字不會疊在一起
    this.x += (Math.random() * 40 - 20); 
    this.y += (Math.random() * 20 - 10);
  }
}