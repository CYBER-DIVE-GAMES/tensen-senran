import Phaser from 'phaser';
import { Enemy, ENEMY_CONFIGS } from '../entities/Enemy';
import { BulletPool } from '../utils/BulletPool';

export type WaveEvent =
  | { type: 'wave'; enemies: Array<{ key: keyof typeof ENEMY_CONFIGS; x: number }> }
  | { type: 'miniboss'; id: string }
  | { type: 'midboss'; id: string }
  | { type: 'boss'; id: string };

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

    // スケジュール消化
    while (
      this.nextIndex < this.schedule.length &&
      this.elapsed >= this.schedule[this.nextIndex].time
    ) {
      this.triggerEvent(this.schedule[this.nextIndex].event);
      this.nextIndex++;
    }

    // 敵の更新
    this.enemies = this.enemies.filter((e) => e.isAlive);
    this.enemies.forEach((e) => e.update(delta));
  }

  private triggerEvent(event: WaveEvent): void {
    if (event.type === 'wave') {
      event.enemies.forEach((def) => {
        const cfg = { ...ENEMY_CONFIGS[def.key], x: def.x, y: -40 };
        const enemy = new Enemy(this.scene, cfg, this.pool);
        this.enemies.push(enemy);
      });
    } else if (event.type === 'miniboss') {
      this.onBoss(event.id, 'miniboss');
    } else if (event.type === 'midboss') {
      this.onBoss(event.id, 'midboss');
    } else if (event.type === 'boss') {
      this.onBoss(event.id, 'boss');
    }
  }

  getElapsed(): number { return this.elapsed; }
}
