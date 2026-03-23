import Phaser from 'phaser';
import { SaveSystem } from '../utils/SaveSystem';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    const saveData = SaveSystem.load();

    // 背景
    this.add.rectangle(width / 2, height / 2, width, height, 0x050510);

    // 星のパーティクル（背景演出）
    for (let i = 0; i < 80; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const size = Phaser.Math.FloatBetween(1, 3);
      const alpha = Phaser.Math.FloatBetween(0.3, 1.0);
      const star = this.add.circle(x, y, size, 0xffffff, alpha);
      this.tweens.add({
        targets: star,
        alpha: { from: alpha, to: 0.1 },
        duration: Phaser.Math.Between(1000, 3000),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 2000),
      });
    }

    // タイトルロゴ
    this.add.text(width / 2, 200, '天穿閃乱', {
      fontSize: '56px',
      color: '#ffd700',
      fontStyle: 'bold',
      stroke: '#ff6600',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(width / 2, 270, '～ Heavenpiercer ～', {
      fontSize: '22px',
      color: '#aaaaff',
    }).setOrigin(0.5);

    // 妖核表示
    this.add.text(width / 2, 360, `妖核：${saveData.youkaku} 個`, {
      fontSize: '20px',
      color: '#cc88ff',
    }).setOrigin(0.5);

    // スタートボタン
    const startBtn = this.add.text(width / 2, 500, '【 ゲームスタート 】', {
      fontSize: '28px',
      color: '#ffffff',
      backgroundColor: '#331144',
      padding: { x: 20, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    startBtn.on('pointerover', () => startBtn.setColor('#ffd700'));
    startBtn.on('pointerout', () => startBtn.setColor('#ffffff'));
    startBtn.on('pointerdown', () => this.scene.start('StageScene', { stage: 1 }));

    // 永続強化ボタン
    const upgradeBtn = this.add.text(width / 2, 600, '【 修行の間 】', {
      fontSize: '22px',
      color: '#cc88ff',
      backgroundColor: '#220033',
      padding: { x: 16, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    upgradeBtn.on('pointerover', () => upgradeBtn.setColor('#ffffff'));
    upgradeBtn.on('pointerout', () => upgradeBtn.setColor('#cc88ff'));
    upgradeBtn.on('pointerdown', () => {
      // TODO: フェーズ2で強化UIを実装
      this.showUpgradeStub(saveData.youkaku);
    });

    // バージョン
    this.add.text(width - 10, height - 10, 'v0.1.0 Phase1', {
      fontSize: '14px',
      color: '#444466',
    }).setOrigin(1, 1);
  }

  private showUpgradeStub(youkaku: number): void {
    const { width, height } = this.scale;
    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85);
    const text = this.add.text(width / 2, height / 2 - 40, `現在の妖核：${youkaku} 個\n\n強化ツリーはフェーズ2で実装予定`, {
      fontSize: '22px',
      color: '#cc88ff',
      align: 'center',
    }).setOrigin(0.5);

    const closeBtn = this.add.text(width / 2, height / 2 + 80, '[ 閉じる ]', {
      fontSize: '22px',
      color: '#ffffff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerdown', () => {
      bg.destroy();
      text.destroy();
      closeBtn.destroy();
    });
  }
}
