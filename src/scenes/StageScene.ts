import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Boss } from '../entities/Boss';
import { BulletPool } from '../utils/BulletPool';
import { WaveSystem } from '../systems/WaveSystem';
import { XPSystem } from '../systems/XPSystem';
import { SkillSystem } from '../systems/SkillSystem';
import { ObstacleSystem } from '../systems/ObstacleSystem';
import { SaveSystem } from '../utils/SaveSystem';

export class StageScene extends Phaser.Scene {
  private player!: Player;
  private playerPool!: BulletPool;  // プレイヤーの弾
  private enemyPool!: BulletPool;   // 敵の弾
  private waveSystem!: WaveSystem;
  private xpSystem!: XPSystem;
  private skillSystem!: SkillSystem;
  private obstacleSystem!: ObstacleSystem;
  private boss: Boss | null = null;

  // HUD
  private levelText!: Phaser.GameObjects.Text;
  private xpBar!: Phaser.GameObjects.Rectangle;
  private timerText!: Phaser.GameObjects.Text;
  private youkakuText!: Phaser.GameObjects.Text;

  // ゲーム状態
  private paused: boolean = false;
  private regenTimer: number = 0;
  private youkakuThisRun: number = 0;
  private stageCleared: boolean = false;

  constructor() {
    super({ key: 'StageScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    // 背景
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x050510, 0x050510, 0x0a0520, 0x0a0520, 1);
    bg.fillRect(0, 0, width, height);

    // 星背景
    for (let i = 0; i < 60; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      this.add.circle(x, y, Phaser.Math.FloatBetween(0.5, 2), 0xffffff,
        Phaser.Math.FloatBetween(0.2, 0.6));
    }

    // 弾プール（プレイヤー用・敵用 分離）
    this.playerPool = new BulletPool(this);
    this.enemyPool = new BulletPool(this);

    // プレイヤー
    this.player = new Player(this, this.playerPool);
    this.player.sprite.setData('isPlayer', true);

    // システム
    this.skillSystem = new SkillSystem();
    this.xpSystem = new XPSystem((level) => this.onLevelUp(level));
    this.waveSystem = new WaveSystem(this, this.enemyPool, (id, type) => this.onBossSpawn(id, type));
    this.obstacleSystem = new ObstacleSystem(this);

    // HUD
    this.buildHUD();
  }

  private buildHUD(): void {
    const { width } = this.scale;

    // XP バー（画面上部）
    this.add.rectangle(0, 44, width, 10, 0x333333).setOrigin(0, 0.5).setDepth(100);
    this.xpBar = this.add.rectangle(0, 44, 0, 10, 0x88ffaa).setOrigin(0, 0.5).setDepth(101);

    this.levelText = this.add.text(width - 10, 20, 'Lv.1', {
      fontSize: '18px',
      color: '#88ffaa',
    }).setOrigin(1, 0.5).setDepth(102);

    this.timerText = this.add.text(width / 2, 20, '00:00', {
      fontSize: '18px',
      color: '#aaaaaa',
    }).setOrigin(0.5).setDepth(102);

    this.youkakuText = this.add.text(width - 10, this.scale.height - 10, '妖核 +0', {
      fontSize: '16px',
      color: '#cc88ff',
    }).setOrigin(1, 1).setDepth(102);
  }

  update(time: number, delta: number): void {
    if (this.paused || this.stageCleared) return;
    if (!this.player.isAlive) {
      this.onGameOver();
      return;
    }

    // プレイヤー更新
    this.player.update(time);

    // 弾プール掃除
    this.playerPool.update();
    this.enemyPool.update();

    // ウェーブ更新
    this.waveSystem.update(delta);

    // 障害物更新
    this.obstacleSystem.update(delta, this.waveSystem.getElapsed());

    // ボス更新
    this.boss?.update(delta);

    // HP再生
    this.handleRegen(delta);

    // 当たり判定
    this.handleCollisions(time);

    // HUD 更新
    this.updateHUD();
  }

  private handleRegen(delta: number): void {
    const regenLv = this.skillSystem.getSkillLevel('B2_regen');
    if (regenLv === 0) return;
    this.regenTimer += delta;
    if (this.regenTimer >= 1000) {
      this.regenTimer = 0;
      const rate = [0.01, 0.02, 0.04][regenLv - 1];
      this.player.heal(Math.floor(this.player.stats.maxHp * rate));
    }
  }

  private handleCollisions(time: number): void {
    const playerSprite = this.player.sprite;

    // プレイヤー弾 vs 敵
    this.playerPool.physicsGroup.getChildren().forEach((b) => {
      const bullet = b as Phaser.GameObjects.Arc;
      if (!bullet.active) return;

      this.waveSystem.enemies.forEach((enemy) => {
        if (!enemy.isAlive) return;
        const dist = Phaser.Math.Distance.Between(bullet.x, bullet.y, enemy.sprite.x, enemy.sprite.y);
        if (dist < bullet.radius + enemy.config.size) {
          const dmg = bullet.getData('damage') as number;
          enemy.takeDamage(dmg);

          // XP・妖核ドロップ
          if (!enemy.isAlive) {
            this.xpSystem.addXP(enemy.config.xp);
            this.dropYoukaku(enemy.sprite.x, enemy.sprite.y, enemy.config.youkakuDrop, enemy.config.youkakuChance);
          }

          this.playerPool.killBullet(bullet);
        }
      });

      // ボスへのダメージ
      if (this.boss?.isAlive) {
        const dist = Phaser.Math.Distance.Between(bullet.x, bullet.y, this.boss.sprite.x, this.boss.sprite.y);
        if (dist < bullet.radius + 45) {
          const dmg = bullet.getData('damage') as number;
          this.boss.takeDamage(dmg);
          this.playerPool.killBullet(bullet);

          if (!this.boss.isAlive) {
            this.onBossDefeated();
          }
        }
      }
    });

    // 敵弾 vs プレイヤー
    this.enemyPool.physicsGroup.getChildren().forEach((b) => {
      const bullet = b as Phaser.GameObjects.Arc;
      if (!bullet.active) return;
      const dist = Phaser.Math.Distance.Between(bullet.x, bullet.y, playerSprite.x, playerSprite.y);
      if (dist < bullet.radius + 10) {
        const dmg = bullet.getData('damage') as number;
        this.player.takeDamage(dmg, time);
        this.enemyPool.killBullet(bullet);
        // 被弾フラッシュ
        this.cameras.main.flash(100, 255, 0, 0, false);
      }
    });

    // 敵とプレイヤーの接触
    this.waveSystem.enemies.forEach((enemy) => {
      if (!enemy.isAlive) return;
      const dist = Phaser.Math.Distance.Between(enemy.sprite.x, enemy.sprite.y, playerSprite.x, playerSprite.y);
      if (dist < enemy.config.size + 14) {
        this.player.takeDamage(5, time);
        enemy.takeDamage(999);
      }
    });

    // 障害物とプレイヤーの接触（即死）
    this.obstacleSystem.obstacles.forEach((obs) => {
      if (!obs.active) return;
      const bounds = obs.getBounds();
      const px = playerSprite.x;
      const py = playerSprite.y;
      if (px > bounds.left - 10 && px < bounds.right + 10 &&
          py > bounds.top - 10 && py < bounds.bottom + 10) {
        this.player.takeDamage(9999, time);
      }
    });
  }

  private dropYoukaku(x: number, y: number, amount: number, chance: number): void {
    if (Math.random() > chance) return;
    this.youkakuThisRun += amount;
    // ドロップ演出
    const gem = this.add.circle(x, y, 6, 0xcc88ff);
    this.tweens.add({
      targets: gem,
      y: y - 30,
      alpha: 0,
      duration: 600,
      onComplete: () => gem.destroy(),
    });
    this.youkakuText.setText(`妖核 +${this.youkakuThisRun}`);
  }

  private updateHUD(): void {
    const { width } = this.scale;
    const ratio = this.xpSystem.getXPRatio();
    this.xpBar.width = width * ratio;
    this.levelText.setText(`Lv.${this.xpSystem.getLevel()}`);

    const elapsed = Math.floor(this.waveSystem.getElapsed());
    const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const s = (elapsed % 60).toString().padStart(2, '0');
    this.timerText.setText(`${m}:${s}`);
  }

  private onLevelUp(level: number): void {
    // レベルアップ演出
    const { width, height } = this.scale;
    const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xffffff, 0.3);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 400,
      onComplete: () => flash.destroy(),
    });

    const lvText = this.add.text(width / 2, height / 2, `Level ${level}!`, {
      fontSize: '48px',
      color: '#ffd700',
      stroke: '#ff8800',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(200);
    this.tweens.add({
      targets: lvText,
      y: height / 2 - 60,
      alpha: 0,
      duration: 1000,
      onComplete: () => lvText.destroy(),
    });

    // スキル選択画面へ
    this.paused = true;
    this.time.delayedCall(600, () => {
      const cards = this.skillSystem.drawCards(3);
      if (cards.length > 0) {
        this.scene.launch('LevelUpScene', {
          cards,
          skillSystem: this.skillSystem,
          playerStats: this.player.stats,
          onClose: () => {
            this.paused = false;
          },
        });
      } else {
        this.paused = false;
      }
    });
  }

  private onBossSpawn(_id: string, _type: 'miniboss' | 'midboss' | 'boss'): void {
    // ミニボス1（骸の剣鬼・簡易版）をフェーズ1として実装
    this.boss = new Boss(
      this,
      this.enemyPool,
      '骸の剣鬼',
      800,
      [
        { hpThreshold: 1.0, color: 0x887766, firePattern: 'spread5',  fireInterval: 2000, bulletSpeed: 200, moveSpeed: 80 },
        { hpThreshold: 0.5, color: 0xff6644, firePattern: 'radial12', fireInterval: 1500, bulletSpeed: 230, moveSpeed: 120 },
      ]
    );

    // ボス登場テロップ
    const { width, height } = this.scale;
    const t = this.add.text(width / 2, height / 2 - 100, '-- 骸の剣鬼 --', {
      fontSize: '36px',
      color: '#ff8888',
      stroke: '#880000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(200);
    this.tweens.add({
      targets: t,
      alpha: 0,
      duration: 2000,
      delay: 1000,
      onComplete: () => t.destroy(),
    });
  }

  private onBossDefeated(): void {
    // ボス撃破 妖核大量ドロップ
    const drop = 20;
    this.youkakuThisRun += drop;
    this.youkakuText.setText(`妖核 +${this.youkakuThisRun}`);

    const { width, height } = this.scale;
    const t = this.add.text(width / 2, height / 2, '撃破！', {
      fontSize: '52px',
      color: '#ffd700',
      stroke: '#ff8800',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(200);
    this.tweens.add({
      targets: t,
      y: height / 2 - 80,
      alpha: 0,
      duration: 1500,
      onComplete: () => {
        t.destroy();
        // フェーズ1ではボス1体撃破でステージクリア
        this.onStageClear();
      },
    });
    this.boss = null;
  }

  private onStageClear(): void {
    this.stageCleared = true;
    SaveSystem.addYoukaku(this.youkakuThisRun + 50); // クリアボーナス50
    SaveSystem.markStageCleared(1);

    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6).setDepth(300);
    this.add.text(width / 2, height / 2 - 80, 'STAGE CLEAR!', {
      fontSize: '48px',
      color: '#ffd700',
    }).setOrigin(0.5).setDepth(301);
    this.add.text(width / 2, height / 2, `獲得妖核：${this.youkakuThisRun + 50}`, {
      fontSize: '28px',
      color: '#cc88ff',
    }).setOrigin(0.5).setDepth(301);

    this.time.delayedCall(4000, () => {
      this.scene.stop('LevelUpScene');
      this.scene.start('TitleScene');
    });
  }

  private onGameOver(): void {
    if (this.paused) return;
    this.paused = true;

    // 半分没収して保存
    const kept = Math.floor(this.youkakuThisRun * 0.5);
    SaveSystem.addYoukaku(kept);

    this.scene.stop('LevelUpScene');
    this.scene.start('GameOverScene', { youkakuKept: kept, youkakuLost: this.youkakuThisRun - kept });
  }
}
