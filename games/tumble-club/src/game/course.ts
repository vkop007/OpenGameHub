import * as THREE from "three";
import {
  canvasTexture,
  chevronTexture,
  clamp,
  lavaTexture,
  lerp,
  PALETTE,
  roundedBoxGeo,
  sphereGeo,
  stripeTexture,
  stripeTextureCustom,
  TAU,
  toyMat,
  WATER_Y,
} from "./core";
import { LevelDef, LevelMods, SECTION_LABELS, SectionType } from "./levels";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface Surface {
  id: string;
  kind: "box" | "ramp" | "seesaw" | "moving";
  x: number;
  z: number;
  w: number;
  d: number;
  y: number;
  y0?: number;
  y1?: number;
  z0?: number;
  z1?: number;
  tilt?: number;
  maxTilt?: number;
  pivotZ?: number;
  baseX?: number;
  baseY?: number;
  baseZ?: number;
  active: boolean;
  mesh?: THREE.Object3D;
  tag?: string;
  /** Conveyor speed along +z (towards the start). */
  belt?: number;
  beltTex?: THREE.Texture;
  /** Trampoline launch velocity. */
  bounce?: number;
  squish?: number;
  /** Ground grip multiplier (ice ~0.16, normal 1). */
  friction?: number;
  /** Sinking-platform state (floes / magma rocks). */
  sink?: { baseY: number; delay: number; gone: number; timer: number; respawn: number };
}

export interface Wall {
  x: number;
  z: number;
  w: number;
  d: number;
  y0: number;
  y1: number;
  active: boolean;
  mesh?: THREE.Object3D;
  kind?: "fixed" | "slider" | "hurdle" | "rail" | "pillar" | "piston";
  baseX?: number;
  amp?: number;
  speed?: number;
  phase?: number;
  /** Piston extension direction (+1 / -1 along x). */
  dir?: number;
  /** Piston cycle period in seconds. */
  period?: number;
  /** Previous extension 0..1 (slam sound edge detection). */
  pe?: number;
}

export interface SweepBar {
  x: number;
  z: number;
  y: number;
  len: number;
  thick: number;
  angle: number;
  speed: number;
  mesh: THREE.Group;
  fire?: boolean;
}

export interface WindZone {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  /** Push direction along x (+1 / -1). */
  dir: number;
  strength: number;
  period: number;
  phase: number;
  streaks?: THREE.Group;
  streakMat?: THREE.MeshBasicMaterial;
}

export interface Geyser {
  x: number;
  z: number;
  y: number;
  r: number;
  period: number;
  phase: number;
  erupt: number;
  tele: number;
  mesh: THREE.Group;
  column: THREE.Mesh;
  ventGlow: THREE.MeshStandardMaterial;
  audited: boolean;
}

export interface Bumper {
  x: number;
  z: number;
  y: number;
  r: number;
  mesh: THREE.Group;
  capMat: THREE.MeshStandardMaterial;
  flash: number;
}

export interface SnowInfo {
  oz: number;
  zTop: number;
  zBottom: number;
  yTop: number;
  yBottom: number;
  w: number;
  killZ: number;
}

export interface Hammer {
  x: number;
  z: number;
  pivotY: number;
  armLen: number;
  headR: number;
  headHalfLen: number;
  angle: number;
  amp: number;
  speed: number;
  phase: number;
  group: THREE.Group;
}

export interface Tile {
  x: number;
  z: number;
  size: number;
  row: number;
  col: number;
  state: "safe" | "fake";
  revealed: boolean;
  proven: boolean;
  timer: number;
  drop: number;
  active: boolean;
  mesh: THREE.Group;
  surface: Surface;
}

export interface Checkpoint {
  index: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  label: string;
}

export interface Section {
  type: SectionType;
  label: string;
  oz: number;
  zIn: number;
  zOut: number;
  aiEnd: number;
}

export interface Overhead {
  /** When true the camera rises over the structure instead of ducking beneath it. */
  above?: boolean;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z0: number;
  z1: number;
}

export interface RedLightInfo {
  oz: number;
  toy: THREE.Group;
  eyeMat: THREE.MeshStandardMaterial;
  stripMat: THREE.MeshStandardMaterial;
  lamps: THREE.MeshStandardMaterial[];
  glow: THREE.PointLight;
  zoneHi: number;
  zoneLo: number;
  zapZ: number;
}

export interface RampInfo {
  oz: number;
  zTop: number;
  zBottom: number;
  yTop: number;
  yBottom: number;
  w: number;
  platZ0: number;
  platZ1: number;
  killZ: number;
  rampHi: number;
  rampLo: number;
  lowCamHi: number;
  lowCamLo: number;
  chuteCurve: THREE.CatmullRomCurve3;
  chuteLip: THREE.Vector3;
}

export interface ClimbInfo {
  oz: number;
  slider1: Surface;
  lift: Surface;
  pairL: Surface;
  pairR: Surface;
  slider2: Surface;
  finishPad: Surface;
}

export interface Course {
  level: LevelDef;
  mods: LevelMods;
  group: THREE.Group;
  surfaces: Surface[];
  walls: Wall[];
  bars: SweepBar[];
  hammers: Hammer[];
  tiles: Tile[];
  checkpoints: Checkpoint[];
  sections: Section[];
  startPositions: { x: number; y: number; z: number; yaw: number }[];
  startZ: number;
  finishZ: number;
  finishY: number;
  movers: Surface[];
  pads: Surface[];
  belts: Surface[];
  seesaws: Surface[];
  sinks: Surface[];
  winds: WindZone[];
  geysers: Geyser[];
  bumpers: Bumper[];
  overheads: Overhead[];
  rl: RedLightInfo | null;
  ramp: RampInfo | null;
  snow: SnowInfo | null;
  climb: ClimbInfo | null;
  tileOz: number;
  tileStartZ: number;
  tileSpacing: number;
  safePath: number[];
  tileRows: number;
  tileCols: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const boxGeoCache = new Map<string, THREE.BoxGeometry>();
function boxGeo(w: number, h: number, d: number) {
  const k = `${w.toFixed(2)}_${h.toFixed(2)}_${d.toFixed(2)}`;
  let g = boxGeoCache.get(k);
  if (!g) {
    g = new THREE.BoxGeometry(w, h, d);
    boxGeoCache.set(k, g);
  }
  return g;
}

function shadowed<T extends THREE.Object3D>(o: T): T {
  o.traverse((c) => {
    const mesh = c as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const seeThrough = mats.some((m) => m && (m.transparent || (m as THREE.MeshBasicMaterial).isMeshBasicMaterial));
    mesh.castShadow = !seeThrough;
    mesh.receiveShadow = !seeThrough;
  });
  return o;
}

function labelTexture(text: string, bg: string, fg: string) {
  return canvasTexture(512, 160, (ctx) => {
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(6, 6, 500, 148, 34);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.roundRect(18, 18, 476, 124, 24);
    ctx.stroke();
    ctx.fillStyle = fg;
    ctx.font = "bold 74px Fredoka, Nunito, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 86);
  });
}

function arrowTexture() {
  const tex = canvasTexture(128, 256, (ctx) => {
    ctx.fillStyle = "#3a4a52";
    ctx.fillRect(0, 0, 128, 256);
    ctx.fillStyle = "rgba(255,201,60,0.95)";
    for (let i = 0; i < 2; i++) {
      const y = 30 + i * 128;
      ctx.beginPath();
      ctx.moveTo(64, y);
      ctx.lineTo(112, y + 52);
      ctx.lineTo(88, y + 52);
      ctx.lineTo(64, y + 24);
      ctx.lineTo(40, y + 52);
      ctx.lineTo(16, y + 52);
      ctx.closePath();
      ctx.fill();
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/* ------------------------------------------------------------------ */
/*  Canonical layout per section: entry edge, exit edge, AI hand-over  */
/* ------------------------------------------------------------------ */

const LAYOUT: Record<SectionType, { e: number; x: number; aiEnd: number }> = {
  sweep: { e: 2.5, x: -18.5, aiEnd: -18.5 },
  seesaw: { e: -17.75, x: -46.5, aiEnd: -42 },
  hammer: { e: -45.5, x: -77.4, aiEnd: -76.5 },
  redlight: { e: -77, x: -99, aiEnd: -99.5 },
  ballramp: { e: -99, x: -115.25, aiEnd: -116 },
  tiles: { e: -115, x: -150.5, aiEnd: -144.5 },
  walls: { e: -149.5, x: -176.5, aiEnd: -176.5 },
  climb: { e: -175.5, x: -217.5, aiEnd: -99999 },
  bounce: { e: 0, x: -46.5, aiEnd: -38 },
  treadmill: { e: 0, x: -42, aiEnd: -38 },
  ice: { e: 0, x: -38.5, aiEnd: -34.5 },
  snow: { e: 0, x: -47.5, aiEnd: -43.5 },
  wind: { e: 0, x: -46, aiEnd: -42 },
  floes: { e: 0, x: -46.2, aiEnd: -42.2 },
  lavahop: { e: 0, x: -42.8, aiEnd: -38.8 },
  pistons: { e: 0, x: -37, aiEnd: -33 },
  geysers: { e: 0, x: -37, aiEnd: -33 },
  bumpers: { e: 0, x: -35, aiEnd: -31 },
  firebars: { e: 0, x: -35, aiEnd: -31 },
};

/* ------------------------------------------------------------------ */
/*  The toy that watches the light                                     */
/* ------------------------------------------------------------------ */

function buildWatcher() {
  const g = new THREE.Group();
  const bodyMat = toyMat(PALETTE.turquoise, { rough: 0.35, clearcoat: 0.8, clearcoatRough: 0.12 });
  const creamMat = toyMat(PALETTE.cream, { rough: 0.4, clearcoat: 0.6, clearcoatRough: 0.15 });
  const coralMat = toyMat(PALETTE.coral, { rough: 0.35, clearcoat: 0.8, clearcoatRough: 0.12 });
  const yellowMat = toyMat(PALETTE.yellow, { rough: 0.3, clearcoat: 0.8 });

  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.6, 2.4, 28), creamMat);
  pedestal.position.y = 1.2;
  g.add(pedestal);
  const trim = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.4, 28), coralMat);
  trim.position.y = 2.4;
  g.add(trim);

  const body = new THREE.Mesh(roundedBoxGeo(3.4, 2.8, 2.4, 0.7), bodyMat);
  body.position.y = 4.0;
  g.add(body);
  const belly = new THREE.Mesh(roundedBoxGeo(2.1, 1.5, 0.3, 0.4), creamMat);
  belly.position.set(0, 3.8, 1.2);
  g.add(belly);

  const head = new THREE.Mesh(roundedBoxGeo(3.0, 2.5, 2.6, 0.8), creamMat);
  head.position.y = 6.4;
  g.add(head);

  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0x5a1a1a,
    emissive: 0xff3b2f,
    emissiveIntensity: 0.15,
    roughness: 0.15,
  });
  const dark = toyMat(0x173b46, { rough: 0.25, clearcoat: 1 });
  for (const sx of [-1, 1]) {
    const socket = new THREE.Mesh(sphereGeo(0.52, 20, 14), dark);
    socket.scale.set(1, 1, 0.55);
    socket.position.set(sx * 0.72, 6.6, 1.28);
    g.add(socket);
    const eye = new THREE.Mesh(sphereGeo(0.34, 18, 12), eyeMat);
    eye.scale.set(1, 1, 0.6);
    eye.position.set(sx * 0.72, 6.6, 1.5);
    g.add(eye);
  }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.1, 8, 20, Math.PI), dark);
  mouth.position.set(0, 5.75, 1.32);
  mouth.rotation.z = Math.PI;
  g.add(mouth);

  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.1, 8), coralMat);
  antenna.position.y = 8.1;
  g.add(antenna);
  const bulb = new THREE.Mesh(sphereGeo(0.34, 14, 10), yellowMat);
  bulb.position.y = 8.7;
  g.add(bulb);

  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 1.2, 6, 12), bodyMat);
    arm.position.set(sx * 2.0, 4.1, 0);
    arm.rotation.z = sx * 0.25;
    g.add(arm);
    const hand = new THREE.Mesh(sphereGeo(0.46, 14, 10), creamMat);
    hand.position.set(sx * 2.35, 3.3, 0);
    g.add(hand);
    const foot = new THREE.Mesh(roundedBoxGeo(1.1, 0.5, 1.5, 0.25), coralMat);
    foot.position.set(sx * 0.9, 2.7, 0.2);
    g.add(foot);
  }
  shadowed(g);
  return { group: g, eyeMat };
}

