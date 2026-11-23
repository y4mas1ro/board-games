import Phaser from "phaser";

/** アセット読み込み用。現在は図形描画のみなので、すぐタイトルへ進む */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create(): void {
    this.scene.start("TitleScene");
  }
}
