import * as THREE from "three";

/* ------------------------------------------------------------------ */
/*  Tumble Club — shared constants, types and tiny math helpers        */
/* ------------------------------------------------------------------ */

export const WATER_Y = -6;
export const GRAVITY = 27;
export const RUN_SPEED = 8.6;
export const ACCEL = 62;
export const AIR_ACCEL = 26;
export const FRICTION = 46;
export const JUMP_VELOCITY = 9.6;
export const JUMP_HOLD_TIME = 0.24;
export const COYOTE_TIME = 0.12;
export const JUMP_BUFFER = 0.14;
export const RACER_RADIUS = 0.52;
export const RACER_HEIGHT = 1.55;
export const STEP_UP = 0.55;
export const KICK_RANGE = 3.5;
export const TOTAL_RACERS = 8;

export const PALETTE = {
  coral: 0xff6f5e,
  coralDark: 0xe4553f,
  turquoise: 0x2ec9bd,
  turquoiseDark: 0x1aa79d,
  yellow: 0xffc93c,
  yellowLight: 0xffe08a,
  cream: 0xfff6e6,
  navy: 0x123c4a,
  sky: 0xcdeef6,
  sea: 0x2fc4c4,
  seaDeep: 0x1fa9ad,
  pink: 0xff9db4,
  purple: 0x9b7ede,
  green: 0x7ed08a,
  blue: 0x5b8def,
  white: 0xffffff,
  wood: 0xf0c98a,
  pad: 0xff8a75,
};

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const damp = (a: number, b: number, lambda: number, dt: number) =>
  lerp(a, b, 1 - Math.exp(-lambda * dt));
export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const randInt = (a: number, b: number) => Math.floor(rand(a, b + 1));
export const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
export const TAU = Math.PI * 2;
export const shortAngle = (a: number) => {
  let x = a % TAU;
  if (x > Math.PI) x -= TAU;
  if (x < -Math.PI) x += TAU;
  return x;
};
export const dampAngle = (a: number, b: number, lambda: number, dt: number) =>
  a + shortAngle(b - a) * (1 - Math.exp(-lambda * dt));

export type HatKind = "crown" | "propeller" | "cone" | "bow";

export interface CharacterDef {
  name: string;
  color: number;
  accent: number;
  hat: HatKind;
  hatColor: number;
  speed: number;
  lane: number;
  quip: string;
}

export const CHARACTERS: CharacterDef[] = [
  { name: "Pip", color: 0xff6f5e, accent: 0xffd166, hat: "crown", hatColor: 0xffc93c, speed: 8.6, lane: 0, quip: "You" },
  { name: "Mango", color: 0xffc93c, accent: 0x2ec9bd, hat: "propeller", hatColor: 0x2ec9bd, speed: 8.15, lane: -3.1, quip: "Spin to win" },
  { name: "Bubbles", color: 0x2ec9bd, accent: 0xff9db4, hat: "cone", hatColor: 0xff9db4, speed: 7.9, lane: 3.2, quip: "Pop pop!" },
  { name: "Taffy", color: 0xff9db4, accent: 0x9b7ede, hat: "bow", hatColor: 0x9b7ede, speed: 8.35, lane: -1.4, quip: "So bouncy" },
  { name: "Sprout", color: 0x7ed08a, accent: 0xffc93c, hat: "propeller", hatColor: 0xffc93c, speed: 7.75, lane: 1.6, quip: "Grow strong" },
  { name: "Bolt", color: 0x5b8def, accent: 0xfff6e6, hat: "cone", hatColor: 0xffc93c, speed: 8.5, lane: 4.4, quip: "Zoom zoom" },
  { name: "Peach", color: 0xffa06b, accent: 0x2ec9bd, hat: "bow", hatColor: 0x2ec9bd, speed: 8.0, lane: -4.3, quip: "Sweet moves" },
  { name: "Grape", color: 0x9b7ede, accent: 0xff9db4, hat: "propeller", hatColor: 0xff9db4, speed: 8.25, lane: 0.9, quip: "Wobble wobble" },
];

