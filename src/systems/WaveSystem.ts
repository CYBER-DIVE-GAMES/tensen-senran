import Phaser from 'phaser';
import { Enemy, ENEMY_CONFIGS } from '../entities/Enemy';
import { BulletPool } from '../utils/BulletPool';

export type WaveEvent =
  | { type: 'wave'; enemies: Array<{ key: keyof typeof ENEMY_CONFIGS; x: number }> }
  | { type: 'miniboss'; id: string }
  | { type: 'midboss'; id: string }
  | { type: 'boss'; id: string };

// 密度ティアが上がるインターバル（秒）
const DENSITY_INTERVAL = 30;
// ティアごとの密度増加量
const DENSITY_STEP = 0.25;
// 密度の上限
const DENSITY_MAX = 3.0;

// 周期スポナーの基本インターバル（秒）
const PERIODIC_BASE_INTERVAL = 20;
// 周期スポナーの最小インターバル（秒）
const PERIODIC_MIN_INTERVAL = 6;

// ステージ1のウェーブスケジュール（秒単位）
const STAGE1_SCHEDULE: Array<{ time: number; event: WaveEvent }> = [
  { time: 5,   event: { type: 'wave', enemies: [
    { key: 'foxfire', x: 100 }, { key: 'foxfire', x: 200 },
    { key: 'foxfire', x: 300 }, { key: 'foxfire', x: 400 },
  ]}},
  { time: 15,  event: { type: 'wave', enemies: [
    { key: 'ghost_warrior', x: 150 }, { key: 'ghost_warrior', x: 390 },
  ]}},
  { time: 25,  event: { type: 'wave', enemies: [
    { key: 'foxfire', x: 100 }, { key: 'ghost_warrior', x: 270 },
    { key: 'foxfire', x: 440 },
  ]}},
  { time: 40,  event: { type: 'wave', enemies: [
    { key: 'ghost_warrior', x: 80 },{ key: 'ghost_warrior', x: 180 },
    { key: 'ghost_warrior', x: 360 },{ key: 'ghost_warrior', x: 460 },
  ]}},
  { time: 60,  event: { type: 'miniboss', id: 'miniboss1' }},
  { time: 75,  event: { type: 'wave', enemies: [
    { key: 'foxfire', x: 100 }, { key: 'foxfire', x: 200 },
    { key: 'foxfire', x: 300 }, { key: 'foxfire', x: 400 },
    { key: 'foxfire', x: 500 },
  ]}},
  { time: 90,  event: { type: 'wave', enemies: [
    { key: 'ghost_warrior', x: 100 }, { key: 'ghost_warrior', x: 270 },
    { key: 'ghost_warrior', x: 440 },
  ]}},
];

export class WaveSystem {
  private scene: Phaser.Scene;
  private pool: BulletPool;
  private schedule: Array<{ time: number; event: WaveEvent }>;
  private elapsed: number = 0; // 秒
  private nextIndex: number = 0;
  private onBoss: (id: string, type: 'miniboss' | 'midboss' | 'boss') => void;

  // ウェーブ密度
  private density: number = 1.0;
  private densityTier: number = 0;

  // 周期スポナー
  private periodicTimer: number = 0;

  enemies: Enemy[] = [];

  constructor(
    scene: Phaser.Scene,
    pool: BulletPool,
    onBoss: (id: string, type: 'miniboss' | 'midboss' | 'boss') => void
  ) {
    this.scene = scene;
    this.pool = pool;
    this.schedule = STAGE1_SCHEDULE;
    this.onBoss = onBoss;
  }

  update(delta: number): void {
    this.elapsed += delta / 1000;

    // 密度ティアの更新（30秒ごとに+0.25、上限3.0）
    const newTier = Math.floor(this.elapsed / DENSITY_INTERVAL);
    if (newTier > this.densityTier) {
      this.densityTier = newTier;
      this.density = Math.min(DENSITY_MAX, 1.0 + this.densityTier * DENSITY_STEP);
    }

    // スケジュール消化
    while (
      this.nextIndex < this.schedule.length &&
      this.elapsed >= this.schedule[this.nextIndex].time
    ) {
      this.triggerEvent(this.schedule[this.nextIndex].event);
      this.nextIndex++;
    }

    // 周期スポナー（密度に応じてインターバルが縮まる）
    this.periodicTimer += delta / 1000;
    const periodicInterval = Math.max(PERIODIC_MIN_INTERVAL, PERIODIC_BASE_INTERVAL / this.density);
    if (this.periodicTimer >= periodicInterval) {
      this.periodicTimer = 0;
      this.spawnPeriodicWave();
    }

    // 敵の更新
    this.enemies = this.enemies.filter((e) => e.isAlive);
    this.enemies.forEach((e) => e.update(delta));
  }

  private triggerEvent(event: WaveEvent): void {
    if (event.type === 'wave') {
      const baseEnemies = event.enemies;
      // 密度に応じて追加敵を算出
      const totalCount = Math.round(baseEnemies.length * this.density);
      const extra = totalCount - baseEnemies.length;

      // 追加分のエントリを既存リストからランダムに補充
      const augmented = [...baseEnemies];
      for (let i = 0; i < extra; i++) {
        augmented.push(baseEnemies[i % baseEnemies.length]);
      }

      // x座標を画面幅に均等配置
      const width = this.scene.scale.width;
      const margin = 60;
      augmented.forEach((def, idx) => {
        const x = margin + ((width - margin * 2) / (augmented.length - 1 || 1)) * idx;
        const cfg = { ...ENEMY_CONFIGS[def.key], x, y: -40 };
        this.enemies.push(new Enemy(this.scene, cfg, this.pool));
      });
    } else if (event.type === 'miniboss') {
      this.onBoss(event.id, 'miniboss');
    } else if (event.type === 'midboss') {
      this.onBoss(event.id, 'midboss');
    } else if (event.type === 'boss') {
      this.onBoss(event.id, 'boss');
    }
  }

  // 密度スポナー：スケジュール外の継続的な敵補充
  private spawnPeriodicWave(): void {
    const width = this.scene.scale.width;
    const margin = 60;
    // 基本は foxfire、tier2以上で ghost_warrior が混入
    const pool: Array<keyof typeof ENEMY_CONFIGS> =
      this.densityTier >= 2
        ? ['foxfire', 'foxfire', 'ghost_warrior']
        : ['foxfire'];

    // 密度に比例した敵数（2〜8体）
    const count = Math.min(8, Math.round(2 * this.density));
    for (let i = 0; i < count; i++) {
      const key = pool[Math.floor(Math.random() * pool.length)];
      const x = margin + ((width - margin * 2) / (count - 1 || 1)) * i;
      const cfg = { ...ENEMY_CONFIGS[key], x, y: -40 };
      this.enemies.push(new Enemy(this.scene, cfg, this.pool));
    }
  }

  getDensity(): number { return this.density; }
  getDensityTier(): number { return this.densityTier; }
  getElapsed(): number { return this.elapsed; }
}
