import Phaser from 'phaser';
import { BulletPool } from '../utils/BulletPool';

export type BossPhaseConfig = {
  hpThreshold: number;   // このフェーズに入るHP割合 (1.0 = 全体の100%)
  color: number;
  firePattern: 'spread5' | 'radial12' | 'spiral' | 'wall';
  fireInterval: number;
  bulletSpeed: number;
  moveSpeed: number;
};

export class Boss {
  readonly scene: Phaser.Scene;
  private pool: BulletPool;
  readonly sprite: Phaser.GameObjects.Container;
  private body!: Phaser.Physics.Arcade.Body;
  private hpBarBg: Phaser.GameObjects.Rectangle;
  private hpBar: Phaser.GameObjects.Rectangle;
  private nameText: Phaser.GameObjects.Text;

  maxHp: number;
  hp: number;
  isAlive: boolean = true;
  private currentPhase: number = 0;
  private phases: BossPhaseConfig[];
  private timeSinceFire: number = 0;
  private moveDir: number = 1;
  private moveTimer: number = 0;

  constructor(
    scene: Phaser.Scene,
    pool: BulletPool,
    name: string,
    maxHp: number,
    phases: BossPhaseConfig[]
  ) {
    this.scene = scene;
    this.pool = pool;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.phases = phases;

    // ボス本体（プログラム描画）
    const core = scene.add.circle(0, 0, 40, phases[0].color);
    const eye1 = scene.add.circle(-15, -10, 8, 0xff0000);
    const eye2 = scene.add.circle(15, -10, 8, 0xff0000);
    const mouth = scene.add.arc(0, 10, 15, 200, 340, false, 0xff0000);

    this.sprite = scene.add.container(270, 120, [core, eye1, eye2, mouth]);
    this.sprite.setDepth(8);

    scene.physics.add.existing(this.sprite);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setSize(80, 80);
    this.body.setOffset(-40, -40);
    this.body.setCollideWorldBounds(true);

    // HP バー（画面上部）
    const bw = 500;
    this.hpBarBg = scene.add.rectangle(20, 940, bw, 18, 0x333333).setOrigin(0, 0.5).setDepth(100);
    this.hpBar = scene.add.rectangle(20, 940, bw, 18, 0xff2244).setOrigin(0, 0.5).setDepth(101);
    this.nameText = scene.add.text(270, 910, name, {
      fontSize: '20px',
      color: '#ff8888',
    }).setOrigin(0.5).setDepth(102);

    // 登場アニメ
    this.sprite.setAlpha(0);
    scene.tweens.add({
      targets: this.sprite,
      alpha: 1,
      y: 160,
      duration: 1200,
      ease: 'Power2',
    });
  }

  update(delta: number): void {
    if (!this.isAlive) return;

    // フェーズチェック
    const hpRatio = this.hp / this.maxHp;
    for (let i = this.phases.length - 1; i >= 0; i--) {
      if (hpRatio <= this.phases[i].hpThreshold) {
        if (this.currentPhase !== i) {
          this.onPhaseChange(i);
        }
        break;
      }
    }

    const phase = this.phases[this.currentPhase];

    // 横移動
    this.moveTimer += delta;
    if (this.moveTimer > 2000) {
      this.moveTimer = 0;
      this.moveDir *= -1;
    }
    this.body.setVelocityX(phase.moveSpeed * this.moveDir);
    this.body.setVelocityY(0);

    // 射撃
    this.timeSinceFire += delta;
    if (this.timeSinceFire >= phase.fireInterval) {
      this.fireBullets(phase);
      this.timeSinceFire = 0;
    }

    // HP バー更新
    const ratio = this.hp / this.maxHp;
    this.hpBar.width = 500 * ratio;

    // HP バーの位置をスプライトに合わせる（固定位置）
  }

  private onPhaseChange(phase: number): void {
    this.currentPhase = phase;
    // フェーズ変化フラッシュ
    const { color } = this.phases[phase];
    (this.sprite.list[0] as Phaser.GameObjects.Arc).setFillStyle(color);
    this.scene.cameras.main.shake(400, 0.015);
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: { from: 1.3, to: 1 },
      scaleY: { from: 1.3, to: 1 },
      duration: 300,
    });
  }

  private fireBullets(phase: BossPhaseConfig): void {
    const x = this.sprite.x;
    const y = this.sprite.y;
    const spd = phase.bulletSpeed;

    switch (phase.firePattern) {
      case 'spread5':
        for (let i = -2; i <= 2; i++) {
          const angle = (Math.PI / 2) + (i * 0.25);
          this.pool.fire(this.scene, x, y,
            Math.cos(angle) * spd, Math.sin(angle) * spd,
            12, 'enemy', 0xff6666, 7);
        }
        break;

      case 'radial12':
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2;
          this.pool.fire(this.scene, x, y,
            Math.cos(angle) * spd, Math.sin(angle) * spd,
            10, 'enemy', 0xff4488, 6);
        }
        break;

      case 'spiral': {
        const count = 6;
        const baseAngle = (Date.now() / 500) % (Math.PI * 2);
        for (let i = 0; i < count; i++) {
          const angle = baseAngle + (i / count) * Math.PI * 2;
          this.pool.fire(this.scene, x, y,
            Math.cos(angle) * spd, Math.sin(angle) * spd,
            8, 'enemy', 0xff88aa, 5);
        }
        break;
      }

      case 'wall':
        for (let i = 0; i < 9; i++) {
          const xOffset = (i - 4) * 55;
          if (Math.abs(xOffset) > 200) continue; // 端は省略（安全地帯を作る）
          this.pool.fire(this.scene, x + xOffset, y,
            0, spd, 10, 'enemy', 0xffaa44, 8);
        }
        break;
    }
  }

  takeDamage(amount: number): void {
    this.hp -= amount;
    if (this.hp <= 0) this.kill();
  }

  kill(): void {
    if (!this.isAlive) return;
    this.isAlive = false;

    this.scene.cameras.main.shake(600, 0.025);

    // 爆発演出
    for (let i = 0; i < 8; i++) {
      this.scene.time.delayedCall(i * 80, () => {
        const ox = Phaser.Math.Between(-50, 50);
        const oy = Phaser.Math.Between(-50, 50);
        const burst = this.scene.add.circle(
          this.sprite.x + ox, this.sprite.y + oy,
          Phaser.Math.Between(15, 35), 0xff8800, 1
        );
        this.scene.tweens.add({
          targets: burst,
          alpha: 0,
          scale: 3,
          duration: 400,
          onComplete: () => burst.destroy(),
        });
      });
    }

    this.scene.time.delayedCall(600, () => {
      this.sprite.destroy();
      this.hpBarBg.destroy();
      this.hpBar.destroy();
      this.nameText.destroy();
    });
  }
}
