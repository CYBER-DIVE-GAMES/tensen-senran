import Phaser from 'phaser';

interface GameOverData {
  youkakuKept: number;
  youkakuLost: number;
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: GameOverData): void {
    const { width, height } = this.scale;
    const { youkakuKept, youkakuLost } = data;

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000);

    this.add.text(width / 2, 280, 'GAME OVER', {
      fontSize: '52px',
      color: '#ff2222',
      stroke: '#880000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(width / 2, 400, `今回の妖核`, {
      fontSize: '20px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    this.add.text(width / 2, 440, `持ち越し：${youkakuKept} 個`, {
      fontSize: '24px',
      color: '#cc88ff',
    }).setOrigin(0.5);

    this.add.text(width / 2, 480, `没収：${youkakuLost} 個`, {
      fontSize: '20px',
      color: '#ff6666',
    }).setOrigin(0.5);

    // リトライ
    const retryBtn = this.add.text(width / 2, 600, '【 もう一度挑戦 】', {
      fontSize: '26px',
      color: '#ffffff',
      backgroundColor: '#331133',
      padding: { x: 18, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    retryBtn.on('pointerover', () => retryBtn.setColor('#ffd700'));
    retryBtn.on('pointerout', () => retryBtn.setColor('#ffffff'));
    retryBtn.on('pointerdown', () => this.scene.start('StageScene', { stage: 1 }));

    // タイトルへ
    const titleBtn = this.add.text(width / 2, 680, '[ タイトルへ戻る ]', {
      fontSize: '20px',
      color: '#888888',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    titleBtn.on('pointerover', () => titleBtn.setColor('#ffffff'));
    titleBtn.on('pointerout', () => titleBtn.setColor('#888888'));
    titleBtn.on('pointerdown', () => this.scene.start('TitleScene'));
  }
}
