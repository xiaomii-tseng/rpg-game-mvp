// # 裝備 (含 skillIds)

export type ItemType = 'weapon' | 'armor' | 'potion';
export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Item {
    id: string;
    name: string;
    type: ItemType;
    rarity: ItemRarity;

    // 數值 (可選，因為藥水可能沒有攻擊力)
    stats?: {
        minAtk?: number; // 最小攻擊
        maxAtk?: number; // 最大攻擊
        def?: number; // 防禦力
        hp?: number;  // 補血量
        mp?: number; // 藍水
    };

    // 描述
    description: string;
    price: number; // 賣價
}