export type Phase = "title" | "countdown" | "racing" | "finished";
export type RacerState = "idle" | "run" | "air" | "tumble" | "dive" | "cheer" | "zapped" | "wait";

export interface PlayerInput {
  x: number;
  z: number;
  jump: boolean;
  jumpPressed: boolean;
  dive: boolean;
  kick: boolean;
}

export const emptyInput = (): PlayerInput => ({
  x: 0,
  z: 0,
  jump: false,
  jumpPressed: false,
  dive: false,
  kick: false,
});

export interface HudState {
  phase: Phase;
  countdown: number;
  time: number;
  place: number;
  total: number;
  splashes: number;
  zaps: number;
  banner: string;
  bannerTone: "green" | "yellow" | "red" | "none";
  progress: number;
  section: string;
  finished: boolean;
  results: RaceResult[] | null;
  playerPlace: number;
  playerTime: number;
  checkpointFlash: number;
  splashFlash: number;
  zapFlash: number;
  levelId: string;
  levelName: string;
  inRedLight: boolean;
}

export interface RaceResult {
  name: string;
  color: number;
  place: number;
  time: number;
  isPlayer: boolean;
  finished: boolean;
}

/* ------------------------------------------------------------------ */
/*  Procedural textures (all generated in code)                        */
/* ------------------------------------------------------------------ */

function hashNoise(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Tileable value-noise greyscale, used as a bump map for a fine moulded-plastic grain. */
function makeValueNoise(size: number, octaves: number, seed: number, contrast = 1) {
  const rnd = hashNoise(seed);
  const layers: Float32Array[] = [];
  const res: number[] = [];
  for (let o = 0; o < octaves; o++) {
    const n = 4 << o;
    const grid = new Float32Array(n * n);
    for (let i = 0; i < grid.length; i++) grid[i] = rnd();
    layers.push(grid);
    res.push(n);
  }
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let v = 0;
      let amp = 1;
      let tot = 0;
      for (let o = 0; o < octaves; o++) {
        const n = res[o];
        const fx = (x / size) * n;
        const fy = (y / size) * n;
        const x0 = Math.floor(fx) % n;
        const y0 = Math.floor(fy) % n;
        const x1 = (x0 + 1) % n;
        const y1 = (y0 + 1) % n;
        const tx = fx - Math.floor(fx);
        const ty = fy - Math.floor(fy);
        const sx = tx * tx * (3 - 2 * tx);
        const sy = ty * ty * (3 - 2 * ty);
        const g = layers[o];
        const a = g[y0 * n + x0] + (g[y0 * n + x1] - g[y0 * n + x0]) * sx;
        const b = g[y1 * n + x0] + (g[y1 * n + x1] - g[y1 * n + x0]) * sx;
        v += (a + (b - a) * sy) * amp;
        tot += amp;
        amp *= 0.55;
      }
      out[y * size + x] = clamp(0.5 + (v / tot - 0.5) * contrast, 0, 1);
    }
  }
  return out;
}

function noiseCanvasTexture(size: number, field: Float32Array, srgb = false) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = Math.floor(field[i] * 255);
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v;
    img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const texCache = new Map<string, THREE.Texture>();

export type BumpKind = "none" | "grain" | "quilt" | "weave" | "wood";

