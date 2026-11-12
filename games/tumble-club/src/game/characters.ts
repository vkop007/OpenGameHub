import * as THREE from "three";
import { CharacterDef, clamp, damp, sphereGeo, toyMat, TAU } from "./core";

export interface BeanAnimState {
  state: string;
  speed: number;
  vy: number;
  grounded: boolean;
  tumbleTimer: number;
  diveTimer: number;
  animPhase: number;
  squash: number;
  cheerTime: number;
  finished: boolean;
  place: number;
}

export interface BeanVisual {
  root: THREE.Group;
  shadow: THREE.Mesh;
  ring?: THREE.Mesh;
  update: (dt: number, s: BeanAnimState, time: number) => void;
  dispose: () => void;
}

const capsule = (r: number, len: number) => new THREE.CapsuleGeometry(r, len, 4, 10);

function makeShadowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  g.addColorStop(0, "rgba(10,60,70,0.42)");
  g.addColorStop(0.65, "rgba(10,60,70,0.18)");
  g.addColorStop(1, "rgba(10,60,70,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
let shadowTex: THREE.Texture | null = null;

function addEyes(parent: THREE.Group, ink: THREE.Material) {
  const white = toyMat(0xfffdf6, { rough: 0.12, clearcoat: 1, clearcoatRough: 0.03 });
  const eyes: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const g = new THREE.Group();
    g.position.set(sx * 0.19, 1.13, 0.4);
    const w = new THREE.Mesh(sphereGeo(1, 14, 12), white);
    w.scale.set(0.145, 0.175, 0.1);
    g.add(w);
    const pupil = new THREE.Mesh(sphereGeo(1, 10, 8), ink);
    pupil.scale.set(0.072, 0.088, 0.05);
    pupil.position.set(sx * 0.012, -0.005, 0.075);
    g.add(pupil);
    const glint = new THREE.Mesh(sphereGeo(1, 8, 6), toyMat(0xffffff, { rough: 0.1, emissive: 0xffffff, emissiveIntensity: 0.6 }));
    glint.scale.setScalar(0.026);
    glint.position.set(sx * 0.012 + 0.028, 0.045, 0.115);
    g.add(glint);
    parent.add(g);
    eyes.push(g);
  }
  return eyes;
}

function addHat(kind: CharacterDef["hat"], color: number, accent: number) {
  const g = new THREE.Group();
  const main = toyMat(color, { rough: 0.38, clearcoat: 0.5, clearcoatRough: 0.2, sheen: 0.1 });
  const acc = toyMat(accent, { rough: 0.32, clearcoat: 0.7, clearcoatRough: 0.15 });
  const spinners: THREE.Object3D[] = [];
  if (kind === "crown") {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.3, 0.16, 14, 1, true), main);
    band.position.y = 0.06;
    g.add(band);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.24, 8), main);
      spike.position.set(Math.cos(a) * 0.25, 0.24, Math.sin(a) * 0.25);
      g.add(spike);
      const jewel = new THREE.Mesh(sphereGeo(0.045, 8, 6), acc);
      jewel.position.set(Math.cos(a) * 0.25, 0.37, Math.sin(a) * 0.25);
      g.add(jewel);
    }
  } else if (kind === "propeller") {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 12, 0, TAU, 0, Math.PI / 2), main);
    cap.position.y = 0.02;
    g.add(cap);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.04, 16), acc);
    brim.position.y = 0.02;
    g.add(brim);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.14, 8), acc);
    stem.position.y = 0.34;
    g.add(stem);
    const prop = new THREE.Group();
    prop.position.y = 0.42;
    for (const sx of [-1, 1]) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.035, 0.11), acc);
      blade.position.x = sx * 0.17;
      blade.rotation.z = sx * 0.12;
      prop.add(blade);
    }
    const hub = new THREE.Mesh(sphereGeo(0.055, 8, 6), main);
    prop.add(hub);
    g.add(prop);
    spinners.push(prop);
  } else if (kind === "cone") {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.52, 16), main);
    cone.position.y = 0.26;
    g.add(cone);
    const pom = new THREE.Mesh(sphereGeo(0.09, 10, 8), acc);
    pom.position.y = 0.55;
    g.add(pom);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.265, 0.265, 0.06, 16), acc);
    band.position.y = 0.06;
    g.add(band);
  } else {
    for (const sx of [-1, 1]) {
      const loop = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.28, 10), main);
      loop.position.set(sx * 0.16, 0.06, 0);
      loop.rotation.z = sx * -1.15;
      loop.scale.set(1, 1, 0.55);
      g.add(loop);
    }
    const knot = new THREE.Mesh(sphereGeo(0.085, 10, 8), acc);
    knot.position.y = 0.06;
    g.add(knot);
  }
  return { group: g, spinners };
}

