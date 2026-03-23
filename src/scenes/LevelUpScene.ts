import Phaser from 'phaser';
import { SkillDef, SkillSystem } from '../systems/SkillSystem';
import { PlayerStats } from '../entities/Player';

interface LevelUpData {
  cards: SkillDef[];
  skillSystem: SkillSystem;
  playerStats: PlayerStats;
  onClose: () => void;
}

export class LevelUpScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LevelUpScene' });
  }

  create(data: LevelUpData): void {
    const { width, height } = this.scale;
    const { cards, skillSystem, playerStats, onClose } = data;

    // 半透明背景
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75);

    this.add.text(width / 2, 120, 'Level Up！ スキルを選択', {
      fontSize: '28px',
      color: '#ffd700',
    }).setOrigin(0.5);

    this.add.text(width / 2, 160, 'スキルを1つ選んでください', {
      fontSize: '18px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    // カード表示
    const cardW = 150;
    const cardH = 220;
    const spacing = 20;
    const totalW = cards.length * cardW + (cards.length - 1) * spacing;
    const startX = (width - totalW) / 2 + cardW / 2;

    cards.forEach((skill, i) => {
      const cx = startX + i * (cardW + spacing);
      const cy = height / 2;
      const currentLv = skillSystem.getSkillLevel(skill.id);
      const nextLv = currentLv + 1;

      // カード背景
      const card = this.add.rectangle(cx, cy, cardW, cardH, 0x111122)
        .setStrokeStyle(2, skill.color)
        .setInteractive({ useHandCursor: true });

      // カテゴリカラーバー
      this.add.rectangle(cx, cy - cardH / 2 + 15, cardW - 4, 30, skill.color);

      // スキル名
      this.add.text(cx, cy - cardH / 2 + 15, skill.name, {
        fontSize: '16px',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      // レベル表示
      const lvText = currentLv > 0 ? `Lv ${currentLv} → ${nextLv}` : `NEW`;
      this.add.text(cx, cy - 60, lvText, {
        fontSize: '14px',
        color: currentLv > 0 ? '#88ffaa' : '#ffd700',
      }).setOrigin(0.5);

      // 説明
      this.add.text(cx, cy + 10, skill.description(nextLv), {
        fontSize: '13px',
        color: '#cccccc',
        wordWrap: { width: cardW - 16 },
        align: 'center',
      }).setOrigin(0.5);

      // ホバー演出
      card.on('pointerover', () => {
        card.setFillStyle(0x222244);
        card.setScale(1.04);
      });
      card.on('pointerout', () => {
        card.setFillStyle(0x111122);
        card.setScale(1.0);
      });

      // 選択
      card.on('pointerdown', () => {
        skillSystem.acquire(skill.id, playerStats);
        this.scene.stop();
        onClose();
      });
    });

    // ESCキーで閉じる（スキップ）
    if (this.input.keyboard) {
      this.input.keyboard.once('keydown-ESC', () => {
        this.scene.stop();
        onClose();
      });
    }
  }
}