/** Bump textures shared by many materials. */
export function bumpTexture(kind: BumpKind): THREE.Texture | undefined {
  if (kind === "none") return undefined;
  const hit = texCache.get("bump-" + kind);
  if (hit) return hit;
  let tex: THREE.Texture;
  if (kind === "grain") {
    tex = noiseCanvasTexture(256, makeValueNoise(256, 5, 11, 1.6));
    tex.repeat.set(0.5, 0.5);
  } else if (kind === "quilt") {
    // diamond-stitched padding with puffed cushions
    tex = canvasTexture(256, 256, (ctx) => {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, 256, 256);
      const step = 64;
      for (let gy = -1; gy < 5; gy++) {
        for (let gx = -1; gx < 5; gx++) {
          const cx = gx * step + (gy % 2 ? step / 2 : 0);
          const cy = gy * step * 0.5 + step * 0.25;
          const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, step * 0.52);
          g.addColorStop(0, "#fff");
          g.addColorStop(0.7, "#9a9a9a");
          g.addColorStop(1, "#111");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(cx, cy - step * 0.5);
          ctx.lineTo(cx + step * 0.5, cy);
          ctx.lineTo(cx, cy + step * 0.5);
          ctx.lineTo(cx - step * 0.5, cy);
          ctx.closePath();
          ctx.fill();
        }
      }
    });
    tex.colorSpace = THREE.NoColorSpace;
    tex.repeat.set(0.6, 0.6);
  } else if (kind === "weave") {
    tex = canvasTexture(128, 128, (ctx) => {
      ctx.fillStyle = "#777";
      ctx.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 16; i++) {
        for (let j = 0; j < 16; j++) {
          ctx.fillStyle = (i + j) % 2 ? "#ddd" : "#444";
          ctx.fillRect(i * 8 + 1, j * 8 + 1, 6, 6);
        }
      }
    });
    tex.colorSpace = THREE.NoColorSpace;
    tex.repeat.set(2, 2);
  } else {
    // wood grain: long vertical streaks
    tex = canvasTexture(256, 256, (ctx) => {
      const rnd = hashNoise(7);
      ctx.fillStyle = "#888";
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 90; i++) {
        const x = rnd() * 256;
        const w = 0.6 + rnd() * 2.4;
        ctx.strokeStyle = `rgba(${rnd() > 0.5 ? 255 : 0},${rnd() > 0.5 ? 255 : 0},${rnd() > 0.5 ? 255 : 0},${0.1 + rnd() * 0.25})`;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.bezierCurveTo(x + rnd() * 10 - 5, 80, x + rnd() * 10 - 5, 170, x + rnd() * 6 - 3, 256);
        ctx.stroke();
      }
    });
    tex.colorSpace = THREE.NoColorSpace;
    tex.repeat.set(0.4, 0.4);
  }
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  texCache.set("bump-" + kind, tex);
  return tex;
}

/** Warm wooden colour map (planks, stilts). */
export function woodTexture(): THREE.Texture {
  const hit = texCache.get("wood");
  if (hit) return hit;
  const tex = canvasTexture(256, 256, (ctx) => {
    const rnd = hashNoise(21);
    ctx.fillStyle = "#e7c08a";
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 120; i++) {
      const x = rnd() * 256;
      ctx.strokeStyle = `rgba(${120 + rnd() * 40},${70 + rnd() * 30},${30 + rnd() * 20},${0.08 + rnd() * 0.22})`;
      ctx.lineWidth = 0.6 + rnd() * 3;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + rnd() * 12 - 6, 80, x + rnd() * 12 - 6, 170, x + rnd() * 8 - 4, 256);
      ctx.stroke();
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(0.35, 0.35);
  texCache.set("wood", tex);
  return tex;
}

/** Tileable ocean normal map built from layered sine waves. */
export function waterNormalTexture(seed = 1, freq = 3): THREE.Texture {
  const key = `water-${seed}-${freq}`;
  const hit = texCache.get(key);
  if (hit) return hit;
  const size = 256;
  const rnd = hashNoise(seed * 97);
  const waves = Array.from({ length: 9 }, () => ({
    kx: Math.round((rnd() * 2 - 1) * freq * 2) || 1,
    ky: Math.round((rnd() * 2 - 1) * freq * 2) || 1,
    ph: rnd() * Math.PI * 2,
    a: 0.35 + rnd() * 0.65,
  }));
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let v = 0;
      for (const w of waves) v += Math.sin(((w.kx * x + w.ky * y) / size) * Math.PI * 2 + w.ph) * w.a * 0.03;
      h[y * size + x] = v;
    }
  }
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const l = h[y * size + ((x - 1 + size) % size)];
      const r = h[y * size + ((x + 1) % size)];
      const u = h[((y - 1 + size) % size) * size + x];
      const d = h[((y + 1) % size) * size + x];
      let nx = (l - r) * 14;
      let ny = (u - d) * 14;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len;
      ny /= len;
      nz /= len;
      const i = (y * size + x) * 4;
      img.data[i] = (nx * 0.5 + 0.5) * 255;
      img.data[i + 1] = (ny * 0.5 + 0.5) * 255;
      img.data[i + 2] = (nz * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  texCache.set(key, tex);
  return tex;
}

