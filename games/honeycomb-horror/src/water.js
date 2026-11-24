/**
 * Continuous Deep Water Boundary, Two Land Causeways (Entry & Exit),
 * Outer Forest Shoreline, and Swimming Crocodile Predators.
 *
 * - Surrounds 100% of the honeycomb maze (including inner voids) with deep dark water.
 * - Connects ONLY two solid land access points:
 *     1. Entry Causeway (East) — directly in front of the Entry Door (room 11,2, dir 1)
 *     2. Exit Pier & Shore (West) — directly outside the Exit Door (room 0,2, dir 5)
 * - Every other exterior door opens straight over deep dangerous water (no invisible walls).
 */
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

export class WaterBoundarySystem {
  constructor(scene, entryFrame, exitFrame, materials, findRoomFn, crocGltf = null) {
    this.crocGltf = crocGltf;
    this.scene = scene;
    this.entryFrame = entryFrame;
    this.exitFrame = exitFrame;
    this.findRoomFn = findRoomFn;
    this.group = new THREE.Group();
    this.group.name = 'WaterBoundarySystem';

    // Continuous deep water basin surrounding the entire honeycomb maze
    // Shifted slightly west so the western side forms a wide dark lake near the Exit Door
    this.basinCenter = new THREE.Vector2(-12.0, 4.0);
    this.basinRadiusX = 86.0; // East shore at ~+74, West lake shore at ~-98
    this.basinRadiusZ = 66.0; // North shore at ~-62, South shore at ~+70
    this.waterY = -0.22;

    // Causeway / pier dimensions (exact match between visual mesh & walkability physics)
    this.entryCausewayLen = 36.0;
    this.entryHalfWidth = 2.35;
    this.exitPierLen = 15.0;
    this.exitHalfWidth = 2.35;

    this.crocodiles = [];
    this.time = 0;

    this._buildContinuousWater();
    this._buildOuterForestLandmass(materials.forestGround);
    this._buildEntryCauseway(materials.causeway, materials.curb);
    this._buildExitPier(materials.curb);
    this._spawnCrocodiles();

    this.scene.add(this.group);
  }

  /**
   * Normalized distance from the water basin center.
   * < 1.0 = inside the continuous water moat/lake basin.
   * >= 1.0 = on the raised outer forest landmass.
   */
  getOuterShoreFactor(x, z) {
    const dx = (x - this.basinCenter.x) / this.basinRadiusX;
    const dz = (z - this.basinCenter.z) / this.basinRadiusZ;
    const ang = Math.atan2(dz, dx);
    const organic = 1.0 + 0.055 * Math.sin(ang * 3.0 + 0.5) + 0.035 * Math.cos(ang * 5.0 - 0.7);
    return Math.hypot(dx, dz) / organic;
  }

  /**
   * Projects (x, z) into the local frame of a door causeway: { along, perp }.
   */
  _projectOnFrame(x, z, frame) {
    const rx = x - frame.center.x;
    const rz = z - frame.center.z;
    return {
      along: rx * frame.normal.x + rz * frame.normal.z,
      perp: rx * frame.tangent.x + rz * frame.tangent.z
    };
  }

  isOnEntryCauseway(x, z) {
    const p = this._projectOnFrame(x, z, this.entryFrame);
    return p.along >= -0.6 && p.along <= this.entryCausewayLen && Math.abs(p.perp) <= this.entryHalfWidth;
  }

  isOnExitPier(x, z) {
    const p = this._projectOnFrame(x, z, this.exitFrame);
    return p.along >= -0.6 && p.along <= this.exitPierLen && Math.abs(p.perp) <= this.exitHalfWidth;
  }

  /**
   * True when the player reaches the safe escape end of the Exit Pier beyond the Exit Door.
   */
  hasReachedExitEscape(x, z) {
    const p = this._projectOnFrame(x, z, this.exitFrame);
    return p.along >= 9.5 && p.along <= this.exitPierLen && Math.abs(p.perp) <= this.exitHalfWidth;
  }

  /**
   * Single source of truth for solid ground vs. deep water!
   * No invisible walls: stepping outside any unauthorized exterior door drops directly into deep water.
   */
  isOnSolidGround(x, z) {
    if (this.findRoomFn(x, z)) return true;
    if (this.isOnEntryCauseway(x, z)) return true;
    if (this.isOnExitPier(x, z)) return true;
    if (this.getOuterShoreFactor(x, z) >= 1.0) return true;
    return false;
  }