export function createBallMesh(radius: number) {
  const g = new THREE.Group();
  const colors = [PALETTE.coral, PALETTE.yellow, PALETTE.turquoise, PALETTE.pink];
  const base = new THREE.Mesh(
    sphereGeo(radius, 28, 20),
    toyMat(colors[Math.floor(Math.random() * colors.length)], { rough: 0.22, clearcoat: 0.9, clearcoatRough: 0.08 }),
  );
  base.castShadow = true;
  g.add(base);
  const bandMat = toyMat(PALETTE.cream, { rough: 0.25, clearcoat: 0.9, clearcoatRough: 0.1 });
  const band = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.99, radius * 0.16, 10, 28), bandMat);
  band.rotation.x = Math.PI / 2;
  g.add(band);
  const band2 = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.99, radius * 0.13, 10, 28), bandMat);
  band2.rotation.y = Math.PI / 2;
  g.add(band2);
  return g;
}

export function createSnowballMesh(radius: number) {
  const g = new THREE.Group();
  const mat = toyMat(0xf4faff, { rough: 0.85, clearcoat: 0.05, bump: "grain", bumpScale: 1.4 });
  const base = new THREE.Mesh(sphereGeo(radius, 22, 16), mat);
  base.castShadow = true;
  // lumpy snowball: squash slightly and stick a few small lumps on
  base.scale.set(1, 0.94, 1);
  g.add(base);
  const lumpMat = toyMat(0xe2f0fa, { rough: 0.9, clearcoat: 0 });
  const lumps: [number, number, number, number][] = [
    [0.55, 0.45, 0.3, 0.34],
    [-0.5, 0.2, 0.55, 0.28],
    [0.1, -0.55, -0.5, 0.3],
    [-0.2, 0.6, -0.4, 0.26],
  ];
  for (const [x, y, z, s] of lumps) {
    const lump = new THREE.Mesh(sphereGeo(radius * s, 10, 8), lumpMat);
    lump.position.set(x * radius, y * radius, z * radius);
    g.add(lump);
  }
  return g;
}

/* Small decorative builders shared by the frost / forge sections. */

export function makePine(scale = 1, snowy = true) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16 * scale, 0.22 * scale, 0.9 * scale, 8),
    toyMat(0x6a4a30, { rough: 0.9, clearcoat: 0 }),
  );
  trunk.position.y = 0.45 * scale;
  g.add(trunk);
  const green = toyMat(0x2e7d4f, { rough: 0.8, clearcoat: 0.05 });
  const snow = toyMat(0xf2f9ff, { rough: 0.7, clearcoat: 0.1 });
  const tiers: [number, number, number][] = [
    [1.05, 1.3, 1.15],
    [0.78, 1.1, 1.95],
    [0.5, 0.95, 2.65],
  ];
  for (const [r, h, y] of tiers) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r * scale, h * scale, 10), green);
    cone.position.y = y * scale;
    cone.castShadow = true;
    g.add(cone);
    if (snowy) {
      const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.55 * scale, h * 0.45 * scale, 10), snow);
      cap.position.y = (y + h * 0.32) * scale;
      g.add(cap);
    }
  }
  shadowed(g);
  return g;
}

export function makeRock(color: number, s = 1, emissive = 0, emissiveIntensity = 0) {
  const m = new THREE.Mesh(
    new THREE.DodecahedronGeometry(s, 0),
    toyMat(color, { rough: 0.9, clearcoat: 0.02, bump: "grain", bumpScale: 1.2, emissive, emissiveIntensity }),
  );
  m.scale.y = 0.72;
  m.rotation.set(Math.random() * 3, Math.random() * 6, Math.random() * 3);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function makeSnowman() {
  const g = new THREE.Group();
  const mat = toyMat(0xf6fbff, { rough: 0.75, clearcoat: 0.1 });
  const bottom = new THREE.Mesh(sphereGeo(0.62, 16, 12), mat);
  bottom.position.y = 0.55;
  const middle = new THREE.Mesh(sphereGeo(0.45, 16, 12), mat);
  middle.position.y = 1.35;
  const head = new THREE.Mesh(sphereGeo(0.32, 16, 12), mat);
  head.position.y = 1.95;
  g.add(bottom, middle, head);
  const coal = toyMat(0x1a2a33, { rough: 0.4 });
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(sphereGeo(0.05, 8, 6), coal);
    eye.position.set(sx * 0.11, 2.02, 0.28);
    g.add(eye);
  }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 8), toyMat(0xff8a3c, { rough: 0.5 }));
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 1.95, 0.4);
  g.add(nose);
  shadowed(g);
  return g;
}

/* ------------------------------------------------------------------ */
/*  Build the whole course for a level                                 */
/* ------------------------------------------------------------------ */

