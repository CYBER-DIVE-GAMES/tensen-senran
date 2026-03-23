export class XPSystem {
  private xp: number = 0;
  private level: number = 1;
  private onLevelUp: (level: number) => void;

  // XP閾値テーブル（次のレベルへ必要なXP）
  private static readonly XP_TABLE: number[] = [
    0,    // Lv1
    100,  // Lv2
    150,  // Lv3
    200,  // Lv4
    200,  // Lv5
    350,  // Lv6
    350,  // Lv7
    350,  // Lv8
    350,  // Lv9
    350,  // Lv10
  ];

  constructor(onLevelUp: (level: number) => void) {
    this.onLevelUp = onLevelUp;
  }

  addXP(amount: number): void {
    this.xp += amount;
    this.checkLevelUp();
  }

  private checkLevelUp(): void {
    const needed = this.xpForNext();
    if (needed > 0 && this.xp >= needed) {
      this.xp -= needed;
      this.level++;
      this.onLevelUp(this.level);
      // 連続レベルアップチェック
      this.checkLevelUp();
    }
  }

  private xpForNext(): number {
    const idx = this.level - 1;
    if (idx >= XPSystem.XP_TABLE.length) {
      // Lv11以降は500固定
      return 500;
    }
    return XPSystem.XP_TABLE[idx];
  }

  getLevel(): number { return this.level; }
  getXP(): number { return this.xp; }

  getXPRatio(): number {
    const needed = this.xpForNext();
    if (needed <= 0) return 1;
    return this.xp / needed;
  }
}
