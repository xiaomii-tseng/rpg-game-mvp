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

// 定義怪物的階級
export type EnemyRole = 'normal' | 'elite' | 'boss'; 
// normal=小怪, elite=小王(5/10關), boss=大王(15關)

// 5. 怪物樣板 (定義一隻怪物原本長怎樣)
export interface EnemyTemplate {
  id: string;        // 建議加個 id 方便辨識
  name: string;
  mapId: string;     // ⭐ 新增：這隻怪屬於哪張地圖 (例如 'map_01_forest')
  role: EnemyRole;   // ⭐ 新增：它是哪種階級
  level: number;
  maxHp: number;
  maxShield: number;
  minAtk: number;
  maxAtk: number;
  speed: number;
  xpReward: number;
}

// 範例資料：假設這是「Map A (森林)」的怪物池
export const ENEMY_TEMPLATES: EnemyTemplate[] = [
  // --- 小怪 (Normal) ---
  { id: 'm1', name: '🟢 史萊姆', mapId: 'map_a', role: 'normal', level: 1, maxHp: 80, maxShield: 0, minAtk: 8, maxAtk: 12, speed: 6, xpReward: 25 },
  { id: 'm2', name: '🦇 吸血蝙蝠', mapId: 'map_a', role: 'normal', level: 2, maxHp: 100, maxShield: 0, minAtk: 12, maxAtk: 15, speed: 12, xpReward: 40 },
  // ... (你可以自己補更多小怪)

  // --- 小王 (Elite - 出現在 5, 10 關) ---
  { id: 'e1', name: '🛡️ 哥布林隊長', mapId: 'map_a', role: 'elite', level: 5, maxHp: 300, maxShield: 50, minAtk: 25, maxAtk: 35, speed: 9, xpReward: 150 },
  { id: 'e2', name: '🐺 荒原狼王', mapId: 'map_a', role: 'elite', level: 5, maxHp: 250, maxShield: 0, minAtk: 35, maxAtk: 45, speed: 16, xpReward: 160 },

  // --- 大王 (Boss - 出現在 15 關) ---
  { id: 'b1', name: '🐲 幼龍', mapId: 'map_a', role: 'boss', level: 10, maxHp: 1000, maxShield: 200, minAtk: 50, maxAtk: 80, speed: 12, xpReward: 1000 },
];