export function buildCourse(level: LevelDef): Course {
  const theme = level.theme;
  const mods = level.mods;
  const group = new THREE.Group();
  const surfaces: Surface[] = [];
  const walls: Wall[] = [];
  const bars: SweepBar[] = [];
  const hammers: Hammer[] = [];
  const tiles: Tile[] = [];
  const checkpoints: Checkpoint[] = [];
  const seesaws: Surface[] = [];
  const movers: Surface[] = [];
  const pads: Surface[] = [];
  const belts: Surface[] = [];
  const sinks: Surface[] = [];
  const winds: WindZone[] = [];
  const geysers: Geyser[] = [];
  const bumpers: Bumper[] = [];
  const overheads: Overhead[] = [];
  const sections: Section[] = [];
  let rl: RedLightInfo | null = null;
  let ramp: RampInfo | null = null;
  let snow: SnowInfo | null = null;
  let climb: ClimbInfo | null = null;
  let finishZ = 0;
  let finishY = 0;
  let tileOz = 0;
  let tileStartZ = 0;
  let safePath: number[] = [];
  const tileRows = 8;
  const tileCols = 5;
  const tileSpacing = 3.0;

  let oz = 0;
  const Z = (z: number) => z + oz;

  const style = level.style;
  const dark = theme.id === "forge";
  const edgeTex =
    style === "frost"
      ? stripeTextureCustom("#eaf6ff", "#3f9fd8")
      : style === "forge"
        ? stripeTextureCustom("#23232b", "#ff7a2a")
        : stripeTexture();
  const stripeMat = new THREE.MeshPhysicalMaterial({
    map: edgeTex,
    roughness: 0.42,
    clearcoat: 0.6,
    clearcoatRoughness: 0.2,
    emissive: 0xffffff,
    emissiveMap: edgeTex,
    emissiveIntensity: theme.glow * 0.1,
  });
  const chevCache = new Map<string, THREE.MeshBasicMaterial>();
  const chevColor = style === "forge" ? 0xffd9b0 : style === "frost" ? 0xe2f4ff : 0xffffff;
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xfff1c4,
    emissive: 0xffd36a,
    emissiveIntensity: 0.6 + theme.glow * 1.2,
    roughness: 0.3,
  });

  const addSurf = (s: Surface) => {
    surfaces.push(s);
    return s;
  };

  /* ---------------- shared builders ---------------- */

  function addStilts(g: THREE.Group, w: number, d: number, top: number) {
    const mat =
      style === "frost"
        ? toyMat(0xcfe9f7, { rough: 0.22, clearcoat: 1, clearcoatRough: 0.08 })
        : style === "forge"
          ? toyMat(0x3a3a44, { rough: 0.5, metal: 0.7, clearcoat: 0.1 })
          : toyMat(0xffffff, { rough: 0.75, clearcoat: 0.05, wood: true });
    const h = top - 1.1 - WATER_Y;
    if (h <= 0.2) return;
    const geo = new THREE.CylinderGeometry(0.34, 0.42, h, 12);
    const inset = 1.1;
    const xs = w > 5 ? [-w / 2 + inset, w / 2 - inset] : [0];
    const zs = d > 5 ? [-d / 2 + inset, d / 2 - inset] : [0];
    for (const sx of xs) {
      for (const sz of zs) {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(sx, WATER_Y + h / 2, sz);
        m.castShadow = true;
        g.add(m);
      }
    }
  }

  interface PlatformOpts {
    x: number;
    z: number; // canonical
    w: number;
    d: number;
    top: number;
    color?: number;
    side?: number;
    stripes?: boolean;
    stilts?: boolean;
    chevrons?: boolean;
    thickness?: number;
    tag?: string;
    lamps?: boolean;
  }

  function makePlatform(o: PlatformOpts): Surface {
    const color = o.color ?? PALETTE.cream;
    const side = o.side ?? PALETTE.turquoiseDark;
    const th = o.thickness ?? 1.1;
    const g = new THREE.Group();
    const wz = Z(o.z);
    g.position.set(o.x, 0, wz);

    const base = new THREE.Mesh(roundedBoxGeo(o.w, th, o.d, 0.45), toyMat(side, { rough: 0.5, bump: "grain", clearcoat: 0.4 }));
    base.position.y = o.top - 0.3 - th / 2;
    g.add(base);

    // light top surface sits proud of the coloured body so the route reads at a glance
    const slab = new THREE.Mesh(
      roundedBoxGeo(o.w + 0.04, 0.3, o.d + 0.04, 0.4),
      toyMat(color, { rough: 0.5, bump: "grain", bumpScale: 0.7, clearcoat: 0.25, clearcoatRough: 0.4 }),
    );
    slab.position.y = o.top - 0.15;
    g.add(slab);

    if (o.stripes !== false) {
      const t = 0.16;
      const h = 0.3;
      const y = o.top - 0.16;
      const long = boxGeo(o.w, h, t);
      const short = boxGeo(t, h, o.d);
      const a = new THREE.Mesh(long, stripeMat);
      a.position.set(0, y, o.d / 2 - t / 2);
      const b = new THREE.Mesh(long, stripeMat);
      b.position.set(0, y, -o.d / 2 + t / 2);
      const c = new THREE.Mesh(short, stripeMat);
      c.position.set(o.w / 2 - t / 2, y, 0);
      const e = new THREE.Mesh(short, stripeMat);
      e.position.set(-o.w / 2 + t / 2, y, 0);
      g.add(a, b, c, e);
    }

    if (o.chevrons) {
      const rx = Math.max(1, Math.round(o.w / 5));
      const ry = Math.max(1, Math.round(o.d / 8));
      const key = `${rx}x${ry}`;
      let mat = chevCache.get(key);
      if (!mat) {
        const tex = chevronTexture().clone();
        tex.needsUpdate = true;
        tex.repeat.set(rx, ry);
        mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.5, depthWrite: false, color: chevColor });
        chevCache.set(key, mat);
      }
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(o.w * 0.72, o.d * 0.8), mat);
      plane.rotation.x = -Math.PI / 2;
      plane.position.y = o.top + 0.015;
      g.add(plane);
    }

    if (o.lamps && dark && o.w >= 11) {
      for (const sx of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.85, 8), toyMat(PALETTE.navy, { rough: 0.4, metal: 0.4 }));
        post.position.set(sx * (o.w / 2 - 0.55), o.top + 0.42, o.d / 2 - 0.55);
        g.add(post);
        const bulb = new THREE.Mesh(sphereGeo(0.19, 12, 8), lampMat);
        bulb.position.set(sx * (o.w / 2 - 0.55), o.top + 0.95, o.d / 2 - 0.55);
        g.add(bulb);
      }
    }

    if (o.stilts) addStilts(g, o.w, o.d, o.top);
    shadowed(g);
    group.add(g);

    return {
      id: `s${group.children.length}`,
      kind: "box",
      x: o.x,
      z: wz,
      w: o.w,
      d: o.d,
      y: o.top,
      active: true,
      mesh: g,
      tag: o.tag,
    };
  }

  function addSign(text: string, x: number, z: number, top: number, color: string) {
    const g = new THREE.Group();
    const postMat = toyMat(0xfff6e6, { rough: 0.4, clearcoat: 0.5 });
    for (const sx of [-1.5, 1.5]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 2.4, 10), postMat);
      post.position.set(sx, 1.2, 0);
      g.add(post);
    }
    const tex = labelTexture(text, color, "#fff6e6");
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(4.4, 1.38),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, color: dark ? 0xffe2cc : 0xffffff }),
    );
    board.position.y = 2.5;
    g.add(board);
    g.position.set(x, top, Z(z));
    shadowed(g);
    group.add(g);
  }

  function addFlag(x: number, z: number, top: number, color: number) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.2, 10), toyMat(0xfff6e6, { clearcoat: 0.6 }));
    pole.position.y = 1.6;
    g.add(pole);
    const flag = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.1, 4), toyMat(color, { rough: 0.5, sheen: 0.8 }));
    flag.rotation.z = -Math.PI / 2;
    flag.rotation.y = Math.PI / 4;
    flag.position.set(0.55, 2.7, 0);
    flag.scale.set(1, 1, 0.25);
    g.add(flag);
    const ball = new THREE.Mesh(sphereGeo(0.13, 10, 8), toyMat(PALETTE.yellow, { clearcoat: 0.8 }));
    ball.position.y = 3.25;
    g.add(ball);
    g.position.set(x, top, z);
    shadowed(g);
    group.add(g);
  }

  const addCheckpoint = (x: number, y: number, zCanon: number, label: string, flagX: number) => {
    checkpoints.push({ index: 0, x, y, z: Z(zCanon), yaw: Math.PI, label });
    addFlag(flagX, Z(zCanon), y, checkpoints.length % 2 ? PALETTE.yellow : PALETTE.turquoise);
  };

  const paddedMat = (color: number) => toyMat(color, { rough: 0.62, clearcoat: 0.12, bump: "quilt", bumpScale: 1.1, sheen: 0.7 });

  const addWall = (
    x: number,
    zCanon: number,
    w: number,
    d: number,
    y1 = 2.7,
    kind: Wall["kind"] = "fixed",
    mat: THREE.Material = paddedMat(PALETTE.turquoise),
    extra: Partial<Wall> = {},
  ) => {
    const g = new THREE.Group();
    const y0 = extra.y0 ?? 0;
    const h = Math.max(0.2, y1 - y0);
    const m = new THREE.Mesh(roundedBoxGeo(w, h, d, 0.3), mat);
    m.position.y = h / 2;
    g.add(m);
    if (kind !== "piston") {
      const cap = new THREE.Mesh(roundedBoxGeo(w + 0.12, 0.3, d + 0.12, 0.2), toyMat(PALETTE.cream, { rough: 0.4, clearcoat: 0.6 }));
      cap.position.y = h;
      g.add(cap);
    } else {
      // hazard face on the pushing side
      const face = new THREE.Mesh(new THREE.BoxGeometry(0.14, h * 0.7, d * 0.92), stripeMat);
      face.position.set(((extra.dir ?? 1) > 0 ? 1 : -1) * (w / 2 + 0.02), h / 2, 0);
      g.add(face);
    }
    g.position.set(x, y0, Z(zCanon));
    shadowed(g);
    group.add(g);
    const wl: Wall = { x, z: Z(zCanon), w, d, y0, y1, active: true, mesh: g, kind, ...extra };
    walls.push(wl);
    return wl;
  };

  /* ---------------- start pad ---------------- */
  oz = 0;
  const startTop = style === "frost" ? 0xeaf6ff : style === "forge" ? 0x4a4a55 : PALETTE.cream;
  const startSide = style === "frost" ? 0x7fb8d9 : style === "forge" ? 0x23232b : PALETTE.coral;
  const gatePost = style === "frost" ? 0x7fd4f2 : style === "forge" ? 0xb33a1a : PALETTE.coral;
  const gateBeam = style === "frost" ? 0xf4fbff : style === "forge" ? 0xff7a2a : PALETTE.turquoise;
  addSurf(
    makePlatform({ x: 0, z: 7, w: 16, d: 12, top: 0, color: startTop, side: startSide, stilts: true, chevrons: true, tag: "start", lamps: true }),
  );
  {
    const g = new THREE.Group();
    const mat = toyMat(gatePost, { rough: 0.35, clearcoat: 0.7 });
    for (const sx of [-1, 1]) {
      const post = new THREE.Mesh(roundedBoxGeo(0.7, 7.4, 0.7, 0.25), mat);
      post.position.set(sx * 6.2, 3.7, 0);
      g.add(post);
    }
    const beam = new THREE.Mesh(roundedBoxGeo(13.6, 1.5, 0.8, 0.3), toyMat(gateBeam, { rough: 0.35, clearcoat: 0.7 }));
    beam.position.y = 7.2;
    g.add(beam);
    const tex = labelTexture("TUMBLE CLUB", "#123c4a", "#ffc93c");
    const board = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.8), new THREE.MeshBasicMaterial({ map: tex, transparent: true, color: dark ? 0xffe2cc : 0xffffff }));
    board.position.set(0, 7.2, 0.45);
    g.add(board);
    const board2 = board.clone();
    board2.rotation.y = Math.PI;
    board2.position.z = -0.45;
    g.add(board2);
    g.position.set(0, 0, 3);
    shadowed(g);
    group.add(g);
    overheads.push({ x0: -7, x1: 7, y0: 6.4, y1: 8.2, z0: 2.3, z1: 3.7 });
  }

  /* ================================================================ */
  /*  Section builders (canonical coordinates, shifted by `oz`)        */
  /* ================================================================ */

  const builders: Record<SectionType, () => void> = {
    /* ---------------- Sweep bars ---------------- */
    sweep: () => {
      addSurf(makePlatform({ x: 0, z: -3, w: 17, d: 11, top: 0, color: 0xfff1d6, side: PALETTE.coral, stilts: true, chevrons: true, tag: "sweep", lamps: true }));
      addSurf(makePlatform({ x: 0, z: -13.5, w: 17, d: 10, top: 0, color: 0xfff1d6, side: PALETTE.coral, stilts: true, chevrons: true, tag: "sweep" }));
      addSign("SWEEPERS", -10.5, -2, 0, "#ff6f5e");
      const barMat2 = new THREE.MeshPhysicalMaterial({ map: stripeTexture(), roughness: 0.4, clearcoat: 0.7, color: 0xffd9d0 });
      for (const [z, speed] of [
        [-3.5, 1.75],
        [-13.2, -2.05],
      ] as [number, number][]) {
        const g = new THREE.Group();
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.5, 16), toyMat(PALETTE.navy, { rough: 0.35, metal: 0.5 }));
        post.position.y = 0.75;
        g.add(post);
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.5, 16), toyMat(PALETTE.yellow, { rough: 0.3, clearcoat: 0.9 }));
        hub.position.y = 1.35;
        g.add(hub);
        const arm = new THREE.Group();
        arm.position.y = 0.62;
        const bar = new THREE.Mesh(roundedBoxGeo(15, 0.62, 0.72, 0.3), stripeMat);
        bar.position.y = 0;
        arm.add(bar);
        const bar2 = new THREE.Mesh(new THREE.BoxGeometry(15, 0.2, 0.78), barMat2);
        bar2.position.y = 0.38;
        arm.add(bar2);
        for (const sx of [-1, 1]) {
          const cap = new THREE.Mesh(sphereGeo(0.42, 14, 10), toyMat(PALETTE.coral, { rough: 0.3, clearcoat: 0.9 }));
          cap.position.set(sx * 7.5, 0, 0);
          arm.add(cap);
        }
        g.add(arm);
        g.position.set(0, 0, Z(z));
        shadowed(g);
        group.add(g);
        g.userData.arm = arm;
        bars.push({ x: 0, z: Z(z), y: 0.62, len: 15, thick: 0.72, angle: Math.random() * TAU, speed: speed * mods.sweepSpeed, mesh: g });
      }
      addCheckpoint(0, 0, -17.2, "Sweepers", 8.6);
    },

    /* ---------------- Seesaws ---------------- */
    seesaw: () => {
      addSurf(makePlatform({ x: 0, z: -20.5, w: 15, d: 5.5, top: 0, color: PALETTE.cream, side: PALETTE.turquoise, stilts: true, chevrons: true, tag: "seesaw-in" }));
      addSign("SEESAWS", -9.8, -20, 0, "#2ec9bd");
      for (const sx of [-1, 1]) {
        const px = sx * 3.4;
        const pivotZ = -31.5;
        const g = new THREE.Group();
        g.position.set(px, 0, Z(pivotZ));
        const plank = new THREE.Mesh(roundedBoxGeo(6.0, 0.5, 18, 0.35), toyMat(0xffffff, { rough: 0.55, clearcoat: 0.35, wood: true }));
        plank.position.y = -0.25;
        g.add(plank);
        for (const sz of [-1, 1]) {
          const stripe = new THREE.Mesh(new THREE.BoxGeometry(6.04, 0.14, 0.5), stripeMat);
          stripe.position.set(0, 0.02, sz * 8.7);
          g.add(stripe);
          const bumper = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 5.6, 6, 12), toyMat(PALETTE.coral, { rough: 0.45, clearcoat: 0.4, sheen: 0.6 }));
          bumper.rotation.x = Math.PI / 2;
          bumper.position.set(sz * 2.95, 0.1, 0);
          g.add(bumper);
        }
        const pivot = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.9, 16), toyMat(PALETTE.navy, { rough: 0.35, metal: 0.6 }));
        pivot.position.set(px, -0.15, Z(pivotZ));
        group.add(pivot);
        shadowed(g);
        group.add(g);
        const s: Surface = {
          id: `seesaw${sx}`,
          kind: "seesaw",
          x: px,
          z: Z(pivotZ),
          w: 6.0,
          d: 18,
          y: 0,
          tilt: 0,
          maxTilt: 0.05 * mods.seesawTilt,
          pivotZ: Z(pivotZ),
          active: true,
          mesh: g,
          tag: "seesaw",
        };
        addSurf(s);
        seesaws.push(s);
      }
      addSurf(makePlatform({ x: 0, z: -43.5, w: 15, d: 6, top: 0, color: PALETTE.cream, side: PALETTE.turquoise, stilts: true, chevrons: true, tag: "seesaw-out" }));
      addCheckpoint(0, 0, -44.5, "Seesaws", -8.6);
    },

    /* ---------------- Hammer zigzag ---------------- */
    hammer: () => {
      addSurf(makePlatform({ x: -1.5, z: -51.5, w: 7, d: 12, top: 0, color: 0xffe3d6, side: PALETTE.coral, stilts: true, chevrons: true, tag: "bridgeA" }));
      addSurf(makePlatform({ x: 0, z: -58.5, w: 15, d: 4.5, top: 0, color: PALETTE.cream, side: PALETTE.turquoise, stilts: true, tag: "mid" }));
      addSurf(makePlatform({ x: 1.5, z: -65.5, w: 7, d: 12, top: 0, color: 0xffe3d6, side: PALETTE.coral, stilts: true, chevrons: true, tag: "bridgeB" }));
      addSurf(makePlatform({ x: 0, z: -73.6, w: 16, d: 7.6, top: 0, color: PALETTE.cream, side: PALETTE.turquoise, stilts: true, chevrons: true, tag: "hammer-out", lamps: true }));
      addSign("HAMMERS", -10.2, -51, 0, "#ff6f5e");
      for (const [hx, hz, phase] of [
        [-1.5, -51.5, 0],
        [1.5, -65.5, 1.9],
      ] as [number, number, number][]) {
        const g = new THREE.Group();
        const frameMat = toyMat(PALETTE.navy, { rough: 0.35, metal: 0.55 });
        for (const sx of [-1, 1]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 6.4, 12), frameMat);
          leg.position.set(sx * 3.1, 3.2, 0);
          g.add(leg);
        }
        const top = new THREE.Mesh(roundedBoxGeo(7, 0.6, 0.9, 0.25), toyMat(PALETTE.yellow, { rough: 0.3, clearcoat: 0.9 }));
        top.position.y = 6.4;
        g.add(top);
        const pivot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.2, 14), frameMat);
        pivot.rotation.z = Math.PI / 2;
        pivot.position.y = 6.1;
        g.add(pivot);
        const swing = new THREE.Group();
        swing.position.y = 6.1;
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 4.6, 12), toyMat(0xd9e6ea, { rough: 0.22, metal: 0.9, clearcoat: 0.2 }));
        arm.position.y = -2.3;
        swing.add(arm);
        const head = new THREE.Group();
        head.position.y = -4.6;
        // padded head: a cylinder lying along z with flat, capped ends
        const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 1.8, 28), paddedMat(PALETTE.coral));
        pad.rotation.x = Math.PI / 2;
        head.add(pad);
        for (const sz of [-1, 1]) {
          const end = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.88, 0.16, 28), toyMat(PALETTE.cream, { rough: 0.4, clearcoat: 0.7 }));
          end.rotation.x = Math.PI / 2;
          end.position.z = sz * 0.9;
          head.add(end);
        }
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.88, 0.3, 28), toyMat(PALETTE.yellow, { rough: 0.3, clearcoat: 0.9 }));
        band.rotation.x = Math.PI / 2;
        head.add(band);
        swing.add(head);
        g.add(swing);
        g.position.set(hx, 0, Z(hz));
        shadowed(g);
        group.add(g);
        g.userData.swing = swing;
        overheads.push({ above: true, x0: hx - 3.7, x1: hx + 3.7, y0: 5.9, y1: 6.9, z0: Z(hz) - 0.7, z1: Z(hz) + 0.7 });
        hammers.push({
          x: hx,
          z: Z(hz),
          pivotY: 6.1,
          armLen: 4.6,
          headR: 0.88,
          headHalfLen: 0.98,
          angle: 0,
          amp: 1.18,
          speed: 1.45 * mods.hammerSpeed,
          phase,
          group: g,
        });
      }
      addCheckpoint(0, 0, -74.5, "Hammers", 8.6);
    },

    /* ---------------- Red light, green light ---------------- */
    redlight: () => {
      const rlStart = -77;
      const rlFinish = -96;
      addSurf(makePlatform({ x: 0, z: -88, w: 19, d: 22, top: 0, color: 0xd8f4ef, side: PALETTE.turquoise, stilts: true, chevrons: true, tag: "redlight", lamps: true }));
      addSign("RED LIGHT", -11.6, -78, 0, "#123c4a");
      const stripMat = new THREE.MeshStandardMaterial({ color: 0x2ec9bd, emissive: 0x2ec9bd, emissiveIntensity: 0.7, roughness: 0.3 });
      for (const sx of [-1, 1]) {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 21), stripMat);
        strip.position.set(sx * 9.1, 0.12, Z(-87.5));
        group.add(strip);
      }
      for (const [z, col] of [
        [rlStart, PALETTE.coral],
        [rlFinish, PALETTE.yellow],
      ] as [number, number][]) {
        const line = new THREE.Mesh(new THREE.BoxGeometry(18.4, 0.1, 0.8), toyMat(col, { rough: 0.4, clearcoat: 0.5 }));
        line.position.set(0, 0.06, Z(z));
        group.add(line);
      }

      // overhead gate: the toy stands on a high deck so the path stays open beneath it
      const slabTop = 9.4;
      const gate = new THREE.Group();
      const colMat = toyMat(PALETTE.cream, { rough: 0.45, clearcoat: 0.5, bump: "grain" });
      for (const sx of [-1, 1]) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.05, slabTop - WATER_Y, 20), colMat);
        col.position.set(sx * 7.4, WATER_Y + (slabTop - WATER_Y) / 2, 0);
        gate.add(col);
        const collar = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.5, 20), toyMat(PALETTE.coral, { rough: 0.35, clearcoat: 0.8 }));
        collar.position.set(sx * 7.4, 3.6, 0);
        gate.add(collar);
      }
      const deck = new THREE.Mesh(roundedBoxGeo(17.6, 0.9, 7, 0.4), toyMat(PALETTE.turquoiseDark, { rough: 0.45, clearcoat: 0.6, bump: "grain" }));
      deck.position.y = slabTop - 0.45;
      gate.add(deck);
      const deckTop = new THREE.Mesh(roundedBoxGeo(17.7, 0.2, 7.1, 0.35), toyMat(PALETTE.cream, { rough: 0.45, clearcoat: 0.5 }));
      deckTop.position.y = slabTop - 0.06;
      gate.add(deckTop);
      const frontStripe = new THREE.Mesh(new THREE.BoxGeometry(17.7, 0.4, 0.2), stripeMat);
      frontStripe.position.set(0, slabTop - 0.45, 3.55);
      gate.add(frontStripe);
      const lamps: THREE.MeshStandardMaterial[] = [];
      [0x39d98a, 0xffc93c, 0xff3b2f].forEach((c, i) => {
        const m = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: c, emissiveIntensity: 0.1, roughness: 0.2 });
        lamps.push(m);
        const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.3, 20), toyMat(PALETTE.navy, { rough: 0.3, metal: 0.4 }));
        housing.rotation.x = Math.PI / 2;
        housing.position.set(-6.3 + i * 1.7, slabTop - 0.45, 3.65);
        gate.add(housing);
        const lamp = new THREE.Mesh(sphereGeo(0.5, 18, 12), m);
        lamp.scale.z = 0.55;
        lamp.position.set(-6.3 + i * 1.7, slabTop - 0.45, 3.85);
        gate.add(lamp);
      });
      gate.position.set(0, 0, Z(-101.5));
      shadowed(gate);
      group.add(gate);
      overheads.push({ x0: -9.5, x1: 9.5, y0: slabTop - 0.9, y1: slabTop + 18, z0: Z(-105.3), z1: Z(-97.7) });

      const watcher = buildWatcher();
      watcher.group.position.set(0, slabTop, Z(-101.5));
      group.add(watcher.group);
      const glow = new THREE.PointLight(0xff3b2f, 0, 34, 2);
      glow.position.set(0, slabTop + 7, Z(-99));
      group.add(glow);
      addCheckpoint(0, 0, -97.5, "Red Light", -9.8);
      rl = {
        oz,
        toy: watcher.group,
        eyeMat: watcher.eyeMat,
        stripMat,
        lamps,
        glow,
        zoneHi: Z(-76.5),
        zoneLo: Z(-96.5),
        zapZ: Z(-78.2),
      };
    },

    /* ---------------- Ball ramp ---------------- */
    ballramp: () => {
      const rampZ0 = -109;
      const rampZ1 = -99;
      const rampY0 = 3.2;
      const rampY1 = 0;
      const len = rampZ1 - rampZ0;
      const slope = Math.atan2(rampY0 - rampY1, len);
      const g = new THREE.Group();
      const hyp = Math.hypot(len, rampY0 - rampY1);
      const mesh = new THREE.Mesh(roundedBoxGeo(11.6, 0.7, hyp, 0.4), toyMat(0xfff1d6, { rough: 0.5, bump: "grain", clearcoat: 0.25 }));
      mesh.rotation.x = -slope;
      mesh.position.set(0, (rampY0 + rampY1) / 2 - 0.35, Z((rampZ0 + rampZ1) / 2));
      g.add(mesh);
      for (const sx of [-1, 1]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, hyp), stripeMat);
        rail.rotation.x = -slope;
        rail.position.set(sx * 5.6, (rampY0 + rampY1) / 2 + 0.1, Z((rampZ0 + rampZ1) / 2));
        g.add(rail);
      }
      // chevrons printed on the ramp surface
      const tex = chevronTexture().clone();
      tex.needsUpdate = true;
      tex.repeat.set(2, 2);
      const chev = new THREE.Mesh(
        new THREE.PlaneGeometry(8.4, hyp * 0.9),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.45, depthWrite: false, color: chevColor }),
      );
      chev.rotation.x = -Math.PI / 2 - slope;
      chev.position.set(0, (rampY0 + rampY1) / 2 + 0.03, Z((rampZ0 + rampZ1) / 2));
      g.add(chev);
      shadowed(g);
      group.add(g);
      addSurf({
        id: "ramp",
        kind: "ramp",
        x: 0,
        z: Z((rampZ0 + rampZ1) / 2),
        w: 11.6,
        d: len,
        y: rampY0,
        y0: rampY1,
        y1: rampY0,
        z0: Z(rampZ1),
        z1: Z(rampZ0),
        active: true,
        tag: "ramp",
      });
      addSurf(makePlatform({ x: 0, z: -112, w: 11, d: 6.5, top: 3.2, color: PALETTE.cream, side: PALETTE.turquoise, stilts: true, chevrons: true, tag: "ramp-top" }));
      addSign("BALL RAMP", -8.2, -100.5, 0, "#ffc93c");
      addCheckpoint(0, 3.2, -112, "Ball Ramp", 4.6);

      // hopper + chute carried on two portal frames outside the path
      const chutePts = [
        new THREE.Vector3(0, 13.0, Z(-123.4)),
        new THREE.Vector3(0, 12.3, Z(-120.5)),
        new THREE.Vector3(0, 11.1, Z(-117.6)),
        new THREE.Vector3(0, 9.7, Z(-115.4)),
        new THREE.Vector3(0, 8.5, Z(-114.2)),
      ];
      const chuteCurve = new THREE.CatmullRomCurve3(chutePts);
      const h = new THREE.Group();
      const frameMat = toyMat(PALETTE.navy, { rough: 0.35, metal: 0.55 });
      const portal = (z: number, beamY: number) => {
        for (const sx of [-1, 1]) {
          const col = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, beamY - WATER_Y, 14), frameMat);
          col.position.set(sx * 9.6, WATER_Y + (beamY - WATER_Y) / 2, Z(z));
          h.add(col);
        }
        const beam = new THREE.Mesh(roundedBoxGeo(19.8, 0.6, 0.8, 0.25), toyMat(PALETTE.yellow, { rough: 0.3, clearcoat: 0.8 }));
        beam.position.set(0, beamY, Z(z));
        h.add(beam);
      };
      portal(-124, 10.4);
      portal(-117.8, 13.8);
      for (const sx of [-1, 1]) {
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 8), frameMat);
        rod.position.set(sx * 1.3, 12.6, Z(-117.8));
        h.add(rod);
      }
      const hopper = new THREE.Mesh(
        new THREE.CylinderGeometry(3.4, 1.5, 3.2, 28, 1, true),
        toyMat(PALETTE.coral, { rough: 0.4, clearcoat: 0.6 }).clone(),
      );
      (hopper.material as THREE.MeshPhysicalMaterial).side = THREE.DoubleSide;
      hopper.position.set(0, 12.6, Z(-124));
      h.add(hopper);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.22, 10, 32), toyMat(PALETTE.yellow, { rough: 0.3, clearcoat: 0.9 }));
      rim.rotation.x = Math.PI / 2;
      rim.position.set(0, 14.2, Z(-124));
      h.add(rim);
      for (let i = 0; i < 5; i++) {
        const b = new THREE.Mesh(sphereGeo(0.95, 20, 14), toyMat(i % 2 ? PALETTE.coral : PALETTE.yellow, { rough: 0.25, clearcoat: 0.9, clearcoatRough: 0.1 }));
        b.position.set(Math.cos(i * 1.7) * 1.5, 13.0 + (i % 3) * 0.5, Z(-124) + Math.sin(i * 1.7) * 1.5);
        h.add(b);
      }
      const segs = 8;
      for (let i = 0; i < segs; i++) {
        const p0 = chuteCurve.getPoint(i / segs);
        const p1 = chuteCurve.getPoint((i + 1) / segs);
        const mid = p0.clone().add(p1).multiplyScalar(0.5);
        const l = p0.distanceTo(p1);
        const trough = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.3, l + 0.15), toyMat(0xfff1d6, { rough: 0.45, clearcoat: 0.5 }));
        trough.position.copy(mid);
        trough.lookAt(p1);
        h.add(trough);
        for (const sx of [-1, 1]) {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.6, l + 0.15), toyMat(PALETTE.turquoise, { rough: 0.35, clearcoat: 0.8 }));
          rail.position.copy(mid);
          rail.position.x += sx * 1.3;
          rail.lookAt(p1);
          h.add(rail);
        }
      }
      shadowed(h);
      group.add(h);
      overheads.push({ x0: -10, x1: 10, y0: 8.2, y1: 15, z0: Z(-125), z1: Z(-113.6) });
      ramp = {
        oz,
        zTop: Z(rampZ0),
        zBottom: Z(rampZ1),
        yTop: rampY0,
        yBottom: rampY1,
        w: 11.6,
        platZ0: Z(-115.5),
        platZ1: Z(-108.5),
        killZ: Z(-101.5),
        rampHi: Z(-98.5),
        rampLo: Z(-109.5),
        lowCamHi: Z(-108),
        lowCamLo: Z(-126),
        chuteCurve,
        chuteLip: chutePts[chutePts.length - 1].clone(),
      };
    },

    /* ---------------- Tip-toe tiles ---------------- */
    tiles: () => {
      addSurf(makePlatform({ x: 0, z: -117.5, w: 17, d: 5, top: 0, color: PALETTE.cream, side: PALETTE.turquoise, stilts: true, chevrons: true, tag: "tiles-in" }));
      addSign("TIP TOE", -10.6, -117, 0, "#9b7ede");
      const tileSize = 2.5;
      const startZ = -121.5;
      safePath = [];
      let col = 2;
      for (let r = 0; r < tileRows; r++) {
        if (r > 0) {
          const dir = Math.random() < 0.5 ? -1 : 1;
          col = clamp(col + (Math.random() < 0.72 ? dir : -dir), 0, tileCols - 1);
        }
        safePath.push(col);
      }
      const tileGeo = roundedBoxGeo(tileSize, 0.5, tileSize, 0.3);
      const tileMats = [
        toyMat(0xfff1d6, { rough: 0.45, clearcoat: 0.45, bump: "grain", bumpScale: 0.6 }),
        toyMat(0xffe6cf, { rough: 0.45, clearcoat: 0.45, bump: "grain", bumpScale: 0.6 }),
      ];
      const rimGeo = new THREE.BoxGeometry(tileSize + 0.12, 0.16, tileSize + 0.12);
      const rimMat = toyMat(PALETTE.coral, { rough: 0.4, clearcoat: 0.6 });
      for (let r = 0; r < tileRows; r++) {
        for (let c = 0; c < tileCols; c++) {
          const x = (c - (tileCols - 1) / 2) * tileSpacing;
          const z = Z(startZ - r * tileSpacing);
          const g = new THREE.Group();
          const top = new THREE.Mesh(tileGeo, tileMats[(r + c) % 2]);
          top.position.y = -0.25;
          g.add(top);
          const rim = new THREE.Mesh(rimGeo, rimMat);
          rim.position.y = -0.42;
          g.add(rim);
          g.position.set(x, 0, z);
          shadowed(g);
          group.add(g);
          const surface = addSurf({
            id: `tile-${r}-${c}`,
            kind: "box",
            x,
            z,
            w: tileSize,
            d: tileSize,
            y: 0,
            active: true,
            tag: `tile-${r}-${c}`,
          });
          tiles.push({
            x,
            z,
            size: tileSize,
            row: r,
            col: c,
            state: safePath[r] === c ? "safe" : "fake",
            revealed: false,
            proven: false,
            timer: 0,
            drop: 0,
            active: true,
            mesh: g,
            surface,
          });
        }
      }
      addSurf(makePlatform({ x: 0, z: -147.5, w: 17, d: 6, top: 0, color: PALETTE.cream, side: PALETTE.turquoise, stilts: true, chevrons: true, tag: "tiles-out" }));
      addCheckpoint(0, 0, -148.5, "Tip Toe", 8.6);
      tileOz = oz;
      tileStartZ = Z(startZ);
    },

    /* ---------------- Wall squeeze ---------------- */
    walls: () => {
      addSurf(makePlatform({ x: 0, z: -163, w: 23, d: 27, top: 0, color: 0xffe9dd, side: PALETTE.coral, stilts: true, chevrons: true, tag: "walls", lamps: true }));
      addSign("WALL SQUEEZE", -13.4, -152, 0, "#ff6f5e");
      const wallMat = paddedMat(PALETTE.turquoise);
      const wallMat2 = paddedMat(0x25b3a8);
      // row 1: two fixed gaps
      addWall(-9.1, -156, 3.8, 1.3, 2.7, "fixed", wallMat);
      addWall(0, -156, 7.6, 1.3, 2.7, "fixed", wallMat);
      addWall(9.1, -156, 3.8, 1.3, 2.7, "fixed", wallMat);
      // row 2: sliding panels with a moving gap
      const sliderL = addWall(-7.7, -163, 12, 1.3, 2.7, "slider", wallMat2);
      const sliderR = addWall(7.7, -163, 12, 1.3, 2.7, "slider", wallMat2);
      sliderL.baseX = -7.7;
      sliderR.baseX = 7.7;
      sliderL.amp = sliderR.amp = 4.2;
      sliderL.speed = sliderR.speed = 0.85;
      sliderL.phase = sliderR.phase = 0;
      addWall(-10.4, -163, 1.6, 1.3, 2.7, "fixed", wallMat);
      addWall(10.4, -163, 1.6, 1.3, 2.7, "fixed", wallMat);
      // row 3: narrow openings with hurdles
      addWall(-8.6, -170, 4.6, 1.3, 2.7, "fixed", wallMat);
      addWall(-3.25, -170, 2.3, 1.3, 2.7, "fixed", wallMat);
      addWall(3.25, -170, 2.3, 1.3, 2.7, "fixed", wallMat);
      addWall(8.6, -170, 4.6, 1.3, 2.7, "fixed", wallMat);
      for (const gx of [-6.5, 0, 6.5]) addWall(gx, -168.4, 2.5, 0.55, 0.62, "hurdle", toyMat(PALETTE.yellow, { rough: 0.4, clearcoat: 0.7, sheen: 0.5 }));
      for (const sx of [-1, 1]) addWall(sx * 11.3, -163, 0.7, 27, 1.0, "rail", paddedMat(PALETTE.yellow));
      addCheckpoint(0, 0, -174.5, "Wall Squeeze", -11.9);
    },

    /* ---------------- The climb ---------------- */
    climb: () => {
      const CTOP = style === "frost" ? 0xf4fbff : style === "forge" ? 0x55555f : PALETTE.cream;
      const CSIDE = style === "frost" ? 0x7fb8d9 : style === "forge" ? 0x23232b : PALETTE.turquoise;
      const CMOVE = style === "frost" ? 0x9fd0e8 : style === "forge" ? 0x2b2b33 : PALETTE.turquoiseDark;
      const CGLOW = style === "frost" ? 0x9fe8ff : style === "forge" ? 0xff7a2a : PALETTE.yellow;
      const CPOST = style === "frost" ? 0x7fd4f2 : style === "forge" ? 0xb33a1a : PALETTE.coral;
      const CBEAM = style === "frost" ? 0xf4fbff : style === "forge" ? 0xff7a2a : PALETTE.turquoise;
      const CSIGN = style === "frost" ? "#4aa3d8" : style === "forge" ? "#ff7a2a" : "#2ec9bd";
      addSurf(makePlatform({ x: 0, z: -179, w: 17, d: 7, top: 0, color: CTOP, side: CSIDE, stilts: true, chevrons: true, tag: "climb-in" }));
      addSign("THE CLIMB", -10.8, -178, 0, CSIGN);
      addCheckpoint(0, 0, -180.5, "The Climb", 8.6);

      const movingPlatform = (x: number, y: number, zCanon: number, w: number, d: number, color: number, tag: string): Surface => {
        const g = new THREE.Group();
        const base = new THREE.Mesh(roundedBoxGeo(w, 0.9, d, 0.4), toyMat(CMOVE, { rough: 0.45, bump: "grain", clearcoat: 0.4 }));
        base.position.y = -0.45;
        g.add(base);
        const top = new THREE.Mesh(roundedBoxGeo(w + 0.04, 0.28, d + 0.04, 0.35), toyMat(color, { rough: 0.5, bump: "grain", bumpScale: 0.6, clearcoat: 0.25 }));
        top.position.y = -0.28;
        g.add(top);
        for (const sz of [-1, 1]) {
          const stripe = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, 0.24), stripeMat);
          stripe.position.set(0, -0.12, sz * (d / 2 - 0.12));
          g.add(stripe);
        }
        const glow = new THREE.Mesh(
          new THREE.CylinderGeometry(0.5, 0.7, 0.3, 14),
          toyMat(CGLOW, { emissive: CGLOW, emissiveIntensity: 0.4 + theme.glow * 0.6 }),
        );
        glow.position.y = -1.0;
        g.add(glow);
        g.position.set(x, y, Z(zCanon));
        shadowed(g);
        group.add(g);
        const s: Surface = {
          id: tag,
          kind: "moving",
          x,
          z: Z(zCanon),
          w,
          d,
          y,
          baseX: x,
          baseY: y,
          baseZ: Z(zCanon),
          active: true,
          mesh: g,
          tag,
        };
        movers.push(s);
        return s;
      };

      const slider1 = movingPlatform(0, 0.9, -185.5, 6.6, 6.0, CTOP, "slider1");
      const lift = movingPlatform(0, 0.9, -191, 6.0, 6.0, CTOP, "lift");
      const pairL = movingPlatform(-1.7, 4.7, -196.5, 3.4, 5.2, style === "cove" ? 0xffe3d6 : CTOP, "pairL");
      const pairR = movingPlatform(1.7, 4.7, -196.5, 3.4, 5.2, style === "cove" ? 0xffe3d6 : CTOP, "pairR");
      const slider2 = movingPlatform(0, 5.9, -202, 5.2, 5.2, CTOP, "slider2");
      const finishPad = makePlatform({ x: 0, z: -211.5, w: 17, d: 12, top: 6.7, color: CTOP, side: CPOST, stilts: true, chevrons: true, tag: "finish", lamps: true });
      [slider1, lift, pairL, pairR, slider2, finishPad].forEach((s) => addSurf(s));
      climb = { oz, slider1, lift, pairL, pairR, slider2, finishPad };

      // finish arch
      const g = new THREE.Group();
      const postMat = toyMat(CPOST, { rough: 0.3, clearcoat: 0.8, clearcoatRough: 0.1 });
      for (const sx of [-1, 1]) {
        const post = new THREE.Mesh(roundedBoxGeo(1.1, 7.4, 1.1, 0.35), postMat);
        post.position.set(sx * 6.4, 3.7, 0);
        g.add(post);
        const foot = new THREE.Mesh(roundedBoxGeo(2.0, 0.7, 2.0, 0.3), toyMat(PALETTE.yellow, { rough: 0.3, clearcoat: 0.9 }));
        foot.position.set(sx * 6.4, 0.35, 0);
        g.add(foot);
      }
      const beam = new THREE.Mesh(roundedBoxGeo(14.2, 2.0, 1.2, 0.4), toyMat(CBEAM, { rough: 0.3, clearcoat: 0.8, clearcoatRough: 0.1 }));
      beam.position.y = 7.6;
      g.add(beam);
      const tex = labelTexture("FINISH", "#ff6f5e", "#fff6e6");
      const board = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 2.6), new THREE.MeshBasicMaterial({ map: tex, transparent: true, color: dark ? 0xffe2cc : 0xffffff }));
      board.position.set(0, 7.6, 0.65);
      g.add(board);
      const board2 = board.clone();
      board2.rotation.y = Math.PI;
      board2.position.z = -0.65;
      g.add(board2);
      for (let i = 0; i < 8; i++) {
        const flag = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.06), toyMat(i % 2 ? PALETTE.navy : PALETTE.cream, { clearcoat: 0.5 }));
        flag.position.set(-5.6 + i * 1.6, 8.9, 0);
        g.add(flag);
      }
      g.position.set(0, 6.7, Z(-209));
      shadowed(g);
      group.add(g);
      overheads.push({ x0: -7.4, x1: 7.4, y0: 13.2, y1: 17, z0: Z(-209) - 0.9, z1: Z(-209) + 0.9 });
      finishZ = Z(-209);
      finishY = 6.7;
    },

    /* ---------------- Bouncy bay ---------------- */
    bounce: () => {
      addSurf(makePlatform({ x: 0, z: -2.5, w: 15, d: 5, top: 0, color: PALETTE.cream, side: PALETTE.coral, stilts: true, chevrons: true, tag: "bounce-in", lamps: true }));
      addSign("BOUNCY BAY", -9.5, -2, 0, "#ffc93c");
      const padCenters = [-8, -16, -24, -32];
      for (const pz of padCenters) {
        const g = new THREE.Group();
        const spring = new THREE.Group();
        spring.position.y = -1.7;
        const coilMat = toyMat(0xdfe8ec, { rough: 0.25, metal: 0.9, clearcoat: 0.3 });
        for (let i = 0; i < 4; i++) {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.12, 10, 24), coilMat);
          ring.rotation.x = Math.PI / 2;
          ring.position.y = 0.2 + i * 0.4;
          spring.add(ring);
        }
        g.add(spring);
        const plate = new THREE.Group();
        plate.position.y = -0.1;
        const cushion = new THREE.Mesh(roundedBoxGeo(6, 0.5, 6, 0.9), toyMat(PALETTE.coral, { rough: 0.45, clearcoat: 0.5, sheen: 0.6, bump: "quilt", bumpScale: 0.6 }));
        cushion.position.y = -0.15;
        plate.add(cushion);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.14, 10, 36), toyMat(PALETTE.yellow, { rough: 0.3, clearcoat: 0.9 }));
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.14;
        plate.add(ring);
        const dot = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.06, 24), toyMat(PALETTE.cream, { rough: 0.4, clearcoat: 0.6 }));
        dot.position.y = 0.11;
        plate.add(dot);
        g.add(plate);
        g.position.set(0, 0, Z(pz));
        g.userData.spring = spring;
        g.userData.plate = plate;
        shadowed(g);
        group.add(g);
        const s = addSurf({
          id: `pad${pz}`,
          kind: "box",
          x: 0,
          z: Z(pz),
          w: 6,
          d: 6,
          y: 0,
          active: true,
          mesh: g,
          tag: "pad",
          bounce: 15.5,
          squish: 0,
        });
        pads.push(s);
      }
      addSurf(makePlatform({ x: 0, z: -41.5, w: 15, d: 10, top: 0, color: PALETTE.cream, side: PALETTE.turquoise, stilts: true, chevrons: true, tag: "bounce-out" }));
      addCheckpoint(0, 0, -44.5, "Bouncy Bay", -8.6);
    },

    /* ---------------- Treadmills ---------------- */
    treadmill: () => {
      addSurf(makePlatform({ x: 0, z: -2.5, w: 15, d: 5, top: 0, color: PALETTE.cream, side: PALETTE.coral, stilts: true, chevrons: true, tag: "tread-in", lamps: true }));
      addSign("TREADMILLS", -9.6, -2, 0, "#ff8a5c");
      const beltTex = arrowTexture();
      const makeBelt = (zc: number, d: number, speed: number) => {
        const s = makePlatform({ x: 0, z: zc, w: 13, d, top: 0, color: 0x46565e, side: PALETTE.navy, stilts: true, chevrons: false, tag: "belt" });
        const tex = beltTex.clone();
        tex.needsUpdate = true;
        tex.repeat.set(1.6, d / 5.2);
        const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0, emissive: 0xffc93c, emissiveMap: tex, emissiveIntensity: 0.05 + theme.glow * 0.1 });
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(10.6, d - 0.8), mat);
        plane.rotation.set(-Math.PI / 2, 0, Math.PI);
        plane.position.y = 0.012;
        (s.mesh as THREE.Group).add(plane);
        s.belt = speed;
        s.beltTex = tex;
        belts.push(s);
        addSurf(s);
      };
      makeBelt(-12, 14, 3.8 * mods.treadSpeed);
      addSurf(makePlatform({ x: 0, z: -21, w: 15, d: 4, top: 0, color: PALETTE.cream, side: PALETTE.turquoise, stilts: true, chevrons: false, tag: "tread-mid" }));
      makeBelt(-30, 14, 4.6 * mods.treadSpeed);
      addSurf(makePlatform({ x: 0, z: -39.5, w: 15, d: 5, top: 0, color: PALETTE.cream, side: PALETTE.turquoise, stilts: true, chevrons: true, tag: "tread-out" }));
      const pillarMat = paddedMat(PALETTE.coral);
      const pillars: [number, number, number, number][] = [
        [-9.2, 0, 0.95, 3.6],
        [-14.6, Math.PI, 1.1, 3.6],
        [-26, 0.6, 1.0, 3.8],
        [-30, 2.6, 1.15, 3.8],
        [-34, 4.4, 0.9, 3.8],
      ];
      for (const [pz, phase, speed, amp] of pillars) {
        const w = addWall(0, pz, 2.4, 1.2, 1.5, "pillar", pillarMat);
        w.baseX = 0;
        w.amp = amp;
        w.speed = speed;
        w.phase = phase;
      }
      addCheckpoint(0, 0, -40.5, "Treadmills", 8.6);
    },

    /* ---------------- Glacier slide (slippery ice) ---------------- */
    ice: () => {
      const ICE_TOP = 0xe8f5fc;
      const ICE_SIDE = 0x8fc3dd;
      addSurf(makePlatform({ x: 0, z: -2.5, w: 15, d: 5, top: 0, color: ICE_TOP, side: ICE_SIDE, stilts: true, chevrons: true, tag: "ice-in" }));
      addSign("GLACIER SLIDE", -9.6, -2, 0, "#3f9fd8");
      const sheets: [number, number][] = [
        [-7.5, 9],
        [-18.2, 8],
        [-28.4, 8],
      ];
      const glazeMat = new THREE.MeshPhysicalMaterial({
        color: 0xbfe6ff,
        roughness: 0.08,
        metalness: 0,
        transparent: true,
        opacity: 0.32,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        depthWrite: false,
      });
      for (const [zc, d] of sheets) {
        const s = makePlatform({ x: 0, z: zc, w: 12, d, top: 0, color: 0xdff2fd, side: ICE_SIDE, stilts: true, chevrons: true, tag: "ice" });
        s.friction = 0.16;
        addSurf(s);
        const glaze = new THREE.Mesh(new THREE.PlaneGeometry(11.2, d - 0.7), glazeMat);
        glaze.rotation.x = -Math.PI / 2;
        glaze.position.set(0, 0.02, Z(zc));
        group.add(glaze);
      }
      const bankMat = toyMat(0xf2f9ff, { rough: 0.8, clearcoat: 0.05 });
      for (const sx of [-1, 1]) addWall(sx * 6.35, -17.7, 0.9, 29.4, 1.1, "rail", bankMat);
      // pines on little ice chunks floating beside the slide
      const pineSpots: [number, number, number][] = [
        [-10.5, -6, 1.2],
        [10.5, -13, 1.5],
        [-11, -21, 1.1],
        [11, -27, 1.4],
      ];
      for (const [x, zc, s] of pineSpots) {
        const chunk = makeRock(0xdff2fd, 2.3);
        chunk.position.set(x, WATER_Y + 1.2, Z(zc));
        group.add(chunk);
        const pine = makePine(s);
        pine.position.set(x, WATER_Y + 2.4, Z(zc));
        group.add(pine);
      }
      addSurf(makePlatform({ x: 0, z: -35.5, w: 15, d: 6, top: 0, color: ICE_TOP, side: ICE_SIDE, stilts: true, chevrons: true, tag: "ice-out" }));
      addCheckpoint(0, 0, -0.5, "Glacier Slide", -7.6);
      addCheckpoint(0, 0, -37, "Glacier Slide", 7.6);
    },

    /* ---------------- Avalanche (downhill snowball chase) ---------------- */
    snow: () => {
      const SNOW_TOP = 0xf2f9ff;
      const SNOW_SIDE = 0x9fd0e8;
      const snowMat = toyMat(SNOW_TOP, { rough: 0.75, clearcoat: 0.08, bump: "grain", bumpScale: 0.8 });
      addSurf(makePlatform({ x: 0, z: -2.5, w: 13, d: 5, top: 0, color: SNOW_TOP, side: SNOW_SIDE, stilts: true, chevrons: true, tag: "snow-in" }));
      addSign("AVALANCHE", -9.2, -2, 0, "#7fb8d9");
      const buildSlope = (zA: number, yA: number, zB: number, yB: number, w: number, chevrons: boolean) => {
        const len = zA - zB;
        const slope = Math.atan2(yA - yB, len);
        const hyp = Math.hypot(len, yA - yB);
        const mesh = new THREE.Mesh(roundedBoxGeo(w, 0.7, hyp, 0.4), snowMat);
        mesh.rotation.x = -slope;
        mesh.position.set(0, (yA + yB) / 2 - 0.35, Z((zA + zB) / 2));
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        if (chevrons) {
          const tex = chevronTexture().clone();
          tex.needsUpdate = true;
          tex.repeat.set(2, 3);
          const chev = new THREE.Mesh(
            new THREE.PlaneGeometry(w * 0.72, hyp * 0.9),
            new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.45, depthWrite: false, color: chevColor }),
          );
          chev.rotation.x = -Math.PI / 2 - slope;
          chev.position.set(0, (yA + yB) / 2 + 0.03, Z((zA + zB) / 2));
          group.add(chev);
        }
      };
      // uphill entry ramp, then the big descent
      buildSlope(0.5, 0, -7.5, 4, 11, true);
      addSurf({ id: "snow-up", kind: "ramp", x: 0, z: Z(-3.5), w: 11, d: 8, y: 4, y0: 0, y1: 4, z0: Z(0.5), z1: Z(-7.5), active: true, tag: "snow-up" });
      addSurf(makePlatform({ x: 0, z: -10, w: 11, d: 5, top: 4, color: SNOW_TOP, side: SNOW_SIDE, stilts: true, chevrons: false, tag: "snow-top" }));
      buildSlope(-12.5, 4, -42.5, 0, 11, true);
      addSurf({ id: "snow-down", kind: "ramp", x: 0, z: Z(-27.5), w: 11, d: 30, y: 4, y0: 4, y1: 0, z0: Z(-12.5), z1: Z(-42.5), active: true, tag: "snow-down" });
      // tall bobsled-chute snow walls down both sides
      const bankMat = toyMat(0xf2f9ff, { rough: 0.8, clearcoat: 0.05 });
      for (const sx of [-1, 1]) addWall(sx * 5.9, -21.25, 0.9, 44, 5.4, "rail", bankMat, { y0: -0.5 });
      // ice gate the snowballs pour from
      const gateMat = toyMat(0xcfe9f7, { rough: 0.22, clearcoat: 1, clearcoatRough: 0.08 });
      for (const sx of [-1, 1]) {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.95, 7.5, 12), gateMat);
        pillar.position.set(sx * 5.9, 6.5, Z(-12.5));
        pillar.castShadow = true;
        group.add(pillar);
      }
      const beam = new THREE.Mesh(roundedBoxGeo(13, 1.0, 1.2, 0.3), gateMat);
      beam.position.set(0, 10.2, Z(-12.5));
      beam.castShadow = true;
      group.add(beam);
      for (let i = 0; i < 3; i++) {
        const b = new THREE.Mesh(sphereGeo(0.8, 14, 10), snowMat);
        b.position.set(-4 + i * 4, 4.8, Z(-11.2) - (i % 2) * 0.8);
        b.castShadow = true;
        group.add(b);
      }
      addSurf(makePlatform({ x: 0, z: -45, w: 13, d: 5, top: 0, color: SNOW_TOP, side: SNOW_SIDE, stilts: true, chevrons: true, tag: "snow-out" }));
      addCheckpoint(0, 0, -0.5, "Avalanche", 7);
      addCheckpoint(0, 0, -46, "Avalanche", -7);
      snow = { oz, zTop: Z(-12.5), zBottom: Z(-42.5), yTop: 4, yBottom: 0, w: 11, killZ: Z(-50.5) };
    },

    /* ---------------- Blizzard bridge (crosswind gusts) ---------------- */
    wind: () => {
      const ICE_TOP = 0xe8f5fc;
      const ICE_SIDE = 0x8fc3dd;
      addSurf(makePlatform({ x: 0, z: -2.5, w: 13, d: 5, top: 0, color: ICE_TOP, side: ICE_SIDE, stilts: true, chevrons: true, tag: "wind-in" }));
      addSign("BLIZZARD BRIDGE", -9.2, -2, 0, "#9fd0e8");
      const bridges = [-10, -22.5, -35];
      const dirs = [1, -1, 1];
      const periods = [3.4, 2.8, 3.1];
      const poleMat = toyMat(0xfff6e6, { rough: 0.4, clearcoat: 0.5 });
      bridges.forEach((zc, i) => {
        addSurf(makePlatform({ x: 0, z: zc, w: 3.6, d: 10, top: 0, color: ICE_TOP, side: ICE_SIDE, stilts: true, chevrons: false, tag: "wind" }));
        for (const sx of [-1, 1]) {
          for (const sz of [-1, 1]) {
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 2.3, 8), poleMat);
            pole.position.set(sx * 2.4, 1.15, Z(zc + sz * 4.4));
            pole.castShadow = true;
            group.add(pole);
            const sock = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.9, 8), toyMat(0xff9db4, { rough: 0.5 }));
            sock.rotation.z = dirs[i] > 0 ? -Math.PI / 2 : Math.PI / 2;
            sock.position.set(sx * 2.4 + dirs[i] * 0.5, 2.1, Z(zc + sz * 4.4));
            group.add(sock);
          }
        }
        const streakMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false });
        const streaks = new THREE.Group();
        for (let k = 0; k < 5; k++) {
          const p = new THREE.Mesh(new THREE.PlaneGeometry(2.2 + Math.random() * 1.6, 0.22), streakMat);
          p.position.set((Math.random() - 0.5) * 7, 0.7 + Math.random() * 2.2, (Math.random() - 0.5) * 9);
          p.userData.v = 0.7 + Math.random() * 0.7;
          streaks.add(p);
        }
        streaks.position.set(0, 0, Z(zc));
        group.add(streaks);
        winds.push({ x0: -4.5, x1: 4.5, z0: Z(zc + 5.5), z1: Z(zc - 5.5), dir: dirs[i], strength: 7, period: periods[i], phase: i * 1.7, streaks, streakMat });
      });
      addSurf(makePlatform({ x: 0, z: -43, w: 13, d: 6, top: 0, color: ICE_TOP, side: ICE_SIDE, stilts: true, chevrons: true, tag: "wind-out" }));
      addCheckpoint(0, 0, -0.5, "Blizzard Bridge", -7);
      addCheckpoint(0, 0, -44.5, "Blizzard Bridge", 7);
    },

    /* ---------------- Breaking floes (sinking ice) ---------------- */
    floes: () => {
      addSurf(makePlatform({ x: 0, z: -2.5, w: 15, d: 5, top: 0, color: 0xe8f5fc, side: 0x8fc3dd, stilts: true, chevrons: true, tag: "floes-in" }));
      addSign("BREAKING FLOES", -9.8, -2, 0, "#5aa8cc");
      const xs = [0, 0.8, -0.8, 0.5, -0.5, 0.8, -0.8, 0];
      xs.forEach((x, i) => {
        const zc = -8 - i * 4.6;
        const g = new THREE.Group();
        const base = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.1, 1.0, 18), toyMat(0x9fd0e8, { rough: 0.35, clearcoat: 0.8 }));
        base.position.y = -0.7;
        g.add(base);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(2.45, 2.45, 0.35, 18), toyMat(0xf4fbff, { rough: 0.6, clearcoat: 0.2 }));
        cap.position.y = -0.175;
        g.add(cap);
        g.position.set(x, 0, Z(zc));
        shadowed(g);
        group.add(g);
        const s = addSurf({
          id: `floe${i}`,
          kind: "box",
          x,
          z: Z(zc),
          w: 4.4,
          d: 4.4,
          y: 0,
          active: true,
          mesh: g,
          tag: "floe",
          sink: { baseY: 0, delay: 1.7, gone: 2.2, timer: 0, respawn: 0 },
        });
        sinks.push(s);
      });
      addSurf(makePlatform({ x: 0, z: -43.2, w: 15, d: 6, top: 0, color: 0xe8f5fc, side: 0x8fc3dd, stilts: true, chevrons: true, tag: "floes-out" }));
      addCheckpoint(0, 0, -0.5, "Breaking Floes", 7.6);
      addCheckpoint(0, 0, -44.5, "Breaking Floes", -7.6);
    },

    /* ---------------- Magma hops (sinking lava rocks) ---------------- */
    lavahop: () => {
      addSurf(makePlatform({ x: 0, z: -2.5, w: 13, d: 5, top: 0, color: 0x4a4a55, side: 0x23232b, stilts: true, chevrons: true, tag: "hop-in", lamps: true }));
      addSign("MAGMA HOPS", -9.4, -2, 0, "#d84a1a");
      const crustMat = new THREE.MeshStandardMaterial({
        color: 0x2a0d05,
        emissive: 0xff6a1a,
        emissiveMap: lavaTexture(),
        emissiveIntensity: 1.6,
        roughness: 0.7,
      });
      const xs = [0, -1.2, 1.2, -1.2, 1.2, -0.8, 0];
      xs.forEach((x, i) => {
        const zc = -8 - i * 4.8;
        const g = new THREE.Group();
        const rock = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 1.6, 1.0, 12), toyMat(0x2b2b33, { rough: 0.85, bump: "grain" }));
        rock.position.y = -0.55;
        g.add(rock);
        const crust = new THREE.Mesh(new THREE.CylinderGeometry(1.95, 1.95, 0.3, 12), crustMat);
        crust.position.y = -0.12;
        g.add(crust);
        g.position.set(x, 0, Z(zc));
        shadowed(g);
        group.add(g);
        const s = addSurf({
          id: `hop${i}`,
          kind: "box",
          x,
          z: Z(zc),
          w: 3.4,
          d: 3.4,
          y: 0,
          active: true,
          mesh: g,
          tag: "hop",
          sink: { baseY: 0, delay: 1.4, gone: 2.0, timer: 0, respawn: 0 },
        });
        sinks.push(s);
      });
      addSurf(makePlatform({ x: 0, z: -39.8, w: 13, d: 6, top: 0, color: 0x4a4a55, side: 0x23232b, stilts: true, chevrons: true, tag: "hop-out", lamps: true }));
      addCheckpoint(0, 0, -0.5, "Magma Hops", -7);
      addCheckpoint(0, 0, -41, "Magma Hops", 7);
    },

    /* ---------------- Piston alley (punching walls) ---------------- */
    pistons: () => {
      const METAL_TOP = 0x4a4a55;
      const METAL_SIDE = 0x23232b;
      addSurf(makePlatform({ x: 0, z: -2.5, w: 15, d: 5, top: 0, color: METAL_TOP, side: METAL_SIDE, stilts: true, chevrons: true, tag: "pist-in", lamps: true }));
      addSign("PISTON ALLEY", -9.6, -2, 0, "#8a8f9a");
      addSurf(makePlatform({ x: 0, z: -18, w: 14, d: 26, top: 0, color: METAL_TOP, side: METAL_SIDE, stilts: true, chevrons: true, tag: "pistons", lamps: true }));
      const railMat = toyMat(0x55555f, { rough: 0.5, metal: 0.6 });
      for (const sx of [-1, 1]) {
        for (const zc of [-7.75, -12.75, -18.25, -23.75, -28.75]) addWall(sx * 7.2, zc, 0.7, 4.4, 1.4, "rail", railMat);
      }
      const housingMat = toyMat(0x2b2b33, { rough: 0.55, metal: 0.5 });
      const pistonMat = toyMat(0x8a8f9a, { rough: 0.4, metal: 0.7 });
      const colGeo = new THREE.CylinderGeometry(0.4, 0.5, -WATER_Y, 10);
      [-10, -15.5, -21, -26.5].forEach((zc, i) => {
        for (const sx of [-1, 1]) {
          const housing = new THREE.Mesh(roundedBoxGeo(3, 3.0, 3.4, 0.3), housingMat);
          housing.position.set(sx * 9.2, 1.5, Z(zc));
          housing.castShadow = true;
          housing.receiveShadow = true;
          group.add(housing);
          const col = new THREE.Mesh(colGeo, housingMat);
          col.position.set(sx * 9.2, WATER_Y / 2, Z(zc));
          group.add(col);
          addWall(sx * 8.2, zc, 4.4, 2.6, 2.4, "piston", pistonMat, { dir: -sx, period: 2.4, phase: i * 0.9 + (sx > 0 ? 1.2 : 0), amp: 5.4, baseX: sx * 8.2, pe: 0 });
        }
      });
      addSurf(makePlatform({ x: 0, z: -34, w: 15, d: 6, top: 0, color: METAL_TOP, side: METAL_SIDE, stilts: true, chevrons: true, tag: "pist-out", lamps: true }));
      addCheckpoint(0, 0, -0.5, "Piston Alley", 7.6);
      addCheckpoint(0, 0, -35, "Piston Alley", -7.6);
    },

    /* ---------------- Lava geysers (timed eruptions) ---------------- */
    geysers: () => {
      addSurf(makePlatform({ x: 0, z: -2.5, w: 15, d: 5, top: 0, color: 0x3f3f4a, side: 0x23232b, stilts: true, chevrons: true, tag: "gey-in", lamps: true }));
      addSign("LAVA GEYSERS", -10, -2, 0, "#ff6a1a");
      addSurf(makePlatform({ x: 0, z: -18, w: 16, d: 26, top: 0, color: 0x3f3f4a, side: 0x23232b, stilts: true, chevrons: true, tag: "geysers", lamps: true }));
      const railMat = toyMat(0x55555f, { rough: 0.5, metal: 0.6 });
      for (const sx of [-1, 1]) addWall(sx * 8.2, -18, 0.7, 26, 1.2, "rail", railMat);
      const vents: [number, number, number][] = [
        [-3.5, -10, 0],
        [3.5, -10, 1.3],
        [0, -15, 0.65],
        [-3.5, -20, 1.95],
        [3.5, -20, 0.35],
        [0, -25, 1.6],
      ];
      for (const [x, zc, ph] of vents) {
        const g = new THREE.Group();
        const crater = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.45, 10, 22), toyMat(0x23232b, { rough: 0.8 }));
        crater.rotation.x = Math.PI / 2;
        crater.position.y = 0.15;
        g.add(crater);
        const ventGlow = new THREE.MeshStandardMaterial({ color: 0x2a0d05, emissive: 0xff5a1a, emissiveIntensity: 0.8, roughness: 0.6 });
        const pool = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.15, 20), ventGlow);
        pool.position.y = 0.05;
        g.add(pool);
        const colGeo = new THREE.CylinderGeometry(1.1, 1.45, 7, 14, 1, true);
        colGeo.translate(0, 3.5, 0);
        const column = new THREE.Mesh(
          colGeo,
          new THREE.MeshStandardMaterial({
            color: 0xff7a2a,
            emissive: 0xff6a1a,
            emissiveIntensity: 2.2,
            transparent: true,
            opacity: 0.85,
            roughness: 0.4,
            side: THREE.DoubleSide,
            depthWrite: false,
          }),
        );
        column.scale.y = 0.02;
        g.add(column);
        g.position.set(x, 0, Z(zc));
        shadowed(g);
        group.add(g);
        geysers.push({ x, z: Z(zc), y: 0, r: 1.5, period: 2.6, phase: ph, erupt: 0.9, tele: 0.8, mesh: g, column, ventGlow, audited: false });
      }
      const rockSpots: [number, number][] = [
        [-6.5, -7.5],
        [6.5, -13],
        [-6.8, -22.5],
        [6.8, -28],
      ];
      for (const [x, zc] of rockSpots) {
        const rock = makeRock(0x2b2b33, 0.9);
        rock.position.set(x, 0.3, Z(zc));
        group.add(rock);
      }
      addSurf(makePlatform({ x: 0, z: -34, w: 15, d: 6, top: 0, color: 0x3f3f4a, side: 0x23232b, stilts: true, chevrons: true, tag: "gey-out", lamps: true }));
      addCheckpoint(0, 0, -0.5, "Lava Geysers", -7.6);
      addCheckpoint(0, 0, -35, "Lava Geysers", 7.6);
    },

    /* ---------------- Bumper field (frost snow / forge pinball) ---------------- */
    bumpers: () => {
      const frosty = style === "frost";
      const top = frosty ? 0xe8f5fc : 0x4a4a55;
      const side = frosty ? 0x8fc3dd : 0x23232b;
      addSurf(makePlatform({ x: 0, z: -2.5, w: 15, d: 5, top: 0, color: top, side, stilts: true, chevrons: true, tag: "bump-in" }));
      addSign(frosty ? "SNOW BUMPERS" : "FORGE BUMPERS", -9.8, -2, 0, frosty ? "#4aa3d8" : "#ff7a2a");
      const field = makePlatform({ x: 0, z: -17, w: 16, d: 24, top: 0, color: top, side, stilts: true, chevrons: true, tag: "bumpers", lamps: !frosty });
      if (frosty) field.friction = 0.5;
      addSurf(field);
      const railMat = frosty ? toyMat(0xf2f9ff, { rough: 0.8 }) : toyMat(0x55555f, { rough: 0.5, metal: 0.6 });
      for (const sx of [-1, 1]) addWall(sx * 8.2, -17, 0.7, 24, 1.2, "rail", railMat);
      const posts: [number, number][] = frosty
        ? [
            [-3, -10],
            [3, -14],
            [0, -18],
            [-3, -22],
            [3, -26],
          ]
        : [
            [-4.5, -9],
            [0, -9],
            [4.5, -9],
            [-2.2, -15],
            [2.2, -15],
            [-4.5, -21],
            [0, -21],
            [4.5, -21],
            [0, -26],
          ];
      for (const [x, zc] of posts) {
        const g = new THREE.Group();
        const base = new THREE.Mesh(
          new THREE.CylinderGeometry(1.05, 1.2, 0.35, 18),
          frosty ? toyMat(0xf2f9ff, { rough: 0.8 }) : toyMat(0x2b2b33, { rough: 0.55, metal: 0.5 }),
        );
        base.position.y = 0.17;
        g.add(base);
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.55, 0.7, 1.5, 16),
          frosty ? toyMat(0xcfe9f7, { rough: 0.25, clearcoat: 1 }) : toyMat(0x8a8f9a, { rough: 0.4, metal: 0.7 }),
        );
        post.position.y = 1.0;
        g.add(post);
        const capMat = new THREE.MeshStandardMaterial({
          color: frosty ? 0x9fe8ff : 0xffb37a,
          emissive: frosty ? 0x54c8f2 : 0xff7a2a,
          emissiveIntensity: 1.4,
          roughness: 0.3,
        });
        const cap = new THREE.Mesh(sphereGeo(0.85, 18, 12), capMat);
        cap.position.y = 1.95;
        g.add(cap);
        g.position.set(x, 0, Z(zc));
        shadowed(g);
        group.add(g);
        bumpers.push({ x, z: Z(zc), y: 0, r: 0.95, mesh: g, capMat, flash: 0 });
      }
      if (frosty) {
        const men: [number, number][] = [
          [-6.6, -7.5],
          [6.6, -27],
        ];
        for (const [x, zc] of men) {
          const man = makeSnowman();
          man.position.set(x, 0, Z(zc));
          group.add(man);
        }
      }
      addSurf(makePlatform({ x: 0, z: -32, w: 15, d: 6, top: 0, color: top, side, stilts: true, chevrons: true, tag: "bump-out", lamps: !frosty }));
      addCheckpoint(0, 0, -0.5, frosty ? "Snow Bumpers" : "Forge Bumpers", 7.6);
      addCheckpoint(0, 0, -33, frosty ? "Snow Bumpers" : "Forge Bumpers", -7.6);
    },

    /* ---------------- Fire spinners (narrow bridge, fast bars) ---------------- */
    firebars: () => {
      addSurf(makePlatform({ x: 0, z: -2.5, w: 12, d: 5, top: 0, color: 0x4a4a55, side: 0x23232b, stilts: true, chevrons: true, tag: "fire-in", lamps: true }));
      addSign("FIRE SPINNERS", -8.6, -2, 0, "#e83a1a");
      addSurf(makePlatform({ x: 0, z: -16, w: 7.5, d: 26, top: 0, color: 0x3f3f4a, side: 0x23232b, stilts: true, chevrons: true, tag: "firebridge", lamps: true }));
      const flameMat = new THREE.MeshStandardMaterial({ color: 0xff7a2a, emissive: 0xff5500, emissiveIntensity: 2.0, roughness: 0.4 });
      for (const [zc, speed] of [
        [-10, 2.6],
        [-22, -2.9],
      ] as [number, number][]) {
        const g = new THREE.Group();
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.5, 16), toyMat(0x2b2b33, { rough: 0.4, metal: 0.7 }));
        post.position.y = 0.75;
        g.add(post);
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.5, 16), flameMat);
        hub.position.y = 1.35;
        g.add(hub);
        const arm = new THREE.Group();
        arm.position.y = 0.62;
        const bar = new THREE.Mesh(roundedBoxGeo(11, 0.62, 0.72, 0.3), flameMat);
        arm.add(bar);
        for (const fx of [-3.5, 0, 3.5]) {
          const flame = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.1, 10), flameMat);
          flame.position.set(fx, 0.75, 0);
          arm.add(flame);
        }
        for (const sx of [-1, 1]) {
          const cap = new THREE.Mesh(sphereGeo(0.42, 14, 10), flameMat);
          cap.position.set(sx * 5.5, 0, 0);
          arm.add(cap);
        }
        g.add(arm);
        g.position.set(0, 0, Z(zc));
        shadowed(g);
        group.add(g);
        g.userData.arm = arm;
        bars.push({ x: 0, z: Z(zc), y: 0.62, len: 11, thick: 0.72, angle: Math.random() * TAU, speed: speed * mods.sweepSpeed, mesh: g, fire: true });
      }
      addSurf(makePlatform({ x: 0, z: -32, w: 12, d: 6, top: 0, color: 0x4a4a55, side: 0x23232b, stilts: true, chevrons: true, tag: "fire-out", lamps: true }));
      addCheckpoint(0, 0, -0.5, "Fire Spinners", -6.6);
      addCheckpoint(0, 0, -33, "Fire Spinners", 6.6);
    },
  };

  /* ---------------- assemble the level ---------------- */
  let cursor = 1; // exit edge of the start pad
  for (const type of level.sections) {
    const lay = LAYOUT[type];
    oz = cursor + 0.8 - lay.e;
    builders[type]();
    sections.push({
      type,
      label: SECTION_LABELS[type],
      oz,
      zIn: lay.e + oz,
      zOut: lay.x + oz,
      aiEnd: lay.aiEnd + oz,
    });
    cursor = lay.x + oz;
  }

  checkpoints.sort((a, b) => b.z - a.z);
  checkpoints.forEach((c, i) => (c.index = i + 1));

  const startPositions = [
    { x: -1.3, y: 0, z: 6.2, yaw: Math.PI },
    { x: 1.3, y: 0, z: 6.2, yaw: Math.PI },
    { x: -3.9, y: 0, z: 6.2, yaw: Math.PI },
    { x: 3.9, y: 0, z: 6.2, yaw: Math.PI },
    { x: -1.3, y: 0, z: 8.6, yaw: Math.PI },
    { x: 1.3, y: 0, z: 8.6, yaw: Math.PI },
    { x: -3.9, y: 0, z: 8.6, yaw: Math.PI },
    { x: 3.9, y: 0, z: 8.6, yaw: Math.PI },
  ];

  return {
    level,
    mods,
    group,
    surfaces,
    walls,
    bars,
    hammers,
    tiles,
    checkpoints,
    sections,
    startPositions,
    startZ: 7,
    finishZ,
    finishY,
    movers,
    pads,
    belts,
    seesaws,
    sinks,
    winds,
    geysers,
    bumpers,
    overheads,
    rl,
    ramp,
    snow,
    climb,
    tileOz,
    tileStartZ,
    tileSpacing,
    safePath,
    tileRows,
    tileCols,
  };
}