export function createBean(def: CharacterDef, isPlayer: boolean): BeanVisual {
  const root = new THREE.Group();
  const tilt = new THREE.Group();
  const squash = new THREE.Group();
  root.add(tilt);
  tilt.add(squash);

  const bodyMat = toyMat(def.color, { rough: 0.42, clearcoat: 0.35, clearcoatRough: 0.25, sheen: 0.15 });
  const accentMat = toyMat(def.accent, { rough: 0.4, clearcoat: 0.5, clearcoatRough: 0.2, sheen: 0.4 });
  const inkMat = toyMat(0x173b46, { rough: 0.2, clearcoat: 1, clearcoatRough: 0.05 });

  const body = new THREE.Mesh(sphereGeo(1, 32, 24), bodyMat);
  body.scale.set(0.58, 0.73, 0.53);
  body.position.y = 0.87;
  body.castShadow = true;
  squash.add(body);

  const belly = new THREE.Mesh(sphereGeo(1, 18, 14), toyMat(0xffffff, { rough: 0.5 }));
  belly.scale.set(0.36, 0.4, 0.2);
  belly.position.set(0, 0.74, 0.36);
  (belly.material as THREE.MeshStandardMaterial).transparent = true;
  (belly.material as THREE.MeshStandardMaterial).opacity = 0.22;
  squash.add(belly);

  const eyes = addEyes(squash, inkMat);

  // Brows give each bean a little personality.
  for (const sx of [-1, 1]) {
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.04), inkMat);
    brow.position.set(sx * 0.19, 1.32, 0.42);
    brow.rotation.z = sx * -0.12;
    squash.add(brow);
  }

  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.024, 6, 14, Math.PI), inkMat);
  mouth.position.set(0, 0.99, 0.505);
  mouth.rotation.z = Math.PI;
  squash.add(mouth);

  for (const sx of [-1, 1]) {
    const blush = new THREE.Mesh(sphereGeo(1, 10, 8), toyMat(0xff8fa3, { rough: 0.6 }));
    blush.scale.set(0.085, 0.05, 0.03);
    blush.position.set(sx * 0.33, 1.0, 0.4);
    (blush.material as THREE.MeshStandardMaterial).transparent = true;
    (blush.material as THREE.MeshStandardMaterial).opacity = 0.55;
    squash.add(blush);
  }

  const arms: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.5, 1.02, 0);
    const arm = new THREE.Mesh(capsule(0.095, 0.2), bodyMat);
    arm.position.y = -0.16;
    arm.castShadow = true;
    pivot.add(arm);
    const hand = new THREE.Mesh(sphereGeo(0.11, 10, 8), accentMat);
    hand.position.y = -0.32;
    pivot.add(hand);
    pivot.rotation.z = sx * 0.22;
    squash.add(pivot);
    arms.push(pivot);
  }

  const legs: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.2, 0.36, 0);
    const leg = new THREE.Mesh(capsule(0.115, 0.12), bodyMat);
    leg.position.y = -0.1;
    leg.castShadow = true;
    pivot.add(leg);
    const foot = new THREE.Mesh(sphereGeo(1, 10, 8), accentMat);
    foot.scale.set(0.14, 0.09, 0.19);
    foot.position.set(0, -0.22, 0.05);
    pivot.add(foot);
    squash.add(pivot);
    legs.push(pivot);
  }

  const hat = addHat(def.hat, def.hatColor, def.accent);
  hat.group.position.y = 1.52;
  squash.add(hat.group);

  // Ground shadow (kept in world space by the renderer).
  if (!shadowTex) shadowTex = makeShadowTexture();
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 1.7),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.renderOrder = 2;

  let ring: THREE.Mesh | undefined;
  if (isPlayer) {
    ring = new THREE.Mesh(
      new THREE.RingGeometry(0.62, 0.8, 28),
      new THREE.MeshBasicMaterial({ color: 0xfff6e6, transparent: true, opacity: 0.75, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.renderOrder = 3;
  }

  let blinkTimer = 1 + Math.random() * 3;
  let blink = 0;
  let cheerSeed = Math.random() * 10;

  const update = (dt: number, s: BeanAnimState, time: number) => {
    const speed = Math.abs(s.speed);
    const run = clamp(speed / 8, 0, 1.2);
    const phase = s.animPhase;

    // squash & stretch spring
    const targetSquash = s.squash;
    squash.scale.x = damp(squash.scale.x, 1 - targetSquash * 0.45, 18, dt);
    squash.scale.z = squash.scale.x;
    squash.scale.y = damp(squash.scale.y, 1 + targetSquash * 0.55, 18, dt);

    // reset pose
    tilt.rotation.set(0, 0, 0);
    tilt.position.set(0, 0, 0);
    squash.position.y = 0;
    let armLx = 0;
    let armRx = 0;
    let armLz = 0.22;
    let armRz = -0.22;
    let legLx = 0;
    let legRx = 0;

    if (s.state === "tumble") {
      const p = clamp(1 - s.tumbleTimer / 1.05, 0, 1);
      tilt.rotation.x = p * TAU * 1.15;
      tilt.rotation.z = Math.sin(p * Math.PI) * 0.5;
      tilt.position.y = Math.sin(p * Math.PI) * 0.55;
      armLz = 1.5;
      armRz = -1.5;
      armLx = -1.2;
      armRx = -1.2;
      legLx = 0.8;
      legRx = -0.8;
    } else if (s.state === "dive") {
      tilt.rotation.x = 1.15;
      tilt.position.y = 0.32;
      armLx = -2.5;
      armRx = -2.5;
      armLz = 0.5;
      armRz = -0.5;
      legLx = -0.5;
      legRx = -0.5;
    } else if (s.state === "zapped") {
      tilt.rotation.z = Math.sin(time * 40) * 0.25;
      armLz = 2.4;
      armRz = -2.4;
    } else if (s.state === "cheer") {
      const bounce = Math.abs(Math.sin(time * 6 + cheerSeed));
      squash.position.y = bounce * 0.28;
      armLz = 2.5 + Math.sin(time * 9 + cheerSeed) * 0.25;
      armRz = -2.5 - Math.sin(time * 9 + cheerSeed) * 0.25;
      legLx = Math.sin(time * 6) * 0.3;
      legRx = -Math.sin(time * 6) * 0.3;
      tilt.rotation.z = Math.sin(time * 3 + cheerSeed) * 0.08;
    } else if (!s.grounded && s.state !== "wait") {
      armLz = 2.2;
      armRz = -2.2;
      legLx = -0.45;
      legRx = 0.3;
      tilt.rotation.x = clamp(-s.vy * 0.02, -0.18, 0.22);
    } else if (run > 0.08) {
      const sw = Math.sin(phase) * 0.95 * run;
      legLx = sw;
      legRx = -sw;
      armLx = -sw * 0.85;
      armRx = sw * 0.85;
      armLz = 0.32;
      armRz = -0.32;
      squash.position.y = Math.abs(Math.sin(phase)) * 0.07 * run;
      tilt.rotation.x = 0.1 * run;
      tilt.rotation.z = Math.sin(phase) * 0.05 * run;
    } else {
      const breathe = Math.sin(time * 2.2 + cheerSeed) * 0.02;
      squash.scale.y += breathe;
      armLz = 0.28 + Math.sin(time * 2 + cheerSeed) * 0.05;
      armRz = -0.28 - Math.sin(time * 2 + cheerSeed) * 0.05;
    }

    const k = 1 - Math.exp(-16 * dt);
    arms[0].rotation.x += (armLx - arms[0].rotation.x) * k;
    arms[1].rotation.x += (armRx - arms[1].rotation.x) * k;
    arms[0].rotation.z += (armLz - arms[0].rotation.z) * k;
    arms[1].rotation.z += (armRz - arms[1].rotation.z) * k;
    legs[0].rotation.x += (legLx - legs[0].rotation.x) * k;
    legs[1].rotation.x += (legRx - legs[1].rotation.x) * k;

    // blink
    blinkTimer -= dt;
    if (blinkTimer <= 0) {
      blink = 0.13;
      blinkTimer = 1.6 + Math.random() * 3.4;
    }
    if (blink > 0) blink -= dt;
    const eyeScale = blink > 0 ? 0.12 : 1;
    for (const e of eyes) e.scale.y = damp(e.scale.y, eyeScale, 30, dt);

    // propeller spin
    for (const sp of hat.spinners) sp.rotation.y += dt * (6 + run * 14);

    // mouth: smile bigger when cheering
    mouth.scale.setScalar(s.state === "cheer" ? 1.25 : 1);
  };

  return {
    root,
    shadow,
    ring,
    update,
    dispose: () => {
      // geometries/materials are shared caches; only unique ones are disposed
      shadow.geometry.dispose();
      (shadow.material as THREE.Material).dispose();
      if (ring) {
        ring.geometry.dispose();
        (ring.material as THREE.Material).dispose();
      }
    },
  };
}