/* Shared geometry / material caches keep draw setup cheap. */
export const matCache = new Map<string, THREE.MeshPhysicalMaterial>();
export interface ToyMatOpts {
  rough?: number;
  metal?: number;
  emissive?: number;
  emissiveIntensity?: number;
  clearcoat?: number;
  clearcoatRough?: number;
  bump?: BumpKind;
  bumpScale?: number;
  sheen?: number;
  wood?: boolean;
}
export function toyMat(color: number, opts: ToyMatOpts = {}) {
  const key = [
    color,
    opts.rough ?? 0.55,
    opts.metal ?? 0,
    opts.emissive ?? 0,
    opts.emissiveIntensity ?? 0,
    opts.clearcoat ?? 0.35,
    opts.clearcoatRough ?? 0.28,
    opts.bump ?? "none",
    opts.bumpScale ?? 1,
    opts.sheen ?? 0,
    opts.wood ? 1 : 0,
  ].join("-");
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshPhysicalMaterial({
      color,
      roughness: opts.rough ?? 0.55,
      metalness: opts.metal ?? 0,
      emissive: opts.emissive ?? 0x000000,
      emissiveIntensity: opts.emissiveIntensity ?? 0,
      clearcoat: opts.clearcoat ?? 0.35,
      clearcoatRoughness: opts.clearcoatRough ?? 0.28,
      sheen: opts.sheen ?? 0,
      sheenRoughness: 0.5,
      sheenColor: new THREE.Color(0xffffff),
    });
    const bump = bumpTexture(opts.bump ?? "none");
    if (bump) {
      m.bumpMap = bump;
      m.bumpScale = (opts.bumpScale ?? 1) * 1.6;
    }
    if (opts.wood) m.map = woodTexture();
    matCache.set(key, m);
  }
  return m;
}

export const geoCache = new Map<string, THREE.BufferGeometry>();
export function sphereGeo(r = 1, w = 16, h = 12) {
  const key = `s${r}-${w}-${h}`;
  let g = geoCache.get(key);
  if (!g) {
    g = new THREE.SphereGeometry(r, w, h);
    geoCache.set(key, g);
  }
  return g;
}

/** Rounded box built from an extruded rounded rectangle (toy-like bevels). */
export function roundedBoxGeo(w: number, h: number, d: number, r = 0.35) {
  const key = `rb${w.toFixed(2)}-${h.toFixed(2)}-${d.toFixed(2)}-${r.toFixed(2)}`;
  const cached = geoCache.get(key);
  if (cached) return cached;
  const rr = Math.min(r, w / 2 - 0.01, d / 2 - 0.01);
  const shape = new THREE.Shape();
  const x = -w / 2;
  const y = -d / 2;
  shape.moveTo(x + rr, y);
  shape.lineTo(x + w - rr, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + rr);
  shape.lineTo(x + w, y + d - rr);
  shape.quadraticCurveTo(x + w, y + d, x + w - rr, y + d);
  shape.lineTo(x + rr, y + d);
  shape.quadraticCurveTo(x, y + d, x, y + d - rr);
  shape.lineTo(x, y + rr);
  shape.quadraticCurveTo(x, y, x + rr, y);
  const bevel = Math.min(rr * 0.7, h * 0.3);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.02, h - bevel * 2),
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 2,
    curveSegments: 4,
  });
  geo.rotateX(-Math.PI / 2);
  // centre on the origin so mesh.position is the box centre (every caller assumes this)
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  geo.translate(0, -(bb.min.y + bb.max.y) / 2, 0);
  geo.computeVertexNormals();
  geoCache.set(key, geo);
  return geo;
}

