import Phaser from 'phaser';

export class ObstacleSystem {
  private scene: Phaser.Scene;
  obstacles: Phaser.GameObjects.Rectangle[] = [];
  private spawnTimer: number = 0;
  private spawnInterval: number = 8000; // ms

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  update(delta: number, elapsed: number): void {
    // 時間が経つほど頻繁に出現
    this.spawnInterval = Math.max(3000, 8000 - elapsed * 8);

    this.spawnTimer += delta;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnObstacle();
    }

    // 更新と廃棄
    this.obstacles = this.obstacles.filter((obj) => {
      if (!obj.active) return false;
      if (obj.y > 1020) {
        obj.destroy();
        return false;
      }
      return true;
    });
  }

  private spawnObstacle(): void {
    const { width } = this.scene.scale;
    const x = Phaser.Math.Between(60, width - 60);
    const w = Phaser.Math.Between(40, 120);
    const h = Phaser.Math.Between(20, 50);
    const speed = Phaser.Math.Between(80, 150);

    const rect = this.scene.add.rectangle(x, -30, w, h, 0x888866);
    rect.setDepth(6);
    this.scene.physics.add.existing(rect);
    const body = rect.body as Phaser.Physics.Arcade.Body;
    body.setVelocityY(speed);
    body.setImmovable(true);

    this.obstacles.push(rect);
  }

  getPhysicsGroup(): Phaser.GameObjects.Rectangle[] {
    return this.obstacles;
  }
}
