import Phaser from 'phaser';
import { BulletPool } from '../utils/BulletPool';

export interface EnemyConfig {
  x: number;
  y: number;
  hp: number;
  speed: number;
  xp: number;
  youkakuDrop: number;    // 妖核ドロップ数
  youkakuChance: number;  // ドロップ確率 0.0〜1.0
  color: number;
  size: number;
  movePattern: 'straight' | 'zigzag' | 'wave';
  firePattern: 'none' | 'forward3' | 'radial8' | 'aimed1';
  fireInterval: number; // ms
  bulletDamage: number;
}

export const ENEMY_CONFIGS: Record<string, EnemyConfig> = {
  // ステージ1 基本敵
  foxfire: {
    x: 0, y: -40,
    hp: 30, speed: 120, xp: 5, youkakuDrop: 1, youkakuChance: 0.2,
    color: 0x88aaff, size: 14,
    movePattern: 'wave', firePattern: 'none', fireInterval: 9999, bulletDamage: 0,
  },
  ghost_warrior: {
    x: 0, y: -40,
    hp: 80, speed: 90, xp: 15, youkakuDrop: 1, youkakuChance: 0.4,
    color: 0xaaaadd, size: 18,
    movePattern: 'straight', firePattern: 'forward3', fireInterval: 2000, bulletDamage: 8,
  },
};

export class Enemy {
  readonly scene: Phaser.Scene;
  readonly sprite: Phaser.GameObjects.Arc;
  private pool: BulletPool;
  readonly config: EnemyConfig;

  hp: number;
  private timeSinceFire: number = 0;
  private zigzagDir: number = 1;
  private waveOffset: number = 0;
  isAlive: boolean = true;

  constructor(scene: Phaser.Scene, config: EnemyConfig, pool: BulletPool) {
    this.scene = scene;
    this.config = config;
    this.pool = pool;
    this.hp = config.hp;

    this.sprite = scene.add.circle(config.x, config.y, config.size, config.color);
    scene.physics.add.existing(this.sprite);
    this.sprite.setDepth(5);
  }

  update(delta: number): void {
    if (!this.isAlive) return;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;

    // 移動パターン
    switch (this.config.movePattern) {
      case 'straight':
        body.setVelocity(0, this.config.speed);
        break;
      case 'zigzag':
        this.waveOffset += delta * 0.003;
        if (this.waveOffset > 1) {
          this.waveOffset = 0;
          this.zigzagDir *= -1;
        }
        body.setVelocityX(this.config.speed * this.zigzagDir);
        body.setVelocityY(this.config.speed * 0.7);
        break;
      case 'wave':
        this.waveOffset += delta * 0.002;
        body.setVelocityX(Math.sin(this.waveOffset) * this.config.speed);
        body.setVelocityY(this.config.speed * 0.6);
        break;
    }

    // 射撃パターン
    if (this.config.firePattern !== 'none') {
      this.timeSinceFire += delta;
      if (this.timeSinceFire >= this.config.fireInterval) {
        this.fireBullets();
        this.timeSinceFire = 0;
      }
    }

    // 画面下に出たら消滅
    if (this.sprite.y > 1020) {
      this.kill();
    }
  }

  private fireBullets(): void {
    const x = this.sprite.x;
    const y = this.sprite.y;
    const spd = 200;
    const dmg = this.config.bulletDamage;

    switch (this.config.firePattern) {
      case 'forward3':
        this.pool.fire(this.scene, x, y, -spd * 0.3, spd, dmg, 'enemy', 0xff4444, 6);
        this.pool.fire(this.scene, x, y, 0, spd, dmg, 'enemy', 0xff4444, 6);
        this.pool.fire(this.scene, x, y, spd * 0.3, spd, dmg, 'enemy', 0xff4444, 6);
        break;
      case 'radial8':
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          this.pool.fire(
            this.scene, x, y,
            Math.cos(angle) * spd, Math.sin(angle) * spd,
            dmg, 'enemy', 0xff8888, 5
          );
        }
        break;
      case 'aimed1': {
        // プレイヤーに向けて高速1発
        const playerObjs = this.scene.children.list.filter(
          (c) => c.getData && c.getData('isPlayer')
        );
        if (playerObjs.length > 0) {
          const px = (playerObjs[0] as Phaser.GameObjects.Container).x;
          const py = (playerObjs[0] as Phaser.GameObjects.Container).y;
          const angle = Math.atan2(py - y, px - x);
          this.pool.fire(
            this.scene, x, y,
            Math.cos(angle) * spd * 1.5, Math.sin(angle) * spd * 1.5,
            dmg, 'enemy', 0xff2222, 7
          );
        }
        break;
      }
    }
  }

  takeDamage(amount: number): void {
    this.hp -= amount;
    // ヒットフラッシュ
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: { from: 0.3, to: 1 },
      duration: 80,
    });
    if (this.hp <= 0) this.kill();
  }

  kill(): void {
    if (!this.isAlive) return;
    this.isAlive = false;
    // 爆発演出
    const burst = this.scene.add.circle(this.sprite.x, this.sprite.y, this.config.size * 1.5, this.config.color, 0.8);
    this.scene.tweens.add({
      targets: burst,
      alpha: 0,
      scaleX: 3,
      scaleY: 3,
      duration: 300,
      onComplete: () => burst.destroy(),
    });
    this.sprite.destroy();
  }
}
