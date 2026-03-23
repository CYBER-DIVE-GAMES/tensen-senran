import Phaser from 'phaser';
import { BulletPool } from '../utils/BulletPool';

export interface PlayerStats {
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  fireInterval: number; // ms
  bulletSpeed: number;
  critChance: number;   // 0.0〜1.0
  critMultiplier: number;
}

export class Player {
  private scene: Phaser.Scene;
  readonly sprite: Phaser.GameObjects.Container;
  private body!: Phaser.Physics.Arcade.Body;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: { A: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private pool: BulletPool;
  private lastFireTime: number = 0;
  private invincibleUntil: number = 0;

  stats: PlayerStats;
  isAlive: boolean = true;

  // HP バー
  private hpBarBg: Phaser.GameObjects.Rectangle;
  private hpBar: Phaser.GameObjects.Rectangle;
  private hpText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, pool: BulletPool) {
    this.scene = scene;
    this.pool = pool;

    this.stats = {
      hp: 100,
      maxHp: 100,
      speed: 200,
      damage: 10,
      fireInterval: 500,
      bulletSpeed: 400,
      critChance: 0.05,
      critMultiplier: 2.0,
    };

    // スプライト（プログラム描画）
    const body = scene.add.rectangle(0, 0, 28, 36, 0xddddff);
    const head = scene.add.circle(0, -22, 12, 0xffeedd);
    const sword = scene.add.rectangle(18, -5, 6, 28, 0x88aaff);
    const ear1 = scene.add.triangle(0, -34, -8, 0, 8, 0, 0, -14, 0xddddff);
    const ear2 = scene.add.triangle(0, -34, -8, 0, 8, 0, 0, -14, 0xddddff).setX(-2);

    this.sprite = scene.add.container(270, 880, [ear1, ear2, body, head, sword]);
    this.sprite.setDepth(10);

    scene.physics.add.existing(this.sprite);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setCollideWorldBounds(true);
    this.body.setSize(28, 36);
    this.body.setOffset(-14, -18);

    // キーボード
    if (scene.input.keyboard) {
      this.cursors = scene.input.keyboard.createCursorKeys();
      this.wasdKeys = {
        A: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        D: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
    }

    // HP バー（画面上部）
    this.hpBarBg = scene.add.rectangle(15, 20, 200, 16, 0x333333).setOrigin(0, 0.5).setDepth(100);
    this.hpBar = scene.add.rectangle(15, 20, 200, 16, 0x44ff44).setOrigin(0, 0.5).setDepth(101);
    this.hpText = scene.add.text(120, 20, 'HP 100/100', {
      fontSize: '13px',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(102);
  }

  update(time: number): void {
    if (!this.isAlive) return;

    // 左右移動のみ
    const left = this.cursors.left.isDown || this.wasdKeys.A.isDown;
    const right = this.cursors.right.isDown || this.wasdKeys.D.isDown;

    if (left) {
      this.body.setVelocityX(-this.stats.speed);
    } else if (right) {
      this.body.setVelocityX(this.stats.speed);
    } else {
      this.body.setVelocityX(0);
    }
    this.body.setVelocityY(0);

    // 自動射撃
    if (time - this.lastFireTime >= this.stats.fireInterval) {
      this.firePlayerBullet();
      this.lastFireTime = time;
    }

    // HP バー更新
    const ratio = this.stats.hp / this.stats.maxHp;
    this.hpBar.width = 200 * ratio;
    const color = ratio > 0.5 ? 0x44ff44 : ratio > 0.25 ? 0xffaa00 : 0xff2222;
    this.hpBar.setFillStyle(color);
    this.hpText.setText(`HP ${this.stats.hp}/${this.stats.maxHp}`);

    // 無敵中は点滅
    if (time < this.invincibleUntil) {
      this.sprite.setAlpha(Math.sin(time / 60) > 0 ? 1 : 0.3);
    } else {
      this.sprite.setAlpha(1);
    }
  }

  private firePlayerBullet(): void {
    const isCrit = Math.random() < this.stats.critChance;
    const dmg = isCrit
      ? Math.floor(this.stats.damage * this.stats.critMultiplier)
      : this.stats.damage;
    const color = isCrit ? 0xffdd00 : 0x88ccff;
    const radius = isCrit ? 7 : 5;

    this.pool.fire(
      this.scene,
      this.sprite.x,
      this.sprite.y - 20,
      0,
      -this.stats.bulletSpeed,
      dmg,
      'player',
      color,
      radius
    );
  }

  takeDamage(amount: number, time: number): void {
    if (time < this.invincibleUntil) return;
    this.stats.hp = Math.max(0, this.stats.hp - amount);
    this.invincibleUntil = time + 1000; // 1秒無敵
    if (this.stats.hp <= 0) {
      this.isAlive = false;
    }
  }

  heal(amount: number): void {
    this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + amount);
  }

  destroy(): void {
    this.sprite.destroy();
    this.hpBarBg.destroy();
    this.hpBar.destroy();
    this.hpText.destroy();
  }
}