  isInWater(x, z) {
    return !this.isOnSolidGround(x, z);
  }

  _createWaterNormalTexture() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(size, size);
    const d = img.data;

    const h = new Float32Array(size * size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = (x / size) * Math.PI * 2;
        const v = (y / size) * Math.PI * 2;
        h[y * size + x] =
          Math.sin(u * 3 + v * 2) * 0.36 +
          Math.cos(u * 5 - v * 4) * 0.26 +
          Math.sin(u * 8 + v * 7) * 0.16 +
          Math.cos(u * 11 - v * 9) * 0.08;
      }
    }
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const xL = (x - 1 + size) % size;
        const xR = (x + 1) % size;
        const yD = (y - 1 + size) % size;
        const yU = (y + 1) % size;
        const dx = (h[y * size + xR] - h[y * size + xL]) * 2.4;
        const dy = (h[yU * size + x] - h[yD * size + x]) * 2.4;
        const idx = (y * size + x) * 4;
        d[idx] = Math.max(0, Math.min(255, Math.round((-dx * 0.5 + 0.5) * 255)));
        d[idx + 1] = Math.max(0, Math.min(255, Math.round((-dy * 0.5 + 0.5) * 255)));
        d[idx + 2] = 245;
        d[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(34, 34);
    return tex;
  }

  _buildContinuousWater() {
    // Deep dark underwater bed beneath the entire water basin
    const bedGeo = new THREE.PlaneGeometry(360, 360);
    bedGeo.rotateX(-Math.PI / 2);
    const bedMat = new THREE.MeshStandardMaterial({ color: 0x03080c, roughness: 1.0, metalness: 0.0 });
    const bed = new THREE.Mesh(bedGeo, bedMat);
    bed.position.set(this.basinCenter.x, -2.5, this.basinCenter.z);
    this.group.add(bed);

    // Continuous moonlit dark water surface (opaque MeshStandardMaterial enables early-Z & cuts shader cost)
    const waterGeo = new THREE.PlaneGeometry(260, 220, 1, 1);
    waterGeo.rotateX(-Math.PI / 2);
    this.waterNormalMap = this._createWaterNormalTexture();
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x05141c,
      emissive: 0x000000,
      emissiveIntensity: 0.0,
      roughness: 0.12,
      metalness: 0.30,
      envMapIntensity: 1.15,
      normalMap: this.waterNormalMap,
      normalScale: new THREE.Vector2(0.7, 0.7)
    });
    this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.waterMesh.position.set(this.basinCenter.x, this.waterY, this.basinCenter.z);
    this.waterMesh.receiveShadow = true;
    this.waterMesh.updateMatrix();
    this.waterMesh.matrixAutoUpdate = false;
    this.group.add(this.waterMesh);
  }

  /**
   * Builds the outer solid forest landmass with an organic hole cut out for the water moat & lake,
   * so the maze sits like an isolated island fortress surrounded completely by deep water!
   */
  _buildOuterForestLandmass(forestMat) {
    const outer = new THREE.Shape();
    const hw = 210, hh = 190;
    outer.moveTo(-hw, -hh);
    outer.lineTo(hw, -hh);
    outer.lineTo(hw, hh);
    outer.lineTo(-hw, hh);
    outer.closePath();

    // Cut out the organic water basin hole (clockwise in 2D shape coordinates)
    const hole = new THREE.Path();
    const segs = 80;
    for (let i = 0; i <= segs; i++) {
      const ang = (i / segs) * Math.PI * 2;
      const organic = 1.0 + 0.055 * Math.sin(ang * 3.0 + 0.5) + 0.035 * Math.cos(ang * 5.0 - 0.7);
      const px = Math.cos(ang) * this.basinRadiusX * organic;
      const py = -Math.sin(ang) * this.basinRadiusZ * organic; // negated because rotateX(-PI/2) flips Y -> -Z
      if (i === 0) hole.moveTo(px, py);
      else hole.lineTo(px, py);
    }
    outer.holes.push(hole);

    const landGeo = new THREE.ShapeGeometry(outer);
    landGeo.rotateX(-Math.PI / 2);
    // World-scale UVs for forest ground PBR tiling
    const pos = landGeo.attributes.position;
    const uv = landGeo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      uv.setXY(i, pos.getX(i) / 4.5, pos.getZ(i) / 4.5);
    }

    const landMesh = new THREE.Mesh(landGeo, forestMat);
    landMesh.position.set(this.basinCenter.x, 0.02, this.basinCenter.z);
    landMesh.receiveShadow = true;
    this.group.add(landMesh);
  }

  /**
   * Builds the ONLY Entry Land Causeway directly straight in front of the Entry Door (11,2, dir 1).
   */
  _buildEntryCauseway(causewayMat, curbMat) {
    const f = this.entryFrame;
    const len = this.entryCausewayLen;
    const width = this.entryHalfWidth * 2;

    const grp = new THREE.Group();
    grp.position.copy(f.center);
    grp.rotation.y = f.rotY;

    // Solid earth/stone causeway deck extending straight out (+Z in local door space is outward normal!)
    // Verify local +Z: rotY = -ang + PI/2 -> local +Z rotates to (sin(rotY), cos(rotY)) = (cos(ang), sin(ang)) = outward normal!
    const deck = new THREE.Mesh(new THREE.BoxGeometry(width, 2.5, len), causewayMat);
    deck.position.set(0, -1.23, len / 2);
    deck.receiveShadow = true;
    grp.add(deck);

    // Low weathered stone side curbs marking the edge above the deep water
    const curbGeo = new THREE.BoxGeometry(0.28, 0.24, len);
    for (const sx of [-width / 2 + 0.14, width / 2 - 0.14]) {
      const curb = new THREE.Mesh(curbGeo, curbMat);
      curb.position.set(sx, 0.12, len / 2);
      curb.receiveShadow = true;
      grp.add(curb);
    }

    // Subtle guiding torch/marker posts near the start of the causeway
    const postGeo = new THREE.CylinderGeometry(0.09, 0.11, 1.4, 8);
    for (const pz of [3.2, 10.5]) {
      for (const sx of [-width / 2 + 0.22, width / 2 - 0.22]) {
        const post = new THREE.Mesh(postGeo, curbMat);
        post.position.set(sx, 0.7, pz);
        grp.add(post);
      }
    }

    this.group.add(grp);
  }

  /**
   * Builds the ONLY Exit Lakeside Pier directly straight outside the Exit Door (0,2, dir 5).
   */
  _buildExitPier(curbMat) {
    const f = this.exitFrame;
    const len = this.exitPierLen;
    const width = this.exitHalfWidth * 2;

    const grp = new THREE.Group();
    grp.position.copy(f.center);
    grp.rotation.y = f.rotY;

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x2d2219, roughness: 0.92, metalness: 0.04 });

    // Wooden dock deck + pilings plunging into the dark lake
    const deck = new THREE.Mesh(new THREE.BoxGeometry(width, 0.22, len), woodMat);
    deck.position.set(0, -0.07, len / 2);
    deck.receiveShadow = true;
    grp.add(deck);

    const pilingGeo = new THREE.CylinderGeometry(0.13, 0.15, 2.8, 8);
    for (let z = 1.5; z <= len - 0.5; z += 3.2) {
      for (const sx of [-width / 2 + 0.22, width / 2 - 0.22]) {
        const p = new THREE.Mesh(pilingGeo, woodMat);
        p.position.set(sx, -0.5, z);
        grp.add(p);
      }
    }

    // Eerie green escape beacon lantern at the end of the exit pier
    const beaconPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.5, 8), curbMat);
    beaconPole.position.set(0, 1.25, len - 1.2);
    grp.add(beaconPole);

    const beaconOrb = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0x4ade80 })
    );
    beaconOrb.position.set(0, 2.55, len - 1.2);
    grp.add(beaconOrb);

    const exitBeaconLight = new THREE.PointLight(0x4ade80, 2.4, 8, 2.0);
    exitBeaconLight.position.set(0, 2.6, len - 1.2);
    grp.add(exitBeaconLight);
    this.exitBeaconLight = exitBeaconLight;

    this.group.add(grp);
  }

  _createCrocodileMesh() {
    const croc = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x1a291e, roughness: 0.55, metalness: 0.12 });
    const ridgeMat = new THREE.MeshStandardMaterial({ color: 0x0f1a12, roughness: 0.7, metalness: 0.08 });
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: new THREE.Color(0xf59e0b),
      emissiveIntensity: 3.0,
      roughness: 0.2
    });
    const toothMat = new THREE.MeshStandardMaterial({ color: 0xd6d3c9, roughness: 0.5 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.36, 1.75), skinMat);
    body.position.set(0, -0.06, 0);
    croc.add(body);

    const scuteGeo = new THREE.ConeGeometry(0.11, 0.16, 4);
    for (let i = 0; i < 6; i++) {
      for (const sx of [-0.14, 0.14]) {
        const s = new THREE.Mesh(scuteGeo, ridgeMat);
        s.position.set(sx, 0.15, -0.65 + i * 0.26);
        croc.add(s);
      }
    }

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.02, 0.92);
    croc.add(headGroup);

    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.24, 0.52), skinMat);
    skull.position.set(0, 0.02, 0.12);
    headGroup.add(skull);

    const upperJaw = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.14, 0.78), skinMat);
    upperJaw.position.set(0, 0.03, 0.68);
    headGroup.add(upperJaw);

    const toothGeo = new THREE.ConeGeometry(0.022, 0.08, 4);
    for (let i = 0; i < 5; i++) {
      for (const tx of [-0.15, 0.15]) {
        const t = new THREE.Mesh(toothGeo, toothMat);
        t.rotation.x = Math.PI;
        t.position.set(tx, -0.05, 0.42 + i * 0.14);
        headGroup.add(t);
      }
    }

    const lowerJaw = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.10, 0.74), skinMat);
    lowerJaw.position.set(0, -0.08, 0.64);
    headGroup.add(lowerJaw);

    for (const ex of [-0.19, 0.19]) {
      const brow = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), ridgeMat);
      brow.position.set(ex, 0.16, 0.22);
      headGroup.add(brow);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), eyeMat);
      eye.position.set(ex, 0.17, 0.28);
      headGroup.add(eye);
    }

    const tailSegs = [];
    let parent = croc;
    const widths = [0.54, 0.36, 0.20];
    const lengths = [0.85, 0.80, 0.75];
    for (let i = 0; i < 3; i++) {
      const pivot = new THREE.Group();
      pivot.position.set(0, i === 0 ? -0.05 : 0, i === 0 ? -0.88 : -lengths[i - 1]);
      const seg = new THREE.Mesh(new THREE.BoxGeometry(widths[i], 0.24 - i * 0.04, lengths[i]), skinMat);
      seg.position.set(0, 0, -lengths[i] * 0.5);
      pivot.add(seg);
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, lengths[i] * 0.8), ridgeMat);
      fin.position.set(0, 0.14 - i * 0.02, -lengths[i] * 0.5);
      pivot.add(fin);
      parent.add(pivot);
      tailSegs.push(pivot);
      parent = pivot;
    }

    const rippleRing = new THREE.Mesh(
      new THREE.RingGeometry(0.85, 1.45, 24),
      new THREE.MeshBasicMaterial({ color: 0x528291, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
    );
    rippleRing.rotation.x = -Math.PI / 2;
    rippleRing.position.y = 0.06;
    croc.add(rippleRing);

    return { root: croc, headGroup, lowerJaw, tailSegs, rippleRing };
  }

  _spawnCrocodiles() {
    // 8 crocodiles patrolling ALL sides of the continuous water boundary + western lake!
    const configs = [
      // Western Dark Lake near Exit Pier
      { x: -72, z: -6,  r: 8.5, speed: 1.7, phase: 0.2, scale: 1.2 },
      { x: -68, z: 16,  r: 9.0, speed: 1.5, phase: 2.1, scale: 1.12 },
      { x: -82, z: 4,   r: 10.5, speed: 1.6, phase: 4.3, scale: 1.3 },
      // North Moat
      { x: -12, z: -42, r: 9.0, speed: 1.65, phase: 1.1, scale: 1.18 },
      { x: 24,  z: -36, r: 8.0, speed: 1.55, phase: 3.4, scale: 1.15 },
      // South Moat
      { x: -16, z: 48,  r: 9.0, speed: 1.6, phase: 0.7, scale: 1.22 },
      { x: 28,  z: 44,  r: 8.5, speed: 1.5, phase: 2.8, scale: 1.14 },
      // East Moat (flanking south of the Entry Causeway so players see danger in the water!)
      { x: 58,  z: 24,  r: 7.0, speed: 1.6, phase: 5.0, scale: 1.16 }
    ];

    const clips = this.crocGltf?.animations || [];
    const patrolClip = clips.find((c) => c.name === 'Croc_01_Swim_Patrol') || clips[0] || null;
    const chaseClip = clips.find((c) => c.name === 'Croc_02_Swim_Chase') || patrolClip;
    const biteClip = clips.find((c) => c.name === 'Croc_03_Bite_Lunge') || chaseClip;

    if (this.crocGltf?.scene) {
      this.crocGltf.scene.traverse((obj) => {
        if (obj.isMesh || obj.isSkinnedMesh) {
          obj.castShadow = false;
          obj.receiveShadow = true;
          obj.frustumCulled = false;
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => {
            if (!m) return;
            m.envMapIntensity = 0.45;
            if (m.name === 'MAT_Croc_EyeIris') {
              m.emissive = new THREE.Color(0xf59e0b);
              m.emissiveIntensity = 2.6;
            } else if (m.name === 'MAT_Croc_EyeCornea') {
              m.transparent = true;
              m.opacity = 0.18;
              m.roughness = 0.04;
            }
          });
        }
      });
    }

    for (const cfg of configs) {
      let parts;
      if (this.crocGltf?.scene) {
        const root = new THREE.Group();
        const model = SkeletonUtils.clone(this.crocGltf.scene);
        // Sit low in water so armored back, glowing eyes & serrated tail break the dark surface
        model.position.set(0, -0.18, 0);
        root.add(model);

        const rippleRing = new THREE.Mesh(
          new THREE.RingGeometry(0.95, 1.65, 24),
          new THREE.MeshBasicMaterial({ color: 0x528291, transparent: true, opacity: 0.24, side: THREE.DoubleSide })
        );
        rippleRing.rotation.x = -Math.PI / 2;
        rippleRing.position.y = 0.06;
        root.add(rippleRing);

        let mixer = null;
        const actions = {};
        if (patrolClip) {
          mixer = new THREE.AnimationMixer(model);
          actions.patrol = mixer.clipAction(patrolClip);
          actions.chase = chaseClip ? mixer.clipAction(chaseClip) : actions.patrol;
          actions.bite = biteClip ? mixer.clipAction(biteClip) : actions.chase;
          actions.patrol.setLoop(THREE.LoopRepeat, Infinity);
          actions.chase.setLoop(THREE.LoopRepeat, Infinity);
          actions.bite.setLoop(THREE.LoopOnce, 1);
          actions.bite.clampWhenFinished = false;
          actions.patrol.play();
          mixer.update(cfg.phase * 0.35);
        }
        parts = { root, rippleRing, mixer, actions, currentAnim: 'patrol', biteAnimTimer: 0, isGltf: true };
      } else {
        parts = this._createCrocodileMesh();
      }

      parts.root.scale.setScalar(cfg.scale);
      parts.root.position.set(cfg.x, this.waterY - 0.02, cfg.z);
      this.group.add(parts.root);

      this.crocodiles.push({
        ...parts,
        homeX: cfg.x,
        homeZ: cfg.z,
        patrolRadius: cfg.r,
        patrolSpeed: cfg.speed,
        phase: cfg.phase,
        yaw: cfg.phase,
        state: 'patrol',
        attackCooldown: 0,
        growlCooldown: 0
      });
    }
  }

  update(dt, playerPos, onAttack, onGrowl, camPos = null, disableCulling = false) {
    this.time += dt;

    if (this.waterNormalMap) {
      this.waterNormalMap.offset.x = (this.time * 0.022) % 1;
      this.waterNormalMap.offset.y = (this.time * 0.014) % 1;
    }
    if (this.exitBeaconLight) {
      this.exitBeaconLight.intensity = 2.2 + Math.sin(this.time * 4.5) * 0.35;
    }

    const inWater = this.isInWater(playerPos.x, playerPos.z);
    const refX = camPos ? camPos.x : playerPos.x;
    const refZ = camPos ? camPos.z : playerPos.z;

    for (const c of this.crocodiles) {
      c.attackCooldown = Math.max(0, c.attackCooldown - dt);
      c.growlCooldown = Math.max(0, c.growlCooldown - dt);

      const dxP = playerPos.x - c.root.position.x;
      const dzP = playerPos.z - c.root.position.z;
      const distToPlayer = Math.hypot(dxP, dzP);
      const distToCam = Math.hypot(refX - c.root.position.x, refZ - c.root.position.z);
      const isVisible = disableCulling || distToCam < 62.0;
      c.root.visible = isVisible;

      let targetX, targetZ, moveSpeed;

      if (inWater && distToPlayer < 72) {
        c.state = 'attack';
        targetX = playerPos.x;
        targetZ = playerPos.z;
        moveSpeed = distToPlayer < 10 ? 7.2 : 5.4;
        if (c.growlCooldown <= 0 && distToPlayer < 22) {
          c.growlCooldown = 3.2;
          onGrowl?.();
        }
      } else {
        c.state = 'patrol';
        const t = this.time * (0.22 * c.patrolSpeed) + c.phase;
        targetX = c.homeX + Math.cos(t) * c.patrolRadius;
        targetZ = c.homeZ + Math.sin(t * 0.85) * c.patrolRadius;
        moveSpeed = c.patrolSpeed;
      }

      const tx = targetX - c.root.position.x;
      const tz = targetZ - c.root.position.z;
      const desiredYaw = Math.atan2(tx, tz);

      let diff = desiredYaw - c.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      c.yaw += diff * Math.min(1, dt * (c.state === 'attack' ? 5.5 : 2.2));
      c.root.rotation.y = c.yaw;

      const step = moveSpeed * dt;
      const nextX = c.root.position.x + Math.sin(c.yaw) * step;
      const nextZ = c.root.position.z + Math.cos(c.yaw) * step;

      // Crocodiles stay strictly inside the water
      if (this.isInWater(nextX, nextZ)) {
        c.root.position.x = nextX;
        c.root.position.z = nextZ;
      }

      const submergeY = c.state === 'attack'
        ? this.waterY + 0.04 + Math.sin(this.time * 7 + c.phase) * 0.03
        : this.waterY - 0.05 + Math.sin(this.time * 1.4 + c.phase) * 0.045;
      c.root.position.y += (submergeY - c.root.position.y) * Math.min(1, dt * 4);

      if (c.isGltf && c.mixer) {
        c.biteAnimTimer = Math.max(0, (c.biteAnimTimer || 0) - dt);
        if (isVisible) {
          const desiredAnim = c.biteAnimTimer > 0
            ? 'bite'
            : (c.state === 'attack' ? 'chase' : 'patrol');
          if (c.currentAnim !== desiredAnim && c.actions[desiredAnim]) {
            const prev = c.actions[c.currentAnim];
            const next = c.actions[desiredAnim];
            next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
            if (prev && prev !== next) prev.crossFadeTo(next, desiredAnim === 'bite' ? 0.12 : 0.28, true);
            c.currentAnim = desiredAnim;
          }
          c.mixer.update(dt);
        }
      } else if (c.tailSegs) {
        const swimFreq = c.state === 'attack' ? 9.5 : 3.2;
        const swimAmp = c.state === 'attack' ? 0.32 : 0.16;
        c.tailSegs.forEach((seg, idx) => {
          seg.rotation.y = Math.sin(this.time * swimFreq - idx * 0.9 + c.phase) * swimAmp * (1 + idx * 0.25);
        });
        if (c.state === 'attack' && distToPlayer < 5.5) {
          c.lowerJaw.rotation.x = 0.25 + Math.abs(Math.sin(this.time * 10)) * 0.35;
        } else {
          c.lowerJaw.rotation.x *= 0.9;
        }
      }

      const pulse = 0.92 + Math.sin(this.time * (c.state === 'attack' ? 8 : 2.5) + c.phase) * 0.18;
      c.rippleRing.scale.setScalar(pulse);

      if (inWater && distToPlayer < 2.4 && c.attackCooldown <= 0) {
        c.attackCooldown = 1.5;
        if (c.isGltf) c.biteAnimTimer = 1.15;
        onAttack?.(c);
      }
    }

    return {
      inWater,
      escapedAtExit: this.hasReachedExitEscape(playerPos.x, playerPos.z)
    };
  }
}
