import * as THREE from "three";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import {
  canvasTexture,
  clamp,
  HudState,
  lavaTexture,
  PALETTE,
  PlayerInput,
  sphereGeo,
  toyMat,
  waterNormalTexture,
  WATER_Y,
} from "./core";
import { makePine, updateCourse } from "./course";
import { createBean, BeanVisual } from "./characters";
import { RaceSim, Racer } from "./sim";
import { LEVELS, LevelDef, Theme } from "./levels";
import { sfx } from "./audio";

const FIXED = 1 / 60;

export interface GameCallbacks {
  onHud: (hud: HudState) => void;
}

/* ------------------------------------------------------------------ */
/*  Scenery helpers                                                    */
/* ------------------------------------------------------------------ */

function islandHeight(x: number, z: number, H: number, seed: number) {
  const r2 = x * x + z * z;
  const base = Math.max(0, 1 - r2);
  const n = Math.sin(x * 5.3 + seed) * Math.cos(z * 4.7 + seed * 1.7) * 0.09 + Math.sin(x * 11 + z * 9 + seed) * 0.03;
  return Math.pow(base, 1.35) * H + n * base * H - 0.6 * (1 - base);
}

function makePalm(height: number, rnd: () => number) {
  const g = new THREE.Group();
  const lean = (rnd() - 0.5) * 0.9;
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(lean * 0.25, height * 0.4, 0),
    new THREE.Vector3(lean * 0.7, height * 0.75, 0),
    new THREE.Vector3(lean * 1.1, height, 0),
  ]);
  const trunk = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.2, 8), toyMat(0x8a6240, { rough: 0.9, clearcoat: 0, bump: "grain" }));
  trunk.castShadow = true;
  g.add(trunk);
  const top = curve.getPoint(1);
  const leafGeo = new THREE.SphereGeometry(1, 10, 6);
  const leafMat = toyMat(0x3f9a55, { rough: 0.7, clearcoat: 0.1, sheen: 0.5 });
  for (let i = 0; i < 9; i++) {
    const pivot = new THREE.Group();
    pivot.position.copy(top);
    pivot.rotation.y = (i / 9) * Math.PI * 2 + rnd() * 0.3;
    pivot.rotation.x = -0.2 - rnd() * 0.5;
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.scale.set(0.34, 0.05, 1.7 + rnd() * 0.5);
    leaf.position.z = 1.4;
    leaf.castShadow = true;
    pivot.add(leaf);
    g.add(pivot);
  }
  const nut = new THREE.Mesh(sphereGeo(0.18, 8, 6), toyMat(0x5a3d22, { rough: 0.8 }));
  nut.position.copy(top).add(new THREE.Vector3(0.1, -0.2, 0.1));
  g.add(nut);
  return g;
}

function makeIsland(radius: number, H: number, seed: number) {
  const g = new THREE.Group();
  const seg = 44;
  const geo = new THREE.PlaneGeometry(2, 2, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const sand = new THREE.Color(0xf0dcaa);
  const wet = new THREE.Color(0xc9b27c);
  const grass = new THREE.Color(0x5fae62);
  const dark = new THREE.Color(0x3d8a55);
  const rock = new THREE.Color(0x9a9487);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = islandHeight(x, z, H, seed);
    pos.setY(i, h);
    if (h < -0.05) c.copy(wet);
    else if (h < 0.35) c.copy(sand);
    else if (h < H * 0.72) c.copy(grass).lerp(dark, (Math.sin(x * 9 + z * 7) * 0.5 + 0.5) * 0.6);
    else c.copy(rock).lerp(grass, 0.25);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  mesh.scale.set(radius, 1, radius * 0.82);
  mesh.position.y = WATER_Y + 0.5;
  mesh.receiveShadow = true;
  g.add(mesh);
  let s = seed * 9301 + 49297;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const palms = 3 + Math.floor(rnd() * 3);
  for (let i = 0; i < palms; i++) {
    const a = rnd() * Math.PI * 2;
    const rr = 0.18 + rnd() * 0.38;
    const px = Math.cos(a) * rr;
    const pz = Math.sin(a) * rr;
    const palm = makePalm(3.6 + rnd() * 2.2, rnd);
    palm.position.set(px * radius, WATER_Y + 0.5 + islandHeight(px, pz, H, seed) - 0.1, pz * radius * 0.82);
    palm.rotation.y = rnd() * 6;
    g.add(palm);
  }
  return g;
}

function cloudTexture() {
  return canvasTexture(256, 128, (ctx) => {
    ctx.clearRect(0, 0, 256, 128);
    let seed = 5;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 26; i++) {
      const x = 40 + rnd() * 176;
      const y = 60 + (rnd() - 0.5) * 28 - Math.abs(x - 128) * 0.12;
      const r = 20 + rnd() * 26;
      const g = ctx.createRadialGradient(x, y, 1, x, y, r);
      g.addColorStop(0, "rgba(255,255,255,0.55)");
      g.addColorStop(0.6, "rgba(255,255,255,0.22)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  });
}

function glowTexture(inner: string, outer: string) {
  return canvasTexture(128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
    g.addColorStop(0, inner);
    g.addColorStop(0.18, inner);
    g.addColorStop(0.22, outer);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  });
}

function makeIceberg(radius: number, seed: number) {
  const g = new THREE.Group();
  let s = seed * 9301 + 49297;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const bergMat = toyMat(0xd8ecf8, { rough: 0.3, clearcoat: 0.9, clearcoatRough: 0.15 });
  const snowMat = toyMat(0xf6fbff, { rough: 0.75, clearcoat: 0.05 });
  const main = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.35, radius, radius * 0.9, 7), bergMat);
  main.position.y = WATER_Y + radius * 0.28;
  main.rotation.y = rnd() * 6;
  main.castShadow = true;
  main.receiveShadow = true;
  g.add(main);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.36, radius * 0.42, radius * 0.14, 7), snowMat);
  cap.position.y = WATER_Y + radius * 0.72;
  cap.rotation.y = main.rotation.y;
  g.add(cap);
  for (let i = 0; i < 3; i++) {
    const chunk = new THREE.Mesh(new THREE.ConeGeometry(radius * (0.14 + rnd() * 0.12), radius * (0.5 + rnd() * 0.5), 6), bergMat);
    const a = rnd() * Math.PI * 2;
    chunk.position.set(Math.cos(a) * radius * 0.9, WATER_Y + radius * 0.2, Math.sin(a) * radius * 0.9);
    chunk.rotation.y = rnd() * 6;
    chunk.castShadow = true;
    g.add(chunk);
  }
  if (radius > 13) {
    const pines = 2 + Math.floor(rnd() * 3);
    for (let i = 0; i < pines; i++) {
      const pine = makePine(1.1 + rnd() * 0.9);
      const a = rnd() * Math.PI * 2;
      const rr = rnd() * radius * 0.22;
      pine.position.set(Math.cos(a) * rr, WATER_Y + radius * 0.76, Math.sin(a) * rr);
      pine.rotation.y = rnd() * 6;
      g.add(pine);
    }
  }
  return g;
}