/** Canvas texture helper (stripes, chevrons, text). */
export function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  draw(ctx);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

let stripeTex: THREE.Texture | null = null;
export function stripeTexture() {
  if (stripeTex) return stripeTex;
  stripeTex = stripeTextureCustom("#fff6e6", "#ff6f5e");
  return stripeTex;
}

const stripeCache = new Map<string, THREE.Texture>();
/** Diagonal safety stripes in any two colours (per-world platform edging). */
export function stripeTextureCustom(bg: string, fg: string) {
  const key = `${bg}|${fg}`;
  const hit = stripeCache.get(key);
  if (hit) return hit;
  const tex = canvasTexture(128, 32, (ctx) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 128, 32);
    ctx.fillStyle = fg;
    for (let i = -2; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 24, 32);
      ctx.lineTo(i * 24 + 16, 32);
      ctx.lineTo(i * 24 + 32, 0);
      ctx.lineTo(i * 24 + 16, 0);
      ctx.closePath();
      ctx.fill();
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  stripeCache.set(key, tex);
  return tex;
}

let lavaTex: THREE.Texture | null = null;
/** Glowing cracked-lava colour map (forge sea + magma rocks emissive). */
export function lavaTexture() {
  if (lavaTex) return lavaTex;
  lavaTex = canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = "#1c0703";
    ctx.fillRect(0, 0, 256, 256);
    const field = makeValueNoise(128, 5, 77, 2.2);
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 128; x++) {
        const v = field[y * 128 + x];
        if (v < 0.52) continue;
        const t = (v - 0.52) / 0.48;
        const r = 200 + Math.floor(t * 55);
        const g = Math.floor(40 + t * 150);
        ctx.fillStyle = `rgb(${r},${g},10)`;
        ctx.fillRect(x * 2, y * 2, 2, 2);
      }
    }
    // a few bright yellow-hot cores
    for (let i = 0; i < 26; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const rad = 4 + Math.random() * 10;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, "rgba(255,220,120,0.9)");
      g.addColorStop(0.5, "rgba(255,120,30,0.5)");
      g.addColorStop(1, "rgba(255,80,20,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  });
  lavaTex.wrapS = lavaTex.wrapT = THREE.RepeatWrapping;
  return lavaTex;
}

let chevronTex: THREE.Texture | null = null;
export function chevronTexture() {
  if (chevronTex) return chevronTex;
  chevronTex = canvasTexture(256, 256, (ctx) => {
    ctx.clearRect(0, 0, 256, 256);
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 20;
    ctx.lineCap = "round";
    for (let i = 0; i < 3; i++) {
      const y = 60 + i * 70;
      ctx.beginPath();
      ctx.moveTo(60, y + 40);
      ctx.lineTo(128, y);
      ctx.lineTo(196, y + 40);
      ctx.stroke();
    }
  });
  chevronTex.wrapS = chevronTex.wrapT = THREE.RepeatWrapping;
  return chevronTex;
}

export function makeLabelTexture(text: string, bg = "#ff6f5e", fg = "#fff6e6", font = "bold 90px Fredoka, sans-serif") {
  return canvasTexture(512, 160, (ctx) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 160);
    ctx.fillStyle = fg;
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 86);
  });
}
