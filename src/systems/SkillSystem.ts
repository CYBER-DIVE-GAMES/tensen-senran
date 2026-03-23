import { PlayerStats } from '../entities/Player';

export interface SkillDef {
  id: string;
  name: string;
  category: 'A' | 'B' | 'C' | 'D' | 'G' | 'K';
  color: number; // カードの色
  maxLevel: number;
  description: (level: number) => string;
  apply: (stats: PlayerStats, level: number) => void;
}

// フェーズ1実装スキル（5種）
export const SKILLS: SkillDef[] = [
  {
    id: 'A3_rapid_fire',
    name: '急速連射',
    category: 'A',
    color: 0xff4444,
    maxLevel: 3,
    description: (lv) => ['攻撃速度 +30%', '攻撃速度 +60%', '攻撃速度 +100%'][lv - 1],
    apply: (stats, lv) => {
      const mult = [0.7, 0.625, 0.5][lv - 1];
      stats.fireInterval = 500 * mult;
    },
  },
  {
    id: 'A9_crit_rate',
    name: 'クリ率上昇',
    category: 'A',
    color: 0xff6622,
    maxLevel: 3,
    description: (lv) => [`クリ率 +10%（現在${lv * 10}%）`, `クリ率 +20%（現在${lv * 10}%）`, `クリ率 +35%（現在35%）`][lv - 1],
    apply: (stats, lv) => {
      stats.critChance = [0.10, 0.20, 0.35][lv - 1];
    },
  },
  {
    id: 'B1_hp_up',
    name: 'HP増加',
    category: 'B',
    color: 0x4488ff,
    maxLevel: 3,
    description: (lv) => [`最大HP +20%`, `最大HP +40%`, `最大HP +70%`][lv - 1],
    apply: (stats, lv) => {
      const mult = [1.2, 1.4, 1.7][lv - 1];
      stats.maxHp = Math.floor(100 * mult);
      stats.hp = Math.min(stats.hp, stats.maxHp);
    },
  },
  {
    id: 'B2_regen',
    name: '再生の流れ',
    category: 'B',
    color: 0x2266ff,
    maxLevel: 3,
    description: (lv) => [`HP 毎秒 1% 回復`, `HP 毎秒 2% 回復`, `HP 毎秒 4% 回復`][lv - 1],
    apply: (_stats, _lv) => {
      // StageScene 側で regenLevel を読んで処理
    },
  },
  {
    id: 'C9_bullet_speed',
    name: '弾速上昇',
    category: 'C',
    color: 0xff8800,
    maxLevel: 3,
    description: (lv) => [`弾速 +20%`, `弾速 +40%`, `弾速 +70% + 貫通付与`][lv - 1],
    apply: (stats, lv) => {
      stats.bulletSpeed = [480, 560, 680][lv - 1];
    },
  },
];

export class SkillSystem {
  // skillId → 現在レベル
  private acquired: Map<string, number> = new Map();

  getAcquired(): Map<string, number> {
    return this.acquired;
  }

  getSkillLevel(id: string): number {
    return this.acquired.get(id) ?? 0;
  }

  /** 3枚ランダムに選ぶ（同じスキルでもLv上限以内なら再選択可能） */
  drawCards(count: number = 3): SkillDef[] {
    const available = SKILLS.filter((s) => {
      const lv = this.getSkillLevel(s.id);
      return lv < s.maxLevel;
    });

    if (available.length === 0) return [];

    Phaser.Utils.Array.Shuffle(available);
    return available.slice(0, Math.min(count, available.length));
  }

  /** スキルを取得してプレイヤーへ適用する */
  acquire(skillId: string, playerStats: PlayerStats): void {
    const skill = SKILLS.find((s) => s.id === skillId);
    if (!skill) return;

    const currentLv = this.getSkillLevel(skillId);
    if (currentLv >= skill.maxLevel) return;

    const newLv = currentLv + 1;
    this.acquired.set(skillId, newLv);
    skill.apply(playerStats, newLv);
  }
}