/* ------------------------------------------------------------------ */
/*  Surface maths                                                      */
/* ------------------------------------------------------------------ */

export function surfaceTop(s: Surface, z: number): number {
  if (s.kind === "ramp") {
    const t = clamp((z - (s.z0 ?? 0)) / ((s.z1 ?? 1) - (s.z0 ?? 0)), 0, 1);
    return lerp(s.y0 ?? 0, s.y1 ?? 0, t);
  }
  if (s.kind === "seesaw") {
    return s.y - Math.tan(s.tilt ?? 0) * (z - (s.pivotZ ?? s.z));
  }
  return s.y;
}

export function surfaceContains(s: Surface, x: number, z: number, pad = 0): boolean {
  return Math.abs(x - s.x) <= s.w / 2 + pad && Math.abs(z - s.z) <= s.d / 2 + pad;
}

/** Returns true if a racer standing at (x,y,z) overlaps the padded hammer head. */
export function hammerHeadPos(h: Hammer) {
  return { x: h.x + Math.sin(h.angle) * h.armLen, y: h.pivotY - Math.cos(h.angle) * h.armLen };
}

export function hammerHits(h: Hammer, x: number, y: number, z: number, radius: number, height: number): boolean {
  // The head is a cylinder lying along z with flat ends: flat-ended in z, circular in the x/y plane.
  if (Math.abs(z - h.z) > h.headHalfLen + radius) return false;
  const hp = hammerHeadPos(h);
  const segLo = y + radius;
  const segHi = y + height - radius;
  const cy = clamp(hp.y, segLo, Math.max(segLo, segHi));
  const dx = hp.x - x;
  const dy = hp.y - cy;
  return dx * dx + dy * dy < (h.headR + radius) * (h.headR + radius);
}

