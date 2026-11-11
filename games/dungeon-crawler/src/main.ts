import { Phaser, PhaserScene } from "phaser";

class DungeonScene extends PhaserScene {
  private player = { x: 120, y: 225, size: 22, speed: 3.6 };
  private relic = { x: 520, y: 180, radius: 11 };
  private guards = [
    { x: 350, y: 110, vx: 0, vy: 3.1, size: 22 },
    { x: 580, y: 310, vx: -3.0, vy: 0, size: 22 }
  ];
  private keys: Record<string, boolean> = {};
  private relicsCollected = 0;

  public create() {
    window.addEventListener("keydown", (e) => {
      this.keys[e.key.toLowerCase()] = true;
    });
    window.addEventListener("keyup", (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        { namespace: "opengamehub:bridge:v1", type: "GAME_READY" },
        "*"
      );
    }
  }

  public update() {
    if (this.keys["arrowleft"] || this.keys["a"]) this.player.x -= this.player.speed;
    if (this.keys["arrowright"] || this.keys["d"]) this.player.x += this.player.speed;
    if (this.keys["arrowup"] || this.keys["w"]) this.player.y -= this.player.speed;
    if (this.keys["arrowdown"] || this.keys["s"]) this.player.y += this.player.speed;

    this.player.x = Math.max(40, Math.min(this.width - 40, this.player.x));
    this.player.y = Math.max(55, Math.min(this.height - 40, this.player.y));

    for (const g of this.guards) {
      g.x += g.vx;
      g.y += g.vy;
      if (g.x < 60 || g.x > this.width - 60) g.vx *= -1;
      if (g.y < 65 || g.y > this.height - 55) g.vy *= -1;

      if (Math.hypot(this.player.x - g.x, this.player.y - g.y) < 24) {
        this.relicsCollected = 0;
        this.player.x = 120;
        this.player.y = 225;
      }
    }

    if (Math.hypot(this.player.x - this.relic.x, this.player.y - this.relic.y) < 24) {
      this.relicsCollected += 1;
      this.relic.x = 100 + Math.random() * (this.width - 200);
      this.relic.y = 80 + Math.random() * (this.height - 150);
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          {
            namespace: "opengamehub:bridge:v1",
            type: "GAME_STATUS",
            payload: { score: this.relicsCollected * 100, state: "playing" }
          },
          "*"
        );
      }
    }

    const ctx = this.ctx;
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, this.width, this.height);

    // Dungeon floor tiles
    ctx.strokeStyle = "#1e293b";
    for (let x = 40; x < this.width - 20; x += 40) {
      for (let y = 50; y < this.height - 20; y += 40) {
        ctx.strokeRect(x, y, 40, 40);
      }
    }

    // HUD
    ctx.fillStyle = "#f59e0b";
    ctx.font = "bold 15px system-ui, sans-serif";
    ctx.fillText(`RELICS COLLECTED: ${this.relicsCollected}   |   ENGINE: PHASER 2D`, 40, 32);

    // Relic
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(this.relic.x, this.relic.y, this.relic.radius, 0, Math.PI * 2);
    ctx.fill();

    // Guards
    ctx.fillStyle = "#ef4444";
    for (const g of this.guards) {
      ctx.fillRect(g.x - g.size / 2, g.y - g.size / 2, g.size, g.size);
    }

    // Player
    ctx.fillStyle = "#34d399";
    ctx.fillRect(
      this.player.x - this.player.size / 2,
      this.player.y - this.player.size / 2,
      this.player.size,
      this.player.size
    );
  }
}

new Phaser.Game({
  width: 800,
  height: 450,
  parent: "phaser-root",
  scene: new DungeonScene()
});
