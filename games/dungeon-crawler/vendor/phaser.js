// Self-contained Phaser 2D Scene runtime for Dungeon Crawler
export class PhaserScene {
  public ctx!: CanvasRenderingContext2D;
  public width = 800;
  public height = 450;
  public create() {}
  public update() {}
}

export class PhaserGame {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;

  constructor(config: {
    width: number;
    height: number;
    parent: string;
    scene: PhaserScene;
  }) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = config.width;
    this.canvas.height = config.height;
    this.canvas.style.maxWidth = "96vw";
    this.canvas.style.maxHeight = "88vh";
    this.canvas.style.border = "2px solid #334155";
    this.canvas.style.borderRadius = "10px";
    const parentEl = document.getElementById(config.parent) || document.body;
    parentEl.appendChild(this.canvas);
    const context = this.canvas.getContext("2d");
    if (!context) throw new Error("2D context unavailable");
    this.ctx = context;

    config.scene.ctx = this.ctx;
    config.scene.width = config.width;
    config.scene.height = config.height;
    config.scene.create();

    const step = () => {
      config.scene.update();
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}

export const Phaser = {
  Scene: PhaserScene,
  Game: PhaserGame,
  AUTO: "AUTO"
};
