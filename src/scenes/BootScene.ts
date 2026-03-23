import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // プログレスバー
    const bar = this.add.graphics();
    const progress = this.add.graphics();

    this.load.on('progress', (value: number) => {
      progress.clear();
      progress.fillStyle(0xffffff, 1);
      progress.fillRect(170, 465, 200 * value, 30);
    });

    this.load.on('complete', () => {
      progress.destroy();
      bar.destroy();
    });

    bar.fillStyle(0x222222, 1);
    bar.fillRect(160, 460, 220, 40);
    this.add.text(270, 420, 'Loading...', {
      fontSize: '20px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // フェーズ1では全てプログラムで描画するためアセットなし
  }

  create(): void {
    this.scene.start('TitleScene');
  }
}
