// # 角色/怪物 (Player, Enemy)

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
    atk: number;
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
  // inventory: Item[]; // 未來會加背包
}

// 3. 怪物介面 (繼承 BaseUnit，並加上怪物專屬的)
export interface Enemy extends BaseUnit {
  type: 'enemy';
  shield: number;    // 假設只有怪物有護盾條 (如果玩家以後也有，可以移回 BaseUnit)
  maxShield: number;
  isCharging?: boolean; // 怪物蓄力大招
  dropTableId?: string; // 掉落物 ID
}

// 4. 聯合型別 (Union Type)
// 當函式不確定是誰時，可以用這個
export type Unit = Player | Enemy;