/* ------------------------------------------------------------------ */
/*  Dynamic course animation (called from the fixed-step simulation)   */
/* ------------------------------------------------------------------ */

export function updateCourse(course: Course, dt: number, time: number) {
  for (const b of course.bars) {
    b.angle += b.speed * dt;
    const arm = b.mesh.userData.arm as THREE.Group;
    if (arm) arm.rotation.y = b.angle;
  }
  for (const h of course.hammers) {
    h.angle = Math.sin(time * h.speed + h.phase) * h.amp;
    const swing = h.group.userData.swing as THREE.Group;
    if (swing) swing.rotation.z = h.angle;
  }
  const c = course.climb;
  if (c) {
    const t = time;
    c.slider1.x = (c.slider1.baseX ?? 0) + Math.sin(t * 1.35) * 1.7;
    c.lift.y = (c.lift.baseY ?? 0.9) + ((Math.sin(t * 0.85 - Math.PI / 2) + 1) / 2) * 3.5;
    const open = (Math.sin(t * 1.05) + 1) / 2;
    const pairX = 1.7 + open * 2.1;
    c.pairL.x = -pairX;
    c.pairR.x = pairX;
    c.slider2.z = (c.slider2.baseZ ?? 0) + Math.sin(t * 1.2) * 1.8;
    for (const s of course.movers) {
      if (s.mesh) s.mesh.position.set(s.x, s.y, s.z);
    }
  }
  for (const w of course.walls) {
    if ((w.kind === "slider" || w.kind === "pillar") && w.baseX !== undefined) {
      w.x = w.baseX + Math.sin(time * (w.speed ?? 1) + (w.phase ?? 0)) * (w.amp ?? 0);
      if (w.mesh) w.mesh.position.x = w.x;
    }
  }
  for (const w of course.walls) {
    if (w.kind !== "piston" || w.baseX === undefined) continue;
    const e = pistonExtension(w, time);
    w.x = w.baseX + (w.dir ?? 1) * e * (w.amp ?? 0);
    if (w.mesh) w.mesh.position.x = w.x;
  }
  for (const wz of course.winds) {
    const gust = gustStrength(wz, time);
    if (wz.streakMat) wz.streakMat.opacity = 0.1 + (gust / Math.max(0.01, wz.strength)) * 0.3;
    const grp = wz.streaks;
    if (grp) {
      for (const child of grp.children) {
        child.position.x += wz.dir * (3 + gust * 1.7) * ((child.userData.v as number) ?? 1) * dt;
        if (child.position.x > 4.5) child.position.x = -4.5;
        else if (child.position.x < -4.5) child.position.x = 4.5;
      }
    }
  }
  for (const g of course.geysers) {
    const st = geyserState(g, time);
    const col = g.column;
    if (st === "erupt") {
      col.scale.set(1, 1 + Math.sin(time * 31 + g.phase * 7) * 0.08, 1);
      g.ventGlow.emissiveIntensity = 4;
    } else if (st === "tele") {
      const t = (((time + g.phase) % g.period) + g.period) % g.period;
      const k = 1 - (g.period - t) / g.tele;
      col.scale.set(0.7, 0.06 + k * 0.2, 0.7);
      g.mesh.position.x = g.x + Math.sin(time * 47) * 0.05 * k;
      g.ventGlow.emissiveIntensity = 1.5 + k * 2 + Math.sin(time * 25) * 0.5;
    } else {
      col.scale.set(1, 0.02, 1);
      g.mesh.position.x = g.x;
      g.ventGlow.emissiveIntensity = 0.8;
      g.audited = false;
    }
  }
  for (const b of course.bumpers) {
    b.flash = Math.max(0, b.flash - dt * 3);
    b.capMat.emissiveIntensity = 1.3 + b.flash * 4 + Math.sin(time * 3 + b.x) * 0.2;
  }
  for (const b of course.belts) {
    if (b.beltTex) b.beltTex.offset.y -= ((b.belt ?? 0) * dt) / 5.2 / 1.0;
  }
  for (const p of course.pads) {
    p.squish = Math.max(0, (p.squish ?? 0) - dt * 3.2);
    const g = p.mesh as THREE.Group | undefined;
    if (g) {
      const k = p.squish ?? 0;
      const spring = g.userData.spring as THREE.Group;
      const plate = g.userData.plate as THREE.Group;
      spring.scale.y = 1 - k * 0.55;
      plate.position.y = -0.1 - k * 0.7;
    }
  }
  for (const tile of course.tiles) {
    if (tile.revealed && tile.drop < 1) {
      tile.drop = Math.min(1, tile.drop + dt * 1.8);
      tile.mesh.position.y = -tile.drop * tile.drop * 14;
      tile.mesh.rotation.z = tile.drop * 0.5;
      tile.mesh.rotation.x = tile.drop * 0.35;
      if (tile.drop >= 1) tile.active = false;
    } else if (tile.timer > 0) {
      tile.timer -= dt;
      tile.mesh.position.x = tile.x + Math.sin(tile.timer * 55) * 0.07;
      tile.mesh.rotation.z = Math.sin(tile.timer * 40) * 0.05;
      if (tile.timer <= 0) {
        tile.revealed = true;
        tile.mesh.position.x = tile.x;
      }
    }
  }
}

