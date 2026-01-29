// src/app/features/combat/services/combat-engine.service.ts
import { Injectable, signal } from '@angular/core';
import { Enemy, EnemyRole, Player } from '../../../core/models/unit.model';
import { Item } from '../../../core/models/item.model';
import { ENEMY_TEMPLATES, EnemyTemplate } from '../../../core/models/unit.model';
@Injectable({
  providedIn: 'root'
})
export class CombatEngineService {

  // ⭐ 新增：關卡進度狀態
  currentStage = signal<number>(1); // 預設第 1 關
  mapDifficulty = signal<number>(1); // 預設 1 星難度
  currentMapId = 'map_a';           // 預設打地圖 A
  maxStage = 15;                    // 總共 15 關


  // 使用 Angular 17+ 的 Signal，這樣 UI 會自動更新，不用寫 RxJS 訂閱
  player = signal<Player>(this.createDummyPlayer());
  enemy = signal<Enemy>(this.generateEnemy());
  isPlayerTurn = signal<boolean>(true);
  battleLog = signal<string[]>(['戰鬥開始！']);

  constructor() {
    this.loadData(); // 1. 程式一啟動，先嘗試讀檔
  }

  // --- 設定：Break ---
  private stunCount = 0;
  // --- 設定：藥水攜帶上限 ---
  private readonly MAX_POTIONS = 3;

  // --- 初始化假資料 (MVP 專用) ---
  private createDummyPlayer(): Player {
    return {
      type: 'player',
      id: 'p1', name: '勇者',
      hp: 100, maxHp: 100,
      mp: 50, maxMp: 50,
      xp: 0, level: 1,
      isDead: false,
      equipment: {},
      stats: { minAtk: 80, maxAtk: 120, speed: 10 },

      // ⭐ 修改這裡：一開始就送一瓶藥水
      inventory: [
        {
          id: 'starter-potion', // 給個固定 ID
          name: '🍷 紅色藥水 (測試)',
          type: 'potion',
          rarity: 'common',
          stats: { hp: 30 },
          description: '新手禮包，出門在外必備',
          price: 5
        }, {
          id: 'starter-potion', // 給個固定 ID
          name: '🍷 紅色藥水 (測試)',
          type: 'potion',
          rarity: 'common',
          stats: { hp: 30 },
          description: '新手禮包，出門在外必備',
          price: 5
        }, {
          id: 'starter-potion', // 給個固定 ID
          name: '🧪 藍色藥水 (測試)',
          type: 'potion',
          rarity: 'common',
          stats: { mp: 30 },
          description: '新手禮包，出門在外必備',
          price: 5
        }
      ]
    };
  }

  // ⭐ 生成怪物的邏輯
  private generateEnemy(): Enemy {
    const stage = this.currentStage();
    const star = this.mapDifficulty();

    // 1. 決定要生哪種階級的怪
    let targetRole: EnemyRole = 'normal';
    if (stage === 15) {
      targetRole = 'boss';
    } else if (stage === 5 || stage === 10) {
      targetRole = 'elite';
    }

    // 2. 從資料庫篩選出「目前地圖」且「符合階級」的怪
    const candidates = ENEMY_TEMPLATES.filter(t =>
      t.mapId === this.currentMapId && t.role === targetRole
    );

    // (防呆：如果沒篩到，就隨便拿一隻最爛的，避免當機)
    const template = candidates.length > 0
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : ENEMY_TEMPLATES[0];

    // 3. ⭐ 計算星級加成 (Difficulty Multiplier)
    // 假設每多 1 星，數值提升 20% (1星=1.0, 2星=1.2, 5星=1.8)
    const multiplier = 1 + (star - 1) * 0.2;

    return {
      type: 'enemy',
      id: Date.now().toString(),
      name: template.name,
      level: template.level, // 顯示用
      xpReward: Math.floor(template.xpReward * multiplier), // 經驗值也加倍

      // 數值乘上星級倍率
      maxHp: Math.floor(template.maxHp * multiplier),
      hp: Math.floor(template.maxHp * multiplier),
      maxShield: Math.floor(template.maxShield * multiplier),
      shield: Math.floor(template.maxShield * multiplier),

      stats: {
        minAtk: Math.floor(template.minAtk * multiplier),
        maxAtk: Math.floor(template.maxAtk * multiplier),
        speed: template.speed // 速度通常不建議隨星級提升，不然會太難
      },
      // ... 其他屬性
    } as any;
  }

