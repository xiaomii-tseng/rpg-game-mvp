// src/app/features/combat/services/combat-engine.service.ts
import { Injectable, signal } from '@angular/core';
import { Enemy, Player, Unit } from '../../../core/models/unit.model';

@Injectable({
  providedIn: 'root'
})
export class CombatEngineService {

  // 使用 Angular 17+ 的 Signal，這樣 UI 會自動更新，不用寫 RxJS 訂閱
  player = signal<Player>(this.createDummyPlayer());
  enemy = signal<Enemy>(this.createDummyEnemy());
  isPlayerTurn = signal<boolean>(true);
  battleLog = signal<string[]>(['戰鬥開始！']);
  constructor() { }

  private stunCount = 0;

  // --- 初始化假資料 (MVP 專用) ---
  private createDummyPlayer(): Player { // 回傳 Player
    return {
      type: 'player',
      id: 'p1', name: '勇者',
      hp: 100, maxHp: 100,
      mp: 50, maxMp: 50,
      xp: 0, level: 1,
      isDead: false,
      stats: { atk: 10, speed: 10 }
    };
  }

  private createDummyEnemy(): Enemy { // 回傳 Enemy
    return {
      type: 'enemy',
      id: 'e1', name: '測試木樁',
      hp: 100, maxHp: 100,
      shield: 50, maxShield: 50,
      isDead: false,
      stats: { atk: 5, speed: 5 }
    };
  }

  // --- 核心互動：玩家攻擊 ---
  playerAttack() {
    const p = this.player();
    const e = this.enemy();

    if (p.isDead || e.isDead || !this.isPlayerTurn()) return; // 鎖住按鈕

    // 1. 傷害公式 (這裡先簡單寫)
    // 如果怪物有盾，攻擊力打折 (例如只剩 20%)，但扣除護盾
    // 如果怪物破盾 (Broken)，傷害 100%

    let finalDamage = p.stats.atk;
    const breakPower = 10; // 假設玩家破盾值是 10

    if (e.shield > 0) {
      // --- 護盾階段 ---
      e.shield -= breakPower;
      if (e.shield < 0) e.shield = 0;

      finalDamage = Math.floor(p.stats.atk * 0.2); // 有盾減傷 80%
      this.addLog(`玩家攻擊！造成 ${finalDamage} 傷害 (護盾受損 -${breakPower})`);

      if (e.shield === 0) {
        e.isBroken = true;
        this.stunCount = 1;
        this.addLog('>>> 怪物破防 (BREAK)！下一次攻擊將造成全額傷害！');
      }
    } else {
      // --- 破盾階段 ---
      this.addLog(`玩家重擊 (Break)！造成 ${finalDamage} 傷害`);
    }

    // 2. 扣血
    e.hp -= finalDamage;
    // ===========================
    // ⭐ 3. 結算與回合切換 (這裡是修改的重點)
    // ===========================

    // 情況 A: 怪物死了 -> 戰鬥結束
    if (e.hp <= 0) {
      e.hp = 0;
      e.isDead = true;
      this.addLog('🏆 戰鬥勝利！獲得 破舊的長劍 (假)');

      // 更新 UI 並結束函式 (不讓怪物行動)
      this.enemy.set({ ...e });
      return;
    }

    // 情況 B: 怪物還活著 -> 更新 UI，換怪物行動
    this.enemy.set({ ...e });

    // 🔥 鎖住玩家按鈕
    this.isPlayerTurn.set(false);
    this.addLog('⏳ 輪到怪物行動...');

    // ⏰ 模擬思考時間：1秒後怪物才出招 (這樣比較有節奏感)
    setTimeout(() => {
      this.monsterTurn();
    }, 1000);
  }

  // --- 玩家技能：重擊 ---
  playerSkill() {
    const p = this.player();
    const e = this.enemy();

    // 1. 檢查：魔力夠不夠？
    if (p.mp < 20) {
      this.addLog('❌ 魔力不足！無法使用重擊');
      return;
    }

    // 基本檢查 (是否輪到玩家、是否死亡)
    if (p.isDead || e.isDead || !this.isPlayerTurn()) return;

    // 2. 扣除 MP
    p.mp -= 20;

    // 3. 技能傷害計算
    // 設定：重擊對「護盾」有 2 倍傷害
    let damageMult = 1.5; // 基礎倍率 150%
    let breakBonus = 20;  // 額外破盾值 (普攻是 10)

    let finalDamage = Math.floor(p.stats.atk * damageMult);

    if (e.shield > 0) {
      // --- 護盾階段 ---
      e.shield -= breakBonus; // 破盾超快！
      if (e.shield < 0) e.shield = 0;

      finalDamage = Math.floor(finalDamage * 0.2); // 一樣被減傷
      this.addLog(`🔥 玩家使用【重擊】！造成 ${finalDamage} 傷害 (護盾重創 -${breakBonus})`);

      if (e.shield === 0) {
        e.isBroken = true;
        this.stunCount = 1; // 暈眩
        this.addLog('>>> 💥 怪物破防 (BREAK)！');
        // 這裡如果你有做 Floating Text，記得呼叫 spawnDamageText
      }
    } else {
      // --- 破盾後的直擊 ---
      this.addLog(`🔥 玩家【重擊】爆發！造成 ${finalDamage} 巨額傷害`);
    }

    // 4. 扣血與結算
    e.hp -= finalDamage;

    // 更新玩家 MP 顯示
    this.player.set({ ...p });

    // 檢查勝利與回合切換 (這部分跟普攻一樣，可以直接複製貼上，或是抽成共用函式)
    if (e.hp <= 0) {
      e.hp = 0;
      e.isDead = true;
      this.addLog('🏆 戰鬥勝利！');
      this.enemy.set({ ...e });
      return;
    }

    this.enemy.set({ ...e });
    this.isPlayerTurn.set(false);
    this.addLog('⏳ 輪到怪物行動...');

    setTimeout(() => {
      this.monsterTurn();
    }, 1000);
  }