/** Piston extension 0..1: fast punch out, hold, slow retract. */
export function pistonExtension(w: Wall, time: number) {
  const period = w.period ?? 2.4;
  const ph = ((((time + (w.phase ?? 0)) % period) + period) % period) / period;
  if (ph < 0.16) {
    const t = ph / 0.16;
    return 1 - (1 - t) * (1 - t);
  }
  if (ph < 0.45) return 1;
  const t = (ph - 0.45) / 0.55;
  return 1 - t * t * (3 - 2 * t);
}

export function geyserState(g: Geyser, time: number): "idle" | "tele" | "erupt" {
  const t = (((time + g.phase) % g.period) + g.period) % g.period;
  if (t < g.erupt) return "erupt";
  if (t > g.period - g.tele) return "tele";
  return "idle";
}

/** Seconds until a geyser starts erupting (0 while erupting). */
export function geyserTimeToErupt(g: Geyser, time: number) {
  const t = (((time + g.phase) % g.period) + g.period) % g.period;
  if (t < g.erupt) return 0;
  return g.period - t;
}

export function gustStrength(wz: WindZone, time: number) {
  return wz.strength * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin((time * TAU) / wz.period + wz.phase)));
}

/** Sinking platforms: sag while occupied, drop away, then respawn. */
export function updateSinkers(
  course: Course,
  racers: { grounded: boolean; ground: Surface | null }[],
  dt: number,
  time: number,
) {
  for (const s of course.sinks) {
    const sk = s.sink!;
    const m = s.mesh!;
    if (s.active) {
      const occupied = racers.some((r) => r.grounded && r.ground === s);
      sk.timer = occupied ? sk.timer + dt : Math.max(0, sk.timer - dt * 1.6);
      const k = clamp(sk.timer / sk.delay, 0, 1);
      s.y = sk.baseY - k * k * 1.4;
      m.position.y = s.y - sk.baseY;
      m.position.x = k > 0.4 ? s.x + Math.sin(time * 42 + s.z) * 0.06 * k : s.x;
      if (sk.timer >= sk.delay + 0.6) {
        s.active = false;
        m.visible = false;
        sk.respawn = sk.gone;
      }
    } else {
      sk.respawn -= dt;
      if (sk.respawn <= 0) {
        s.active = true;
        sk.timer = 0;
        s.y = sk.baseY;
        m.visible = true;
        m.position.set(s.x, 0, s.z);
      }
    }
  }
}

/** Applies seesaw torque from the racers standing on it. */
export function updateSeesaws(course: Course, weights: { x: number; z: number; on: Surface | null }[], dt: number) {
  for (const s of course.seesaws) {
    let torque = 0;
    for (const w of weights) {
      if (w.on === s) torque += (w.z - (s.pivotZ ?? s.z)) * 1.0;
    }
    const target = clamp(torque * 0.004, -s.maxTilt!, s.maxTilt!);
    s.tilt = lerp(s.tilt ?? 0, target, 1 - Math.exp(-3.2 * dt));
    if (s.mesh) s.mesh.rotation.x = s.tilt;
  }
}