function makeVolcano(radius: number, seed: number, smokeTex: THREE.Texture) {
  const g = new THREE.Group();
  let s = seed * 9301 + 49297;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const h = radius * (0.9 + rnd() * 0.5);
  const cone = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.32, radius, h, 12, 3),
    toyMat(0x2b2320, { rough: 0.95, clearcoat: 0, bump: "grain", bumpScale: 1.4 }),
  );
  cone.position.y = WATER_Y + h / 2 - 1;
  cone.castShadow = true;
  cone.receiveShadow = true;
  g.add(cone);
  const crater = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.3, radius * 0.2, 0.6, 12),
    new THREE.MeshStandardMaterial({ color: 0x2a0d05, emissive: 0xff5a1a, emissiveIntensity: 2.4, roughness: 0.6 }),
  );
  crater.position.y = WATER_Y + h - 1.1;
  g.add(crater);
  // lava streaks running down the cone
  const streakMat = new THREE.MeshStandardMaterial({ color: 0x2a0d05, emissive: 0xff6a1a, emissiveIntensity: 1.6, roughness: 0.7 });
  for (let i = 0; i < 4; i++) {
    const a = rnd() * Math.PI * 2;
    const streak = new THREE.Mesh(new THREE.BoxGeometry(0.7, h * 0.55, 0.3), streakMat);
    streak.position.set(Math.cos(a) * radius * 0.62, WATER_Y + h * 0.55 - 1, Math.sin(a) * radius * 0.62);
    streak.lookAt(streak.position.clone().multiplyScalar(2).setY(streak.position.y));
    streak.rotateX(0.35);
    g.add(streak);
  }
  const smoke = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: smokeTex, color: 0x5a4a44, transparent: true, opacity: 0.75, depthWrite: false }),
  );
  smoke.position.y = WATER_Y + h + 6;
  smoke.scale.set(radius * 1.6, radius * 1.1, 1);
  g.add(smoke);
  return g;
}

/* ------------------------------------------------------------------ */
/*  Game                                                               */
/* ------------------------------------------------------------------ */

export class Game {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  sim: RaceSim;
  beans: BeanVisual[] = [];
  mode: "title" | "playing" = "title";
  levelIndex = 0;
  private canvas: HTMLCanvasElement;
  private cb: GameCallbacks;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private titleTime = 0;
  private hudTimer = 0;
  private keys = new Set<string>();
  private input: PlayerInput = { x: 0, z: 0, jump: false, jumpPressed: false, dive: false, kick: false };
  private camPos = new THREE.Vector3(0, 9, 26);
  private camLook = new THREE.Vector3(0, 1.5, 0);
  private focusY = 0;
  private lookLift = 0;
  private sun: THREE.DirectionalLight;
  private fill: THREE.DirectionalLight;
  private hemi: THREE.HemisphereLight;
  private sky: Sky;
  private stars: THREE.Points;
  private moon: THREE.Sprite;
  private water: THREE.Mesh;
  private water2: THREE.Mesh;
  private waterMat: THREE.MeshPhysicalMaterial;
  private water2Mat: THREE.MeshPhysicalMaterial;
  private lavaTex: THREE.Texture | null = null;
  private scenery = new THREE.Group();
  private floaters: { m: THREE.Object3D; y: number; ph: number }[] = [];
  private cloudSprites: THREE.Sprite[] = [];
  private smokeTex: THREE.Texture;
  private particles: THREE.Points | null = null;
  private particlePos: Float32Array | null = null;
  private particleSpd: Float32Array | null = null;
  private forgeGlow: THREE.PointLight;
  private beanLight: THREE.PointLight;
  private pmrem: THREE.PMREMGenerator;
  private envCache = new Map<string, THREE.Texture>();
  private effectMeshes: THREE.Mesh[] = [];
  private disposed = false;
  private onKeyDown: (e: KeyboardEvent) => void;
  private onKeyUp: (e: KeyboardEvent) => void;
  private onResize: () => void;
  private snapCamera = true;
  private pixelRatio = 1;
  private perf = { ema: 16, frames: 0, adapted: 0 };