  // --- 玩家技能：格擋 ---
  playerGuard() {
    const p = this.player();

    // 1. 設定格擋狀態
    p.isBlocking = true;
    this.addLog('🛡️ 你舉起了盾牌！(下一次受到的傷害減少 70%)');

    // 2. 更新 UI 並結束回合
    this.player.set({ ...p });
    this.isPlayerTurn.set(false);

    setTimeout(() => {
      this.monsterTurn();
    }, 1000);
  }

  // --- 怪物回合 ---
  monsterTurn() {
    const e = this.enemy();
    const p = this.player();

    if (e.isDead || p.isDead) return;

    // ===========================
    // 1. 優先處理：暈眩狀態
    // ===========================
    if (e.isBroken) {
      if (this.stunCount > 0) {
        this.stunCount--;
        this.addLog('💤 怪物暈眩中... (無法行動)');
        this.enemy.set({ ...e });
        this.endMonsterTurn();
        return;
      } else {
        e.isBroken = false;
        this.addLog('⚠️ 怪物從暈眩中甦醒了！眼神充滿殺氣...');
        // 醒來後繼續往下執行，進行行動
      }
    }

    // ===========================
    // 2. 優先處理：大招釋放 (如果上回合蓄力了)
    // ===========================
    if (e.isCharging) {
      e.isCharging = false; // 消耗掉蓄力狀態

      this.addLog('🔥 怪物釋放必殺技【毀滅重擊】！');

      let bigDmg = e.stats.atk * 3; // 3倍傷害！
      let isBlocked = false;

      // 🛡️ 判定格擋
      if (p.isBlocking) {
        if (Math.random() < 0.7) { // 70% 機率格擋
          bigDmg = 0;
          isBlocked = true;
          this.addLog(`✨ 【格擋大成功】！你擋下了怪物的必殺技！`);
        } else {
          this.addLog(`💔 【格擋失敗】！巨大的衝擊力震飛了盾牌！`);
        }
      }

      // 扣血
      p.hp -= bigDmg;
      if (p.hp < 0) p.hp = 0;

      if (!isBlocked && bigDmg > 0) {
        this.addLog(`💥 你受到 ${bigDmg} 點毀滅性傷害！`);
      }

      // 結算並結束
      this.finishTurn(e, p);
      return;
    }

    // ===========================
    // 3. 一般 AI 決策 (骰子)
    // ===========================
    const dice = Math.random();

    if (dice < 0.3) {
      // 🔥 30% 機率：開始蓄力 (Telegraphing)
      e.isCharging = true;
      this.addLog('⚠️ 怪物開始積蓄能量... (警告：下回合將釋放強力攻擊！)');
      // 蓄力這回合通常不動，給玩家準備時間

    } else if (dice < 0.4) {
      // 🛡️ 10% 機率：補盾
      const healAmount = 15;
      const oldShield = e.shield;
      e.shield += healAmount;
      if (e.shield > e.maxShield) e.shield = e.maxShield;
      this.addLog(`🛡️ 怪物施放【鋼鐵防禦】！護盾恢復了 ${e.shield - oldShield} 點`);

    } else {
      // ⚔️ 60% 機率：普通攻擊
      let dmg = e.stats.atk;
      let isBlocked = false;

      if (p.isBlocking) {
        if (Math.random() < 0.7) {
          dmg = 0;
          isBlocked = true;
          this.addLog(`🛡️ 【格擋成功】！完美抵消傷害`);
        } else {
          this.addLog(`💔 【格擋失敗】！受到傷害`);
        }
      }

      p.hp -= dmg;
      if (p.hp < 0) p.hp = 0;

      if (!isBlocked && dmg > 0) {
        this.addLog(`👾 怪物施放【衝撞】！對你造成 ${dmg} 點傷害`);
      }
    }

    // 結算
    this.finishTurn(e, p);
  }

  // 統一處理結算 (減少重複代碼)
  private finishTurn(e: Enemy, p: Player) {
    // 1. 檢查死亡
    if (p.hp <= 0) {
      p.isDead = true;
      this.addLog('💀 你被打敗了...');
    }

    // 2. 更新 Signal (讓畫面變動)
    this.enemy.set({ ...e });
    this.player.set({ ...p });

    // 3. 結束回合
    this.endMonsterTurn();
  }

  // 交棒回給玩家
  private endMonsterTurn() {
    const p = this.player();

    // ⭐⭐ 關鍵修正：輪到玩家時，必須把盾牌放下！ ⭐⭐
    // 如果不加這行，玩家按一次格擋後就會永遠有無敵效果
    p.isBlocking = false;
    this.player.set({ ...p });

    this.isPlayerTurn.set(true);
    // this.addLog('--- 輪到你的回合 ---'); // 選用：看你想不想顯示這行
  }

  // 重置戰鬥
  resetBattle() {
    this.player.set(this.createDummyPlayer());
    this.enemy.set(this.createDummyEnemy());
    this.battleLog.set(['戰鬥重置']);
    // ⭐ 修正：必須重置所有計數器
    this.stunCount = 0;
    this.isPlayerTurn.set(true); // 確保按鈕解鎖
  }

  private addLog(msg: string) {
    this.battleLog.update(logs => [...logs, msg]);
  }
}