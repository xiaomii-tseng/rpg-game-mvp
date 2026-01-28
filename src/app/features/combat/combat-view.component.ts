// # 戰鬥主畫面import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CombatEngineService } from './services/combat-engine.service';
import { Component, inject, signal } from '@angular/core';
import { DamageTextComponent, TextType } from '../../shared/components/damage-text/damage-text.component';

interface FloatingText {
  id: number;
  value: string | number;
  type: TextType;
  x: number;
  y: number;
}

@Component({
  selector: 'app-combat-view',
  standalone: true,
  imports: [CommonModule, DamageTextComponent],
  templateUrl: './combat-view.component.html',
  styleUrls: ['./combat-view.component.scss']
})
export class CombatViewComponent {
  // 注入剛剛寫好的引擎
  combat = inject(CombatEngineService);

  // 用來存畫面上的數字
  floatingTexts = signal<FloatingText[]>([]);

  constructor() {
    // 訂閱戰鬥引擎的事件 (這裡我們先用簡單的方法：改寫引擎讓它送事件出來)
    // 但為了 MVP 簡單，我們先把 spawnText 函式傳給 Service 呼叫，或者直接在 View 裡監聽
  }

  // 這個函式是用來產生數字的
  spawnDamageText(val: string | number, type: TextType, targetIsPlayer: boolean) {
    const id = Date.now() + Math.random();

    // 設定出現位置
    // 如果是打怪物，位置在上面 (螢幕寬度一半, 高度 20%)
    // 如果是打玩家，位置在下面 (螢幕寬度一半, 高度 70%)
    const x = window.innerWidth / 2;
    const y = targetIsPlayer ? window.innerHeight * 0.7 : window.innerHeight * 0.2;

    const newText: FloatingText = { id, value: val, type, x, y };

    // 加入陣列
    this.floatingTexts.update(list => [...list, newText]);

    // 1秒後自動移除 (因為動畫只有1秒)
    setTimeout(() => {
      this.floatingTexts.update(list => list.filter(t => t.id !== id));
    }, 1000);
  }

  onPlayerAttack() {
    // 1. 先記錄舊血量
    const oldEnemyHp = this.combat.enemy().hp;
    const oldEnemyShield = this.combat.enemy().shield;

    // 2. 執行攻擊
    this.combat.playerAttack();

    // 3. 計算差值來顯示數字
    const newEnemyHp = this.combat.enemy().hp;
    const newEnemyShield = this.combat.enemy().shield;

    // 顯示傷害
    const dmg = oldEnemyHp - newEnemyHp;
    if (dmg > 0) this.spawnDamageText(dmg, 'damage', false); // false = 打怪物

    // 顯示破盾
    if (oldEnemyShield > 0 && newEnemyShield === 0 && this.combat.enemy().isBroken) {
      this.spawnDamageText('BREAK!', 'break', false);
    }
  }

  getPotionCount(): number {
    return this.combat.player().inventory.filter(i => i.type === 'potion').length;
  }
}