  constructor(canvas: HTMLCanvasElement, cb: GameCallbacks, levelIndex = 0) {
    this.canvas = canvas;
    this.cb = cb;
    this.levelIndex = levelIndex;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xc4e4ee, 90, 330);
    this.camera = new THREE.PerspectiveCamera(56, 1, 0.1, 700);
    this.camera.position.copy(this.camPos);
    this.pmrem = new THREE.PMREMGenerator(this.renderer);

    this.sky = new Sky();
    this.sky.scale.setScalar(400);
    this.sky.renderOrder = -10;
    this.scene.add(this.sky);

    // stars (night only)
    const starGeo = new THREE.BufferGeometry();
    const sp = new Float32Array(900 * 3);
    let seed = 99;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 900; i++) {
      const u = rnd() * Math.PI * 2;
      const v = Math.acos(0.04 + rnd() * 0.96);
      sp[i * 3] = Math.sin(v) * Math.cos(u) * 380;
      sp[i * 3 + 1] = Math.cos(v) * 380;
      sp[i * 3 + 2] = Math.sin(v) * Math.sin(u) * 380;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    this.stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0xdfe8ff, size: 1.8, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85, depthWrite: false }),
    );
    this.stars.renderOrder = -9;
    this.scene.add(this.stars);

    this.moon = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowTexture("rgba(255,252,240,1)", "rgba(190,210,255,0.35)"), fog: false, depthWrite: false, transparent: true }),
    );
    this.moon.scale.setScalar(60);
    this.moon.renderOrder = -8;
    this.scene.add(this.moon);

    this.hemi = new THREE.HemisphereLight(0xcfeaff, 0x3aa8a4, 0.9);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff1d6, 3.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 150;
    this.sun.shadow.camera.left = -34;
    this.sun.shadow.camera.right = 34;
    this.sun.shadow.camera.top = 34;
    this.sun.shadow.camera.bottom = -34;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.04;
    this.sun.shadow.radius = 3;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);
    this.fill = new THREE.DirectionalLight(0xcfe9ff, 0.35);
    this.fill.position.set(-6, 10, 24);
    this.scene.add(this.fill);

    // ocean: a deep base layer plus a translucent, counter-scrolling ripple layer
    const n1 = waterNormalTexture(1, 3).clone();
    const n2 = waterNormalTexture(4, 4).clone();
    n1.needsUpdate = n2.needsUpdate = true;
    n1.repeat.set(70, 70);
    n2.repeat.set(36, 36);
    this.waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x1fb3b6,
      roughness: 0.07,
      metalness: 0.0,
      normalMap: n1,
      normalScale: new THREE.Vector2(0.55, 0.55),
      envMapIntensity: 1.25,
    });
    this.water2Mat = new THREE.MeshPhysicalMaterial({
      color: 0x7fe6e6,
      roughness: 0.12,
      metalness: 0.0,
      normalMap: n2,
      normalScale: new THREE.Vector2(0.35, 0.35),
      transparent: true,
      opacity: 0.26,
      depthWrite: false,
      envMapIntensity: 1.0,
    });
    this.water = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), this.waterMat);
    this.water.rotation.x = -Math.PI / 2;
    this.water.receiveShadow = true;
    this.scene.add(this.water);
    this.water2 = new THREE.Mesh(this.water.geometry, this.water2Mat);
    this.water2.rotation.x = -Math.PI / 2;
    this.water2.renderOrder = 1;
    this.scene.add(this.water2);
    this.lavaTex = lavaTexture().clone();
    this.lavaTex.needsUpdate = true;
    this.lavaTex.repeat.set(24, 24);

    this.smokeTex = cloudTexture();
    this.forgeGlow = new THREE.PointLight(0xff6a2a, 0, 46, 1.8);
    this.scene.add(this.forgeGlow);
    // soft key light riding above the player so the beans stay readable in every world
    this.beanLight = new THREE.PointLight(0xfff2dc, 16, 11, 1.6);
    this.scene.add(this.beanLight);

    this.scene.add(this.scenery);
    this.buildClouds();

    this.sim = new RaceSim(LEVELS[levelIndex]);
    this.scene.add(this.sim.course.group);
    this.applyTheme(this.sim.level.theme);
    this.buildScenery();

    for (const r of this.sim.racers) {
      const b = createBean(r.def, r.isPlayer);
      this.beans.push(b);
      this.scene.add(b.root);
      this.scene.add(b.shadow);
      if (b.ring) this.scene.add(b.ring);
    }

    const ringGeo = new THREE.RingGeometry(0.55, 0.78, 32);
    for (let i = 0; i < 18; i++) {
      const m = new THREE.Mesh(
        ringGeo,
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
      );
      m.rotation.x = -Math.PI / 2;
      m.visible = false;
      m.renderOrder = 5;
      this.scene.add(m);
      this.effectMeshes.push(m);
    }

    this.onKeyDown = (e) => this.handleKey(e, true);
    this.onKeyUp = (e) => this.handleKey(e, false);
    this.onResize = () => this.resize();
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("resize", this.onResize);
    this.resize();
    this.last = performance.now();
    this.loop(this.last);
    this.pushHud();
  }

  /* ---------------------------------------------------------------- */
  /*  Themes, sky and environment                                      */
  /* ---------------------------------------------------------------- */

  private sunVector(elevDeg: number, azDeg: number) {
    const phi = THREE.MathUtils.degToRad(90 - elevDeg);
    const theta = THREE.MathUtils.degToRad(azDeg);
    return new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
  }

  private skyUniforms(sky: Sky, t: Theme, sunDir: THREE.Vector3) {
    const u = sky.material.uniforms;
    u["turbidity"].value = t.turbidity;
    u["rayleigh"].value = t.rayleigh;
    u["mieCoefficient"].value = t.mie;
    u["mieDirectionalG"].value = t.mieG;
    u["sunPosition"].value.copy(sunDir);
  }

  private applyTheme(t: Theme) {
    const skyDir = this.sunVector(t.sunElevation, t.sunAzimuth);
    this.skyUniforms(this.sky, t, skyDir);
    this.renderer.toneMappingExposure = t.exposure;

    // image based lighting generated from the same procedural sky
    let env = this.envCache.get(t.id);
    if (!env) {
      const envScene = new THREE.Scene();
      const es = new Sky();
      es.scale.setScalar(80);
      this.skyUniforms(es, t, skyDir);
      envScene.add(es);
      if (t.stars) {
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(3, 16, 12), new THREE.MeshBasicMaterial({ color: 0xdfe8ff }));
        lamp.position.copy(this.sunVector(t.lightElevation, t.sunAzimuth)).multiplyScalar(30);
        envScene.add(lamp);
      }
      env = this.pmrem.fromScene(envScene, 0.02, 0.1, 100).texture;
      this.envCache.set(t.id, env);
      es.geometry.dispose();
      (es.material as THREE.Material).dispose();
    }
    this.scene.environment = env;
    this.scene.environmentIntensity = t.envIntensity;

    const lightDir = this.sunVector(t.lightElevation, t.sunAzimuth);
    this.sun.userData.dir = lightDir;
    this.sun.color.setHex(t.sunColor);
    this.sun.intensity = t.sunIntensity;
    this.hemi.color.setHex(t.hemiSky);
    this.hemi.groundColor.setHex(t.hemiGround);
    this.hemi.intensity = t.hemiIntensity;
    this.fill.color.setHex(t.fillColor);
    this.fill.intensity = t.fillIntensity;

    (this.scene.fog as THREE.Fog).color.setHex(t.fogColor);
    (this.scene.fog as THREE.Fog).near = t.fogNear;
    (this.scene.fog as THREE.Fog).far = t.fogFar;
    const style = this.sim.level.style;
    if (style === "forge") {
      // lava sea: dark crust with glowing animated cracks
      this.waterMat.color.setHex(0x2a0d05);
      this.waterMat.emissive.setHex(0xff5a1a);
      this.waterMat.emissiveMap = this.lavaTex;
      this.waterMat.emissiveIntensity = 1.9;
      this.waterMat.roughness = 0.55;
      this.waterMat.normalScale.set(0.25, 0.25);
      this.water2.visible = false;
    } else {
      this.waterMat.color.setHex(t.waterColor);
      this.waterMat.emissive.setHex(0x000000);
      this.waterMat.emissiveMap = null;
      this.waterMat.emissiveIntensity = 0;
      this.waterMat.roughness = style === "frost" ? 0.22 : 0.07;
      this.waterMat.normalScale.set(style === "frost" ? 0.3 : 0.55, style === "frost" ? 0.3 : 0.55);
      this.water2.visible = true;
      this.water2Mat.color.setHex(t.waterColor).offsetHSL(0, -0.05, style === "frost" ? 0.28 : 0.18);
      this.water2Mat.opacity = style === "frost" ? 0.34 : 0.26;
    }
    this.waterMat.needsUpdate = true;
    this.stars.visible = t.stars;
    this.moon.visible = t.stars;
    if (t.stars) this.moon.userData.dir = this.sunVector(t.lightElevation + 6, t.sunAzimuth);
    (this.moon.material as THREE.SpriteMaterial).color.setHex(style === "forge" ? 0xff9a6a : 0xffffff);
    for (const s of this.cloudSprites) (s.material as THREE.SpriteMaterial).color.setHex(t.cloudTint);
    document.documentElement.style.setProperty("--vignette", String(t.vignette));
  }

  private buildClouds() {
    const tex = cloudTexture();
    const spots: [number, number, number, number][] = [
      [-70, 48, -40, 120],
      [60, 56, -110, 150],
      [-90, 44, -190, 130],
      [75, 60, -260, 160],
      [-40, 62, -330, 140],
      [95, 50, -60, 110],
      [-20, 70, -150, 170],
      [20, 66, 40, 140],
    ];
    for (const [x, y, z, s] of spots) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xffffff, transparent: true, depthWrite: false, fog: false, opacity: 0.9 }));
      sp.position.set(x, y, z);
      sp.scale.set(s, s * 0.5, 1);
      sp.renderOrder = -7;
      this.scene.add(sp);
      this.cloudSprites.push(sp);
    }
  }

  private buildScenery() {
    // rebuild scenery to suit the current world + course length
    while (this.scenery.children.length) {
      const c = this.scenery.children.pop()!;
      c.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh && (m.geometry as THREE.BufferGeometry).userData.own) m.geometry.dispose();
      });
    }
    this.floaters = [];
    const course = this.sim.course;
    const style = this.sim.level.style;
    const len = Math.abs(course.finishZ) + 20;
    // water follows the course
    const mid = -len * 0.45;
    this.water.position.set(0, WATER_Y, mid);
    this.water2.position.set(0, WATER_Y + 0.03, mid);

    let seed = 1337 + this.levelIndex * 77;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const count = Math.max(5, Math.round(len / 55));
    for (let i = 0; i < count; i++) {
      const side = i % 2 ? 1 : -1;
      const x = side * (62 + rnd() * 55);
      const z = 40 - (i / count) * (len + 80) - rnd() * 30;
      const obj =
        style === "frost"
          ? makeIceberg(11 + rnd() * 9, 1 + i * 3 + this.levelIndex)
          : style === "forge"
            ? makeVolcano(13 + rnd() * 10, 1 + i * 3 + this.levelIndex, this.smokeTex)
            : makeIsland(14 + rnd() * 14, 4 + rnd() * 3.4, 1 + i * 3 + this.levelIndex);
      obj.position.x += x;
      obj.position.z += z;
      obj.rotation.y = rnd() * 6;
      this.scenery.add(obj);
    }
    // floating markers bobbing beside the course
    if (style === "cove") {
      const buoyGeo = sphereGeo(0.55, 16, 12);
      const buoyMats = [toyMat(PALETTE.coral, { rough: 0.35, clearcoat: 0.8 }), toyMat(PALETTE.cream, { rough: 0.35, clearcoat: 0.8 })];
      const n = Math.round(len / 9);
      for (let i = 0; i < n; i++) {
        const side = i % 2 ? 1 : -1;
        const m = new THREE.Mesh(buoyGeo, buoyMats[i % 3 === 0 ? 0 : 1]);
        m.position.set(side * (17 + rnd() * 24), WATER_Y + 0.3, 10 - rnd() * (len + 20));
        m.scale.y = 0.85;
        m.castShadow = true;
        this.scenery.add(m);
        this.floaters.push({ m, y: m.position.y, ph: rnd() * 6 });
      }
    } else if (style === "frost") {
      const n = Math.round(len / 11);
      for (let i = 0; i < n; i++) {
        const side = i % 2 ? 1 : -1;
        const r = 1 + rnd() * 2.2;
        const chunk = new THREE.Mesh(
          new THREE.CylinderGeometry(r, r * 1.15, 0.7, 9),
          toyMat(0xf2f9ff, { rough: 0.5, clearcoat: 0.4 }),
        );
        chunk.position.set(side * (16 + rnd() * 26), WATER_Y + 0.15, 10 - rnd() * (len + 20));
        chunk.rotation.y = rnd() * 6;
        chunk.castShadow = true;
        this.scenery.add(chunk);
        this.floaters.push({ m: chunk, y: chunk.position.y, ph: rnd() * 6 });
      }
    } else {
      const emberMat = new THREE.MeshStandardMaterial({ color: 0x2a0d05, emissive: 0xff5a1a, emissiveIntensity: 2.0, roughness: 0.6 });
      const rockMat = toyMat(0x2b2b33, { rough: 0.9 });
      const n = Math.round(len / 11);
      for (let i = 0; i < n; i++) {
        const side = i % 2 ? 1 : -1;
        const g = new THREE.Group();
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7 + rnd() * 0.7, 0), rockMat);
        rock.scale.y = 0.6;
        g.add(rock);
        const ember = new THREE.Mesh(sphereGeo(0.42, 12, 8), emberMat);
        ember.position.y = 0.45;
        g.add(ember);
        g.position.set(side * (16 + rnd() * 26), WATER_Y + 0.25, 10 - rnd() * (len + 20));
        this.scenery.add(g);
        this.floaters.push({ m: g, y: g.position.y, ph: rnd() * 6 });
      }
      // basalt spires rising from the lava
      for (let i = 0; i < 6; i++) {
        const side = i % 2 ? 1 : -1;
        const h = 8 + rnd() * 14;
        const spire = new THREE.Mesh(new THREE.ConeGeometry(1.6 + rnd() * 1.4, h, 7), rockMat);
        spire.position.set(side * (30 + rnd() * 30), WATER_Y + h / 2 - 1, 10 - rnd() * (len + 20));
        spire.castShadow = true;
        this.scenery.add(spire);
      }
    }
    this.buildParticles(style);
  }

  private buildParticles(style: "cove" | "frost" | "forge") {
    if (this.particles) {
      this.scene.remove(this.particles);
      this.particles.geometry.dispose();
      (this.particles.material as THREE.Material).dispose();
      this.particles = null;
      this.particlePos = null;
      this.particleSpd = null;
    }
    if (style === "cove") return;
    const N = 550;
    const pos = new Float32Array(N * 3);
    const spd = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 90;
      pos[i * 3 + 1] = Math.random() * 45 - 5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 90;
      spd[i] = style === "frost" ? 2 + Math.random() * 3.5 : 1.5 + Math.random() * 3;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat =
      style === "frost"
        ? new THREE.PointsMaterial({ color: 0xffffff, size: 0.32, transparent: true, opacity: 0.9, depthWrite: false })
        : new THREE.PointsMaterial({
            color: 0xff8a3a,
            size: 0.3,
            transparent: true,
            opacity: 0.95,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          });
    this.particles = new THREE.Points(geo, mat);
    this.particles.frustumCulled = false;
    this.particles.renderOrder = 6;
    this.scene.add(this.particles);
    this.particlePos = pos;
    this.particleSpd = spd;
  }

  /** Swap to another level (rebuilds the course and re-lights the world). */
  setLevel(index: number) {
    const i = clamp(index, 0, LEVELS.length - 1);
    const old = this.sim.course.group;
    this.scene.remove(old);
    this.sim.balls.forEach((b) => this.scene.remove(b.mesh));
    this.levelIndex = i;
    this.sim = new RaceSim(LEVELS[i]);
    this.scene.add(this.sim.course.group);
    this.applyTheme(LEVELS[i].theme);
    this.buildScenery();
    this.mode = "title";
    this.snapCamera = true;
    this.pushHud();
  }

  get level(): LevelDef {
    return this.sim.level;
  }

  /* ---------------------------------------------------------------- */

  private handleKey(e: KeyboardEvent, down: boolean) {
    const code = e.code;
    const tracked = [
      "KeyW", "KeyA", "KeyS", "KeyD",
      "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
      "Space", "ShiftLeft", "ShiftRight", "KeyK", "Enter",
    ];
    if (!tracked.includes(code)) return;
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(code)) e.preventDefault();
    if (down) {
      if (e.repeat) return;
      this.keys.add(code);
      if (code === "Space") this.input.jumpPressed = true;
      if (code === "ShiftLeft" || code === "ShiftRight") this.input.dive = true;
      if (code === "KeyK") this.input.kick = true;
      sfx.unlock();
    } else {
      this.keys.delete(code);
    }
  }

  setVirtual(key: "up" | "down" | "left" | "right" | "jump" | "dive" | "kick", down: boolean) {
    const map: Record<string, string> = {
      up: "KeyW",
      down: "KeyS",
      left: "KeyA",
      right: "KeyD",
      jump: "Space",
      dive: "ShiftLeft",
      kick: "KeyK",
    };
    const code = map[key];
    if (down) {
      this.keys.add(code);
      if (key === "jump") this.input.jumpPressed = true;
      if (key === "dive") this.input.dive = true;
      if (key === "kick") this.input.kick = true;
      sfx.unlock();
    } else {
      this.keys.delete(code);
    }
  }

  private readInput() {
    const k = this.keys;
    let x = 0;
    let z = 0;
    if (k.has("KeyA") || k.has("ArrowLeft")) x -= 1;
    if (k.has("KeyD") || k.has("ArrowRight")) x += 1;
    if (k.has("KeyW") || k.has("ArrowUp")) z -= 1;
    if (k.has("KeyS") || k.has("ArrowDown")) z += 1;
    this.input.x = clamp(x, -1, 1);
    this.input.z = clamp(z, -1, 1);
    this.input.jump = k.has("Space");
    return this.input;
  }

  /* ---------------------------------------------------------------- */

  play() {
    sfx.unlock();
    sfx.countdown(3);
    this.sim.reset();
    this.mode = "playing";
    this.snapCamera = true;
    this.acc = 0;
    this.pushHud();
  }

  setMuted(m: boolean) {
    sfx.setMuted(m);
  }

  private resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }

  private pushHud() {
    if (this.mode === "title") {
      this.cb.onHud({
        phase: "title",
        countdown: 0,
        time: 0,
        place: 1,
        total: 8,
        splashes: 0,
        zaps: 0,
        banner: "",
        bannerTone: "none",
        progress: 0,
        section: "Start",
        finished: false,
        results: null,
        playerPlace: 1,
        playerTime: 0,
        checkpointFlash: 0,
        splashFlash: 0,
        zapFlash: 0,
        levelId: this.sim.level.id,
        levelName: this.sim.level.name,
        inRedLight: false,
      });
    } else {
      this.cb.onHud(this.sim.getHud());
    }
  }

  /* ---------------------------------------------------------------- */

  private adaptQuality(dtMs: number) {
    const p = this.perf;
    p.ema += (dtMs - p.ema) * 0.05;
    p.frames++;
    if (p.frames > 90 && p.frames % 60 === 0 && p.ema > 27 && this.pixelRatio > 0.7 && p.adapted < 3) {
      p.adapted++;
      this.pixelRatio = Math.max(0.7, this.pixelRatio - 0.25);
      this.renderer.setPixelRatio(this.pixelRatio);
      if (p.adapted >= 2 && this.sun.shadow.mapSize.x > 1024) {
        this.sun.shadow.mapSize.set(1024, 1024);
        this.sun.shadow.map?.dispose();
        this.sun.shadow.map = null;
      }
      this.resize();
      p.ema = 16;
    }
  }

  private loop = (now: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const rawDt = now - this.last;
    const dt = Math.min(rawDt / 1000, 0.1);
    this.last = now;
    this.titleTime += dt;
    this.adaptQuality(rawDt);
    const input = this.readInput();

    if (this.mode === "title") {
      this.sim.time += dt;
      updateCourse(this.sim.course, dt, this.sim.time);
      this.sim.racers.forEach((r, i) => {
        r.animPhase += dt * 1.6;
        r.state = "idle";
        r.yaw = Math.sin(i * 1.9) * 0.22;
      });
    } else {
      this.acc += dt;
      let steps = 0;
      while (this.acc >= FIXED && steps < 5) {
        this.sim.step(FIXED, input);
        input.jumpPressed = false;
        input.dive = false;
        input.kick = false;
        this.acc -= FIXED;
        steps++;
      }
      if (steps === 5) this.acc = 0;
    }

    this.hudTimer += dt;
    if (this.hudTimer > 0.1) {
      this.hudTimer = 0;
      this.pushHud();
    }

    this.updateVisuals(dt);
    this.updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
  };

  /* ---------------------------------------------------------------- */

  private updateVisuals(dt: number) {
    const t = this.sim.time + this.titleTime;
    for (let i = 0; i < this.sim.racers.length; i++) {
      const r = this.sim.racers[i];
      const b = this.beans[i];
      b.root.position.copy(r.pos);
      b.root.rotation.y = r.yaw;
      b.update(dt, this.sim.racerVisual(r), t);
      const groundY = r.groundY;
      const h = Math.max(0, r.pos.y - groundY);
      b.shadow.position.set(r.pos.x, groundY + 0.035, r.pos.z);
      const sc = clamp(1 - h * 0.09, 0.45, 1);
      b.shadow.scale.setScalar(sc);
      (b.shadow.material as THREE.MeshBasicMaterial).opacity = clamp(0.8 - h * 0.1, 0.2, 0.8);
      if (b.ring) {
        b.ring.position.set(r.pos.x, groundY + 0.05, r.pos.z);
        b.ring.scale.setScalar(sc);
      }
    }
    let idx = 0;
    for (const e of this.sim.effects) {
      if (idx >= this.effectMeshes.length) break;
      const m = this.effectMeshes[idx++];
      const p = e.t / e.life;
      m.visible = true;
      m.position.copy(e.pos);
      m.position.y += 0.06;
      m.scale.setScalar(0.6 + p * 3.2);
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - p) * 0.85;
      const color =
        e.kind === "splash" ? 0x9ff5ef : e.kind === "zap" ? 0xff5a4a : e.kind === "hit" ? 0xffd166 : e.kind === "kick" ? 0xffffff : e.kind === "bounce" ? 0xffe08a : 0x7ef0d0;
      mat.color.setHex(color);
    }
    for (; idx < this.effectMeshes.length; idx++) this.effectMeshes[idx].visible = false;

    // animated ocean: two normal layers drifting in different directions
    const n1 = this.waterMat.normalMap!;
    const n2 = this.water2Mat.normalMap!;
    n1.offset.set(t * 0.004, t * 0.007);
    n2.offset.set(-t * 0.006, t * 0.003);
    if (this.lavaTex) this.lavaTex.offset.set(t * 0.006, t * 0.004);

    // bobbing flotsam / ice chunks / embers
    for (const f of this.floaters) f.m.position.y = f.y + Math.sin(t * 1.1 + f.ph) * 0.13;
    this.updateParticles(dt, t);
    const style = this.sim.level.style;
    const fp = this.sim.player.pos;
    this.forgeGlow.position.set(fp.x, fp.y + 5, fp.z - 2);
    this.forgeGlow.intensity = style === "forge" ? 10 + Math.sin(t * 4) * 2.5 : 0;

    // key light follows the player so the shadow map stays crisp
    const p = this.sim.player.pos;
    const dir = this.sun.userData.dir as THREE.Vector3;
    this.sun.position.set(p.x + dir.x * 60, p.y + dir.y * 60, p.z + dir.z * 60);
    this.sun.target.position.set(p.x, p.y, p.z - 6);
    this.sun.target.updateMatrixWorld();
    this.beanLight.position.set(p.x, p.y + 3.4, p.z + 1.2);
    this.fill.position.set(p.x - 8, p.y + 10, p.z + 22);
    this.fill.target.position.set(p.x, p.y + 1, p.z);
    this.fill.target.updateMatrixWorld();

    // sky dome, stars and moon travel with the camera
    this.sky.position.copy(this.camera.position);
    this.stars.position.copy(this.camera.position);
    if (this.moon.visible) {
      const md = this.moon.userData.dir as THREE.Vector3;
      this.moon.position.copy(this.camera.position).addScaledVector(md, 330);
    }
  }

  /** Frost: drifting snowfall. Forge: embers rising off the lava. Both follow the player. */
  private updateParticles(dt: number, t: number) {
    const pos = this.particlePos;
    const spd = this.particleSpd;
    const pts = this.particles;
    if (!pos || !spd || !pts) return;
    const style = this.sim.level.style;
    const fall = style === "frost";
    const p = this.sim.player.pos;
    for (let i = 0; i < spd.length; i++) {
      const ix = i * 3;
      if (fall) {
        pos[ix + 1] -= spd[i] * dt;
        pos[ix] += Math.sin(t * 0.9 + i) * 0.4 * dt;
        if (pos[ix + 1] < -6) pos[ix + 1] = 34;
      } else {
        pos[ix + 1] += spd[i] * 0.45 * dt;
        pos[ix] += Math.sin(t * 1.3 + i) * 0.6 * dt;
        if (pos[ix + 1] > 26) pos[ix + 1] = -4;
      }
      if (pos[ix] - p.x > 45) pos[ix] -= 90;
      else if (pos[ix] - p.x < -45) pos[ix] += 90;
      if (pos[ix + 2] - p.z > 45) pos[ix + 2] -= 90;
      else if (pos[ix + 2] - p.z < -45) pos[ix + 2] += 90;
    }
    pts.geometry.attributes.position.needsUpdate = true;
  }

  private updateCamera(dt: number) {
    if (this.mode === "title") {
      const a = this.titleTime * 0.16 + 0.6;
      const target = new THREE.Vector3(0, 1.5, 4.5);
      const desired = new THREE.Vector3(Math.sin(a) * 15, 6.6 + Math.sin(this.titleTime * 0.3) * 0.6, 4.5 + Math.cos(a) * 15);
      this.camPos.lerp(desired, 1 - Math.exp(-2.2 * dt));
      this.camLook.lerp(target, 1 - Math.exp(-3 * dt));
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(this.camLook);
      this.focusY = 0;
      this.lookLift = 0;
      return;
    }
    const course = this.sim.course;
    const p = this.sim.player.pos;
    // vertical focus is smoothed so trampolines and lifts never whip the camera around
    this.focusY = this.snapCamera ? p.y : this.focusY + (p.y - this.focusY) * (1 - Math.exp(-(p.y > this.focusY ? 3.4 : 6) * dt));
    const ramp = course.ramp;
    const underChute = !!ramp && p.z < ramp.lowCamHi && p.z > ramp.lowCamLo;
    const climbing = !!course.climb && p.z < course.climb.oz - 176;
    const dist = underChute ? 8.2 : climbing ? 12.4 : 11.2;
    const height = underChute ? 3.9 : climbing ? 7.4 : 6.3;
    const desired = new THREE.Vector3(p.x * 0.62, this.focusY + height, p.z + dist);
    for (const w of course.walls) {
      if (Math.abs(desired.x - w.x) < w.w / 2 + 0.8 && Math.abs(desired.z - w.z) < w.d / 2 + 0.8) {
        desired.y = Math.max(desired.y, w.y1 + 1.6);
      }
    }
    // never clip through overhead structures: duck underneath them
    for (const o of course.overheads) {
      if (desired.x > o.x0 && desired.x < o.x1 && desired.z > o.z0 - 0.8 && desired.z < o.z1 + 0.8 && desired.y > o.y0 - 0.9 && desired.y < o.y1) {
        desired.y = o.above ? o.y1 + 0.7 : Math.max(o.y0 - 0.9, p.y + 1.9);
      }
    }
    desired.y = Math.max(desired.y, WATER_Y + 4.5);
    const k = this.snapCamera ? 1 : 1 - Math.exp(-5.2 * dt);
    this.camPos.lerp(desired, k);
    // while the watcher is judging, tilt up (slowly) so its face and glowing eyes stay in frame
    const rl = course.rl;
    const watching = !!rl && p.z < rl.zoneHi + 6 && p.z > rl.zoneLo - 4;
    this.lookLift += ((watching ? 6.5 : 0) - this.lookLift) * (1 - Math.exp(-1.6 * dt));
    const lookTarget = new THREE.Vector3(p.x * 0.8, this.focusY + 1.35 + this.lookLift, p.z - (underChute ? 2.5 : 4.2) - this.lookLift * 1.6);
    this.camLook.lerp(lookTarget, this.snapCamera ? 1 : 1 - Math.exp(-7 * dt));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
    this.snapCamera = false;
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("resize", this.onResize);
    this.beans.forEach((b) => b.dispose());
    if (this.particles) {
      this.particles.geometry.dispose();
      (this.particles.material as THREE.Material).dispose();
    }
    this.pmrem.dispose();
    this.renderer.dispose();
  }
}

export type { Racer };
