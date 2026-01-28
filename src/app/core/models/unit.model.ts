// # 角色/怪物 (Player, Enemy)

import { Item } from "./item.model";

// 1. 基底介面 (大家都有的東西)
export interface BaseUnit {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  isDead: boolean;

  // 戰鬥狀態 (大家都會暈眩、都會防禦)
  isBroken?: boolean;
  isBlocking?: boolean;
  stunCount?: number;

  stats: {
    minAtk: number;
    maxAtk: number;
    speed: number;
    def?: number; // 之後防禦力可能用到
  };
}

// 2. 玩家介面 (繼承 BaseUnit，並加上玩家專屬的)
export interface Player extends BaseUnit {
  type: 'player'; // 用這個字串來區分型別 (Discriminator)
  mp: number;
  maxMp: number;
  xp: number;     // 經驗值
  level: number;  // 等級
  inventory: Item[]; // 背包
  equipment: {    // 裝備
    weapon?: Item;
    armor?: Item;
  };
}

// 3. 怪物介面 (繼承 BaseUnit，並加上怪物專屬的)
export interface Enemy extends BaseUnit {
  type: 'enemy';
  shield: number;    // 假設只有怪物有護盾條 (如果玩家以後也有，可以移回 BaseUnit)
  maxShield: number;
  isCharging?: boolean; // 怪物蓄力大招
  dropTableId?: string; // 掉落物 ID
  level?: number;     // 等級
  xpReward?: number;  // 經驗值
}

// 4. 聯合型別 (Union Type)
// 當函式不確定是誰時，可以用這個
export type Unit = Player | Enemy;

// ==========================================
// ⭐ 新增：怪物圖鑑系統 (用於生成工廠)
// ==========================================

// 5. 怪物樣板 (定義一隻怪物原本長怎樣)
export interface EnemyTemplate {
  name: string;
  level: number;
  maxHp: number;
  maxShield: number;
  minAtk: number;
  maxAtk: number;
  speed: number;
  xpReward: number;
}

// 6. 怪物資料庫 (你可以隨時在這裡新增怪物)
export const ENEMY_TEMPLATES: EnemyTemplate[] = [
  {
    name: '🪵 訓練木樁',
    level: 1,
    maxHp: 50, maxShield: 30,
    minAtk: 1, maxAtk: 2, speed: 5,
    xpReward: 10
  },
  {
    name: '🟢 史萊姆',
    level: 2,
    maxHp: 80, maxShield: 10,
    minAtk: 8, maxAtk: 12, speed: 6,
    xpReward: 25
  },
  {
    name: '🦇 吸血蝙蝠',
    level: 3,
    maxHp: 100, maxShield: 20,
    minAtk: 12, maxAtk: 15, speed: 12,
    xpReward: 40
  },
  {
    name: '🛡️ 哥布林戰士',
    level: 5,
    maxHp: 150, maxShield: 50,
    minAtk: 15, maxAtk: 20, speed: 8,
    xpReward: 80
  },
  {
    name: '🐺 荒原狼',
    level: 7,
    maxHp: 200, maxShield: 0,
    minAtk: 20, maxAtk: 25, speed: 15,
    xpReward: 120
  },
  {
    name: '🐲 幼龍 (BOSS)',
    level: 10,
    maxHp: 500, maxShield: 100,
    minAtk: 30, maxAtk: 50, speed: 10,
    xpReward: 500
  }
];