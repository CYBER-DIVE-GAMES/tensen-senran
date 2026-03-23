import Phaser from 'phaser';

export interface BulletData {
  vx: number;
  vy: number;
  damage: number;
  owner: 'player' | 'enemy';
}

export class BulletPool {
  private group: Phaser.Physics.Arcade.Group;

  constructor(scene: Phaser.Scene) {
    this.group = scene.physics.add.group({
      maxSize: 500,
      runChildUpdate: false,
    });
  }

  get physicsGroup(): Phaser.Physics.Arcade.Group {
    return this.group;
  }

  fire(
    scene: Phaser.Scene,
    x: number,
    y: number,
    vx: number,
    vy: number,
    damage: number,
    owner: 'player' | 'enemy',
    color: number = 0xffffff,
    radius: number = 5
  ): Phaser.GameObjects.Arc | null {
    // 既存の非アクティブな弾を再利用
    let bullet = this.group.getFirstDead(false) as Phaser.GameObjects.Arc | null;

    if (!bullet) {
      // プールに空きがなければ新規作成
      bullet = scene.add.circle(x, y, radius, color);
      this.group.add(bullet, true);
    } else {
      bullet.setActive(true).setVisible(true);
      bullet.setPosition(x, y);
      bullet.setRadius(radius);
      bullet.setFillStyle(color);
    }

    const body = bullet.body as Phaser.Physics.Arcade.Body;
    body.reset(x, y);
    body.setVelocity(vx, vy);
    body.enable = true;

    bullet.setData('damage', damage);
    bullet.setData('owner', owner);

    return bullet;
  }

  killBullet(bullet: Phaser.GameObjects.Arc): void {
    bullet.setActive(false).setVisible(false);
    const body = bullet.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.enable = false;
  }

  killAllBullets(): void {
    this.group.getChildren().forEach((b) => {
      const bullet = b as Phaser.GameObjects.Arc;
      this.killBullet(bullet);
    });
  }

  update(): void {
    // 画面外に出た弾を回収
    this.group.getChildren().forEach((b) => {
      const bullet = b as Phaser.GameObjects.Arc;
      if (!bullet.active) return;
      const { x, y } = bullet;
      if (x < -50 || x > 590 || y < -50 || y > 1010) {
        this.killBullet(bullet);
      }
    });
  }
}
