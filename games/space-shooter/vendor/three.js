// Self-contained Three.js 3D projection runtime for Space Shooter
export class Vector3 {
  public x: number;
  public y: number;
  public z: number;
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

export class Color {
  public hex: string;
  constructor(hex = "#38bdf8") {
    this.hex = hex;
  }
}

export class Mesh {
  public position: Vector3;
  public rotation: Vector3;
  public scale: number;
  public color: string;
  public radius: number;
  public kind: string;

  constructor(kind: string, color: string, radius = 1) {
    this.kind = kind;
    this.color = color;
    this.radius = radius;
    this.position = new Vector3(0, 0, 0);
    this.rotation = new Vector3(0, 0, 0);
    this.scale = 1;
  }
}

export class Scene {
  public children: Mesh[] = [];
  public add(mesh: Mesh) {
    this.children.push(mesh);
  }
  public remove(mesh: Mesh) {
    const idx = this.children.indexOf(mesh);
    if (idx !== -1) this.children.splice(idx, 1);
  }
}

export class PerspectiveCamera {
  public fov: number;
  public aspect: number;
  public position: Vector3;
  constructor(fov = 60, aspect = 16 / 9) {
    this.fov = fov;
    this.aspect = aspect;
    this.position = new Vector3(0, 0, 12);
  }
}

export class WebGLRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(params: { canvas: HTMLCanvasElement }) {
    this.canvas = params.canvas;
    const context = this.canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D context unavailable");
    this.ctx = context;
  }

  public setSize(w: number, h: number) {
    this.canvas.width = w;
    this.canvas.height = h;
  }

  public render(scene: Scene, camera: PerspectiveCamera) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.fillStyle = "#030712";
    ctx.fillRect(0, 0, w, h);

    // Sort back-to-front by Z
    const sorted = [...scene.children].sort((a, b) => a.position.z - b.position.z);
    const focalLength = 420;

    for (const mesh of sorted) {
      const relZ = camera.position.z - mesh.position.z;
      if (relZ <= 0.5) continue;
      const scale = focalLength / relZ;
      const screenX = w / 2 + mesh.position.x * scale;
      const screenY = h / 2 - mesh.position.y * scale;
      const r = Math.max(2, mesh.radius * scale);

      ctx.save();
      ctx.translate(screenX, screenY);
      ctx.rotate(mesh.rotation.z);
      ctx.strokeStyle = mesh.color;
      ctx.fillStyle = mesh.color;
      ctx.lineWidth = 2;

      if (mesh.kind === "ship") {
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(-r * 0.9, r);
        ctx.lineTo(0, r * 0.45);
        ctx.lineTo(r * 0.9, r);
        ctx.closePath();
        ctx.fill();
      } else if (mesh.kind === "asteroid") {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const px = Math.cos(angle) * r;
          const py = Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}

export const THREE = {
  Vector3,
  Color,
  Mesh,
  Scene,
  PerspectiveCamera,
  WebGLRenderer
};
