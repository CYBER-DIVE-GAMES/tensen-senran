import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { StageScene } from './scenes/StageScene';
import { LevelUpScene } from './scenes/LevelUpScene';
import { GameOverScene } from './scenes/GameOverScene';

const GAME_WIDTH = 540;
const GAME_HEIGHT = 960;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#000000',
  parent: document.body,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, TitleScene, StageScene, LevelUpScene, GameOverScene],
};

new Phaser.Game(config);