  // --- 核心互動：玩家攻擊 ---
  playerAttack() {
    const p = this.player();
    const e = this.enemy();

    if (p.isDead || e.isDead || !this.isPlayerTurn()) return; // 鎖住按鈕

    // 1. 傷害公式 (這裡先簡單寫)
    // 如果怪物有盾，攻擊力打折 (例如只剩 20%)，但扣除護盾
    // 如果怪物破盾 (Broken)，傷害 100%
    let rawDamage = this.calculateDamage(p.stats.minAtk, p.stats.maxAtk);
    let finalDamage = rawDamage;
    const breakPower = 10; // 假設玩家破盾值是 10

    if (e.shield > 0) {
      // --- 護盾階段 ---
      e.shield -= breakPower;
      if (e.shield < 0) e.shield = 0;

      finalDamage = Math.floor(rawDamage * 0.2); // 有盾減傷 80%
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

    // 檢查勝利
    if (e.hp <= 0) {
      this.handleVictory(e, p); // ✅ 改成呼叫共用函式
      this.saveData();
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

    let finalDamage = Math.floor(this.calculateDamage(p.stats.minAtk, p.stats.maxAtk) * damageMult);

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
      this.handleVictory(e, p);
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

      let bigDmg = Math.floor(this.calculateDamage(e.stats.minAtk, e.stats.maxAtk) * 3);// 3倍傷害
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
      let dmg = this.calculateDamage(e.stats.minAtk, e.stats.maxAtk);
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

  // ⭐ 修改：戰鬥勝利後的推進邏輯
  resetBattle() {
    // 如果怪物死了，關卡 +1
    if (this.enemy().isDead) {
      const nextStage = this.currentStage() + 1;

      // 判斷是否通關
      if (nextStage > this.maxStage) {
        this.addLog('🎉 恭喜！你通關了這張地圖！');
        // 這裡未來可以做結算畫面，或是強制重置回第 1 關但升星級
        this.currentStage.set(1);
      } else {
        this.currentStage.set(nextStage);
        this.addLog(`➡️ 前進下一關：第 ${nextStage} / ${this.maxStage} 關`);
      }
    }

    // 生成新怪物 (會自動讀取新的 currentStage 來決定生什麼怪)
    const newEnemy = this.generateEnemy();
    this.enemy.set(newEnemy);
    // ...
  }

  private addLog(msg: string) {
    this.battleLog.update(logs => [...logs, msg]);
  }

  // --- 簡單的掉落工廠 (浮動傷害版) ---
  private generateRandomLoot(): Item {
    const dice = Math.random();

    // 🎲 0 ~ 0.2 : 紅水 (20%)
    if (dice < 0.2) {
      return {
        id: Date.now().toString(),
        name: '🍷 紅色藥水',
        type: 'potion',
        rarity: 'common',
        stats: { hp: 30 },
        description: '恢復少量生命',
        price: 5
      };
    }

    // 🎲 0.2 ~ 0.4 : 藍水 (20%) ⭐ 新增這段
    if (dice >= 0.2 && dice < 0.4) {
      return {
        id: Date.now().toString(),
        name: '🧪 藍色藥水',
        type: 'potion',
        rarity: 'common',
        stats: { mp: 20 }, // 補 20 MP
        description: '恢復少量魔力',
        price: 10
      };
    }

    const isRare = Math.random() > 0.7; // 30% 機率掉稀有

    // 🎲 計算浮動數值
    let min, max;

    if (isRare) {
      // 稀有武器：例如 15 ~ 25
      min = Math.floor(Math.random() * 5) + 15;
      max = min + Math.floor(Math.random() * 10) + 5;
    } else {
      // 普通武器：例如 3 ~ 8
      min = Math.floor(Math.random() * 3) + 3;
      max = min + Math.floor(Math.random() * 5) + 2;
    }

    return {
      id: Date.now().toString(),
      name: isRare ? '🔥 烈焰之劍' : '🔪 破舊的匕首',
      type: 'weapon',
      rarity: isRare ? 'rare' : 'common',
      stats: {
        minAtk: min,
        maxAtk: max
      },
      description: isRare ? '燃燒著火焰的魔法劍' : '生鏽的鐵片，勉強能用',
      price: isRare ? 100 : 10
    };
  }

  // --- 使用物品 (整合了 喝水 與 穿裝備) ---
  useItem(item: Item) {
    const p = this.player();
    const e = this.enemy(); // ⭐ 1. 取得怪物狀態，用來判斷是否在戰鬥中

    // ===========================
    // 情況 A: 喝藥水 (Potion)
    // ===========================
    if (item.type === 'potion') {

      // --- 情況 A-1: 紅水 (補血) ---
      if (item.stats?.hp) {
        if (p.hp >= p.maxHp) {
          this.addLog('❌ 生命值已滿，不需要喝藥水。');
          return;
        }
        const oldVal = p.hp;
        p.hp += item.stats.hp;
        if (p.hp > p.maxHp) p.hp = p.maxHp;
        this.addLog(`🍷 你喝下了 [${item.name}]，恢復了 ${p.hp - oldVal} 點生命！`);
      }

      // --- 情況 A-2: 藍水 (補魔) ---
      else if (item.stats?.mp) {
        if (p.mp >= p.maxMp) {
          this.addLog('❌ 魔力值已滿，不需要喝藥水。');
          return;
        }
        const oldVal = p.mp;
        p.mp += item.stats.mp;
        if (p.mp > p.maxMp) p.mp = p.maxMp;
        this.addLog(`🧪 你喝下了 [${item.name}]，恢復了 ${p.mp - oldVal} 點魔力！`);
      }

      // --- 共用邏輯：消耗物品 & 回合計算 ---

      // 1. 從背包移除
      const index = p.inventory.indexOf(item);
      if (index > -1) p.inventory.splice(index, 1);

      // 2. 戰鬥中要消耗回合
      if (!e.isDead) {
        this.isPlayerTurn.set(false);
        this.addLog('⏳ 喝藥水花費了一些時間...');
        this.player.set({ ...p }); // 更新 UI

        setTimeout(() => {
          this.monsterTurn();
        }, 1000);
        return;
      }

      // 戰鬥外不消耗回合
      this.player.set({ ...p });
      return;
    }

    // ===========================
    // 情況 B: 穿裝備 (Weapon)
    // ===========================
    if (item.type === 'weapon') {
      // 1. 脫舊裝備
      if (p.equipment.weapon) {
        p.inventory.push(p.equipment.weapon);
      }

      // 2. 穿新裝備
      const index = p.inventory.indexOf(item);
      if (index > -1) {
        p.inventory.splice(index, 1);
      }
      p.equipment.weapon = item;
      this.addLog(`🦾 裝備了 [${item.name}]！`);

      // 3. 重算數值 (含等級成長)
      const baseMin = p.stats.minAtk + (p.level - 1) * 2;
      const baseMax = p.stats.maxAtk + (p.level - 1) * 3;
      const weaponMin = item.stats?.minAtk || 0;
      const weaponMax = item.stats?.maxAtk || 0;

      p.stats.minAtk = baseMin + weaponMin;
      p.stats.maxAtk = baseMax + weaponMax;

      this.addLog(`💪 攻擊力提升為：${p.stats.minAtk} ~ ${p.stats.maxAtk}`);

      // 裝備通常不算回合 (或是你想算也可以，這裡目前是不算)
      this.player.set({ ...p });
    }
    this.saveData();
  }

  private calculateDamage(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // 統一處理勝利邏輯 (避免普攻有掉寶，技能卻忘了寫)
  private handleVictory(e: Enemy, p: Player) {
    e.hp = 0;
    e.isDead = true;

    // 經驗值
    const monsterXp = (e as any).xpReward || 0;
    this.gainXp(monsterXp);

    // 產生戰利品
    const loot = this.generateRandomLoot();

    // 判斷戰利品進背包 (加入藥水限制)
    if (loot.type === 'potion') {
      const currentPotions = p.inventory.filter(i => i.type === 'potion').length;

      if (currentPotions >= this.MAX_POTIONS) {
        // ❌ 背包滿了
        this.addLog(`🎁 怪物掉落了 [${loot.name}]，但你背包藥水已滿 (${this.MAX_POTIONS}/${this.MAX_POTIONS})，只好留在原地...`);
      } else {
        // ✅ 還有空間
        p.inventory.push(loot);
        this.addLog(`🏆 戰鬥勝利！`);
        this.addLog(`🎁 獲得補給：[${loot.name}] (HP +${loot.stats?.hp})`);
      }
    } else {
      // 裝備類直接撿 (假設裝備無限背包，或是之後再做限制)
      p.inventory.push(loot);
      this.addLog(`🏆 戰鬥勝利！`);
      this.addLog(`🎁 獲得戰利品：[${loot.name}] (ATK: ${loot.stats?.minAtk} ~ ${loot.stats?.maxAtk})`);
    }


    this.addLog(`🏆 戰鬥勝利！`);
    this.addLog(`🎁 獲得戰利品：[${loot.name}] (ATK: ${loot.stats?.minAtk} ~ ${loot.stats?.maxAtk})`);

    // 3. 更新 UI
    this.enemy.set({ ...e });
    this.player.set({ ...p });
  }

  // --- 獲得經驗值與升級邏輯 ---
  private gainXp(amount: number) {
    const p = this.player();

    // 1. 獲得經驗
    p.xp += amount;
    this.addLog(`✨ 獲得經驗值：${amount} XP`);

    // 2. 判斷升級 (使用 while 迴圈，以防一次獲得太多經驗連升兩級)
    // 設定：升級所需經驗 = 目前等級 * 100 (Lv1->2 要 100xp, Lv2->3 要 200xp...)
    let requiredXp = p.level * 100;

    while (p.xp >= requiredXp) {
      // --- 發生升級！ ---
      p.xp -= requiredXp; // 扣除門檻值 (保留溢出的 XP)
      p.level++;

      // 3. 提升數值 (成長曲線)
      p.maxHp += 20;  // 血量上限 +20
      p.maxMp += 10;  // 魔力上限 +10

      // 基礎攻擊力提升
      p.stats.minAtk += 2;
      p.stats.maxAtk += 3;

      // 4. 升級福利：血魔全滿！
      p.hp = p.maxHp;
      p.mp = p.maxMp;

      this.addLog(`🎉 恭喜升級！(Lv.${p.level}) 生命/魔力全滿，能力值提升！`);

      // 重新計算下一級門檻
      requiredXp = p.level * 100;
    }

    // 更新 UI
    this.player.set({ ...p });
  }

  // --- 💾 存檔系統 (LocalStorage) ---
  private saveData() {
    const data = {
      player: this.player(),
      enemy: this.enemy(),
      // 也可以存 log，但通常讀檔時清空 log 比較乾淨
    };
    localStorage.setItem('my_rpg_save_v1', JSON.stringify(data));
    // console.log('Game Saved!'); // 測試時可以打開看
  }

  private loadData() {
    const saved = localStorage.getItem('my_rpg_save_v1');
    if (saved) {
      const data = JSON.parse(saved);

      // 恢復玩家狀態
      this.player.set(data.player);

      // 恢復怪物狀態 (或是你想讀檔時直接生一隻新的也可以)
      this.enemy.set(data.enemy);

      this.addLog('📂 讀取存檔成功！歡迎回來，勇者。');
    } else {
      this.addLog('🌟 歡迎來到新的冒險！');
    }
  }

  // --- 🗑️ 刪除存檔 (讓玩家可以重玩) ---
  hardReset() {
    localStorage.removeItem('my_rpg_save_v1');
    location.reload(); // 強制重新整理頁面
  }
}