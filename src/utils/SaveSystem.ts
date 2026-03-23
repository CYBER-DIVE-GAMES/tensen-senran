const SAVE_KEY = 'tensen_senran_save';

export interface SaveData {
  youkaku: number;
  upgrades: Record<string, number>;
  clearedStages: number[];
}

const DEFAULT_SAVE: SaveData = {
  youkaku: 0,
  upgrades: {},
  clearedStages: [],
};

export class SaveSystem {
  static load(): SaveData {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return { ...DEFAULT_SAVE };
      return { ...DEFAULT_SAVE, ...JSON.parse(raw) } as SaveData;
    } catch {
      return { ...DEFAULT_SAVE };
    }
  }

  static save(data: SaveData): void {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  }

  static addYoukaku(amount: number): void {
    const data = this.load();
    data.youkaku += amount;
    this.save(data);
  }

  static removeYoukaku(amount: number): void {
    const data = this.load();
    data.youkaku = Math.max(0, data.youkaku - amount);
    this.save(data);
  }

  static markStageCleared(stage: number): void {
    const data = this.load();
    if (!data.clearedStages.includes(stage)) {
      data.clearedStages.push(stage);
    }
    this.save(data);
  }
}
