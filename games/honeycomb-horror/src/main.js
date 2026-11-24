/**
 * Honeycomb — Nighttime Horror Maze with Water Boundary, Two Land Access Points & Crocodiles
 *
 * - Player spawns on solid ground directly in front of and facing straight at the Entry Door.
 * - Only TWO land-connected outdoor doors exist: Entry Door (East) and Exit Door (West).
 * - Deep dark water completely surrounds the honeycomb maze; all other exterior doors open to water.
 * - Entering the water triggers drowning + aggressive swimming crocodiles (no invisible walls).
 */
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GroundedSkybox } from 'three/addons/objects/GroundedSkybox.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  HEX_RADIUS, ENTRANCE_KEY, EXIT_KEY, ENTRY_DOOR_DIR, EXIT_DOOR_DIR,
  buildMazeGraph, buildMaze3D, resolvePlayerCollisions, findRoomAt, getDoorWorldFrame,
  setDoorImmediate, updateDoors
} from './maze.js?v=25';
import { HorrorAudio } from './audio.js?v=23';
import { WaterBoundarySystem } from './water.js?v=24';
import { HorrorCharacterAI } from './monster.js?v=26';
import { HorrorAIDirector, TERRITORY_CONFIGS } from './ai-director.js?v=13';

if (location.protocol === 'file:') {
  document.getElementById('file-warning').style.display = 'flex';
  throw new Error('Cannot run from file:// — start a local server (python3 -m http.server 8091)');
}

const params = new URLSearchParams(location.search);
const inspectId = params.get('inspect');
const inspectCam = params.get('cam') || '34';
const initialView = params.get('view') ? parseInt(params.get('view'), 10) : null;
const cleanMode = params.get('clean') === '1';

if (cleanMode || inspectId || initialView) {
  document.getElementById('overlay').style.display = 'none';
}
if (cleanMode) {
  document.getElementById('hud').style.display = 'none';
  document.getElementById('controls-hint').style.display = 'none';
  document.getElementById('crosshair').style.display = 'none';
}

window.__READY = false;
window.__REPORT = {};
window.__MAZE_STATS = null;
window.__FALLBACKS = [];

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.info.autoReset = false;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x010204);
scene.fog = new THREE.FogExp2(0x010204, 0.048);

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.08, 260);
scene.add(camera);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.32,
  0.55,
  0.72
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());
let postFxEnabled = false;

const texLoader = new THREE.TextureLoader();
const gltfLoader = new GLTFLoader();
const rgbeLoader = new RGBELoader();
const maxAniso = renderer.capabilities.getMaxAnisotropy();

function loadTexture(url, isColor, repeatX = 1, repeatY = 1) {
  return new Promise((resolve) => {
    texLoader.load(
      url,
      (tex) => {
        tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(repeatX, repeatY);
        tex.anisotropy = Math.min(8, maxAniso);
        resolve(tex);
      },
      undefined,
      () => {
        window.__FALLBACKS.push(url);
        resolve(null);
      }
    );
  });
}

async function loadPBRMaterial(texEntry, repeatX, repeatY, overrides = {}) {
  const m = texEntry.maps;
  const [map, normalMap, roughnessMap, armMap] = await Promise.all([
    m.map ? loadTexture(m.map, true, repeatX, repeatY) : null,
    m.normalMap ? loadTexture(m.normalMap, false, repeatX, repeatY) : null,
    m.roughnessMap ? loadTexture(m.roughnessMap, false, repeatX, repeatY) : null,
    m.armMap ? loadTexture(m.armMap, false, repeatX, repeatY) : null
  ]);
  return new THREE.MeshStandardMaterial({
    map,
    normalMap,
    roughnessMap: roughnessMap || armMap,
    aoMap: armMap,
    aoMapIntensity: 0.75,
    roughness: 0.92,
    metalness: 0.06,
    ...overrides
  });
}

function normalizeModel(id, root, spec) {
  const container = new THREE.Group();
  container.name = id;

  if (spec.rotationFix) {
    root.rotation.set(spec.rotationFix[0], spec.rotationFix[1], spec.rotationFix[2]);
  }
  root.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  let scaleApplied = 1;
  if (size.y > 1e-4 && spec.expectedHeight) {
    scaleApplied = spec.expectedHeight / size.y;
    root.scale.multiplyScalar(scaleApplied);
  }
  root.updateMatrixWorld(true);

  const box2 = new THREE.Box3().setFromObject(root);
  const size2 = new THREE.Vector3();
  const center2 = new THREE.Vector3();
  box2.getSize(size2);
  box2.getCenter(center2);

  root.position.x -= center2.x;
  root.position.z -= center2.z;
  root.position.y -= box2.min.y;
  root.updateMatrixWorld(true);

  let tris = 0;
  const matSet = new Set();
  root.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
      const g = obj.geometry;
      tris += g.index ? g.index.count / 3 : (g.attributes.position ? g.attributes.position.count / 3 : 0);
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((mat) => {
        if (!mat) return;
        matSet.add(mat.name || mat.type);
        mat.envMapIntensity = 0.55;
        if (id === 'fir_tree_opt' && mat.color) {
          mat.color.multiplyScalar(0.88);
          mat.alphaTest = mat.transparent ? 0.35 : 0;
          mat.transparent = false;
        }
      });
    }
  });

  container.add(root);
  const finalBox = new THREE.Box3().setFromObject(container);
  const finalSize = new THREE.Vector3();
  finalBox.getSize(finalSize);

  window.__REPORT[id] = {
    size: [+finalSize.x.toFixed(2), +finalSize.y.toFixed(2), +finalSize.z.toFixed(2)],
    minY: +finalBox.min.y.toFixed(3),
    tris: Math.round(tris),
    materials: matSet.size,
    scaleApplied: +scaleApplied.toFixed(3)
  };
  return container;
}

async function loadModelAsset(id, spec) {
  return new Promise((resolve) => {
    gltfLoader.load(
      spec.path,
      (gltf) => resolve(normalizeModel(id, gltf.scene, spec)),
      undefined,
      () => {
        window.__FALLBACKS.push(spec.path);
        const h = spec.expectedHeight || 1.5;
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(h * 0.5, h, h * 0.5),
          new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.8 })
        );
        box.position.y = h / 2;
        const g = new THREE.Group();
        g.add(box);
        window.__REPORT[id] = { size: [h * 0.5, h, h * 0.5], minY: 0, tris: 12, materials: 1, fallback: true };
        resolve(g);
      }
    );
  });
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function init() {
  const manifestRes = await fetch('assets/manifest.json?v=22');
  const manifest = await manifestRes.json();

  const pmrem = new THREE.PMREMGenerator(renderer);
  const hdriEntry = manifest.hdri.dikhololo_night;
  await new Promise((resolve) => {
    rgbeLoader.load(
      hdriEntry.path,
      (hdrTex) => {
        hdrTex.mapping = THREE.EquirectangularReflectionMapping;
        const envRT = pmrem.fromEquirectangular(hdrTex);
        scene.environment = envRT.texture;
        scene.environmentIntensity = 0.03;
        if (!inspectId) {
          scene.background = new THREE.Color(0x010204);
        } else {
          scene.background = new THREE.Color(0x1e2430);
          scene.environmentIntensity = 1.1;
        }
        pmrem.dispose();
        resolve();
      },
      undefined,
      () => {
        window.__FALLBACKS.push(hdriEntry.path);
        resolve();
      }
    );
  });

  if (inspectId && manifest.models[inspectId]) {
    scene.fog = null;
    renderer.toneMappingExposure = 1.35;
    scene.add(new THREE.GridHelper(20, 20, 0x64748b, 0x334155));
    const dir = new THREE.DirectionalLight(0xffffff, 2.2);
    dir.position.set(6, 12, 8);
    scene.add(dir);
    scene.add(new THREE.HemisphereLight(0xcbd5e1, 0x334155, 0.7));

    const refMan = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.22, 1.36, 8, 12),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.7, transparent: true, opacity: 0.55 })
    );
    refMan.position.set(-2.2, 0.9, 0);
    scene.add(refMan);

    const model = await loadModelAsset(inspectId, manifest.models[inspectId]);
    scene.add(model);

    const h = manifest.models[inspectId].expectedHeight || 2;
    const dist = Math.max(3.2, h * 1.45);
    const ty = h * 0.48;
    if (inspectCam === 'front') camera.position.set(0, ty, dist);
    else if (inspectCam === 'side') camera.position.set(dist, ty, 0);
    else if (inspectCam === 'top') camera.position.set(0, dist * 1.35, 0.01);
    else camera.position.set(dist * 0.78, ty + h * 0.25, dist * 0.85);
    camera.lookAt(0, ty, 0);

    renderer.render(scene, camera);
    window.__READY = true;
    return;
  }

  const loadRawGltf = (path) => new Promise((resolve) => {
    gltfLoader.load(
      path,
      (gltf) => resolve(gltf),
      undefined,
      () => { window.__FALLBACKS.push(path); resolve(null); }
    );
  });

  const [wallMat, floorMat, forestMat, doorLeafMat, firModel, trunkModel, boulderModel, lanternModel, barrelModel, creatureGltf, girlGltf, butcherGltf, nurseGltf, woodenDoorGltf, crocodileGltf] =
    await Promise.all([
      loadPBRMaterial(manifest.textures.castle_brick_07, 2.2, 1.7, { color: new THREE.Color(0xbec4ce), roughness: 0.90 }),
      loadPBRMaterial(manifest.textures.cobblestone_05, 1.0, 1.0, { color: new THREE.Color(0xaeb5bf), roughness: 0.85 }),
      loadPBRMaterial(manifest.textures.brown_mud_leaves_01, 1.0, 1.0, { color: new THREE.Color(0x9aa396), roughness: 0.94 }),
      loadPBRMaterial(manifest.textures.metal_plate, 1.1, 1.4, { color: new THREE.Color(0xa8b0ba), roughness: 0.56, metalness: 0.62 }),
      loadModelAsset('fir_tree_opt', manifest.models.fir_tree_opt),
      loadModelAsset('dead_tree_trunk', manifest.models.dead_tree_trunk),
      loadModelAsset('boulder_01', manifest.models.boulder_01),
      loadModelAsset('Lantern_01', manifest.models.Lantern_01),
      loadModelAsset('Barrel_01', manifest.models.Barrel_01),
      loadRawGltf(manifest.models.crawling_creature.path),
      loadRawGltf(manifest.models.horror_girl.path),
      loadRawGltf(manifest.models.the_butcher.path),
      loadRawGltf(manifest.models.the_nurse.path),
      manifest.models.wooden_horror_door ? loadRawGltf(manifest.models.wooden_horror_door.path) : Promise.resolve(null),
      manifest.models.horror_crocodile ? loadRawGltf(`${manifest.models.horror_crocodile.path}?v=22`) : Promise.resolve(null)
    ]);

  const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x161920, roughness: 0.96, metalness: 0.1 });
  const doorFrameMat = new THREE.MeshStandardMaterial({ color: 0x262b33, roughness: 0.55, metalness: 0.78 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x3b424c, roughness: 0.9, metalness: 0.1 });

  // Full pitch-black horror darkness — flashlight is the only real light source
  const moonLight = new THREE.DirectionalLight(0x9ec5ff, 0.0);
  moonLight.position.set(42, 68, -36);
  moonLight.castShadow = false;
  scene.add(moonLight);

  const hemiLight = new THREE.HemisphereLight(0x121926, 0x05070a, 0.025);
  scene.add(hemiLight);

  // Build 41-room honeycomb maze (4 functional wooden horror doors per room preserved)
  const mazeGraph = buildMazeGraph();
  const { group: mazeGroup, doors, colliders } = buildMaze3D(mazeGraph, {
    wall: wallMat,
    floor: floorMat,
    ceiling: ceilingMat,
    doorLeaf: doorLeafMat,
    doorFrame: doorFrameMat
  }, woodenDoorGltf);
  scene.add(mazeGroup);

  const entranceRoom = mazeGraph.rooms.get(ENTRANCE_KEY);
  const exitRoom = mazeGraph.rooms.get(EXIT_KEY);
  const centerHub = mazeGraph.rooms.get('6,2');

  // Exact world frames of the ONLY TWO land-connected doors
  const entryFrame = getDoorWorldFrame(entranceRoom, ENTRY_DOOR_DIR);
  const exitFrame = getDoorWorldFrame(exitRoom, EXIT_DOOR_DIR);

  window.__MAZE_STATS = {
    ...mazeGraph.stats,
    entryDoors: doors.filter((d) => d.doorRole === 'entry').length,
    exitDoors: doors.filter((d) => d.doorRole === 'exit').length,
    waterBoundaryDoors: doors.filter((d) => d.doorRole === 'water').length
  };

  // Continuous deep water surrounding the entire maze + 2 land causeways + 8 crocodiles
  const waterSys = new WaterBoundarySystem(
    scene,
    entryFrame,
    exitFrame,
    { forestGround: forestMat, causeway: floorMat, curb: curbMat },
    (x, z) => !!findRoomAt(x, z, mazeGraph),
    crocodileGltf
  );

  // Horror AI Director (enforces wall/door LOS, individual territories, and single-hunter chase exclusivity)
  const aiDirector = new HorrorAIDirector(colliders, mazeGraph, (x, z) => findRoomAt(x, z, mazeGraph));
  window.__AI_DIRECTOR = aiDirector;
  window.__AI_TERRITORIES = TERRITORY_CONFIGS;

  // Horror Characters (each with its own vision cone, territory, patrol route & 3D audio identity)
  const monsters = [];
  if (creatureGltf) {
    monsters.push(new HorrorCharacterAI(scene, creatureGltf, mazeGraph, doors, (x, z) => findRoomAt(x, z, mazeGraph), {
      name: 'CrawlingCreature',
      audioProfile: 'crawling_creature',
      stepIntervalWalk: 0.36,
      stepIntervalChase: 0.20,
      targetHeight: 1.15,
      walkSpeed: 1.95,
      chaseSpeed: 4.35,
      eyeLightColor: 0xff2211,
      eyeLightY: 0.72,
      damage: 45,
      deathMessage: 'The Crawling Creature hunted you down inside the dark honeycomb maze.'
    }));
  }
  if (girlGltf) {
    monsters.push(new HorrorCharacterAI(scene, girlGltf, mazeGraph, doors, (x, z) => findRoomAt(x, z, mazeGraph), {
      name: 'HorrorGirl',
      audioProfile: 'horror_girl',
      stepIntervalWalk: 0.54,
      stepIntervalChase: 0.28,
      targetHeight: 1.65,
      walkSpeed: 1.75,
      chaseSpeed: 3.95,
      eyeLightColor: 0x7dd3fc,
      eyeLightIntensity: 0.65,
      eyeLightY: 1.46,
      damage: 40,
      deathMessage: 'The Pale Girl caught you in the dark corridors of the honeycomb maze.'
    }));
  }
  if (butcherGltf) {
    monsters.push(new HorrorCharacterAI(scene, butcherGltf, mazeGraph, doors, (x, z) => findRoomAt(x, z, mazeGraph), {
      name: 'TheButcher',
      audioProfile: 'the_butcher',
      stepIntervalWalk: 0.72,
      stepIntervalChase: 0.38,
      targetHeight: 2.25,
      walkSpeed: 1.65,
      chaseSpeed: 3.75,
      eyeLightColor: 0xffaa22,
      eyeLightIntensity: 0.9,
      eyeLightY: 2.02,
      damage: 55,
      deathMessage: 'The Butcher cut you down with his cleaver inside the dark honeycomb maze.',
      animMap: {
        idle: '01_Idle',
        walk: '02_Patrol_Walk',
        chase: '03_Chase_Run',
        attack: '04_Heavy_Slash',
        openDoor: '05_Door_Breach',
        search: '06_Searching_LookAround',
        look: '06_Searching_LookAround'
      }
    }));
  }
  if (nurseGltf) {
    monsters.push(new HorrorCharacterAI(scene, nurseGltf, mazeGraph, doors, (x, z) => findRoomAt(x, z, mazeGraph), {
      name: 'TheNurse',
      audioProfile: 'the_nurse',
      stepIntervalWalk: 0.85,
      stepIntervalChase: 0.44,
      targetHeight: 1.80,
      hoverHeight: 0.16,
      walkSpeed: 2.05,
      chaseSpeed: 4.55,
      eyeLightColor: 0xc084fc,
      eyeLightIntensity: 0.7,
      eyeLightY: 1.55,
      damage: 45,
      deathMessage: 'The Nurse glided out of the dark and struck you down with her bone saw.',
      animMap: {
        idle: 'Nurse_01_Hover_Idle',
        walk: 'Nurse_02_Floating_Glide',
        chase: 'Nurse_03_Blink_Charge',
        attack: 'Nurse_04_Blink_Lunge_Slash',
        openDoor: 'Nurse_06_Door_Open',
        search: 'Nurse_07_Searching_Scan',
        look: 'Nurse_07_Searching_Scan'
      }
    }));
  }
  monsters.forEach((m) => aiDirector.register(m));

  // Player Starting Position:
  // Standing straight & centered directly in front of the Entry Door, on solid ground, facing directly at it!
  const spawnPos = entryFrame.center.clone().addScaledVector(entryFrame.normal, 7.6);
  spawnPos.y = 1.7;
  const spawnYaw = Math.atan2(entryFrame.normal.x, entryFrame.normal.z);
  const spawnPitch = -0.04;

  // Entrance Lantern mounted right beside the Entry Door so the door is clearly framed on spawn
  const entLanternPos = entryFrame.center.clone()
    .addScaledVector(entryFrame.normal, 1.05)
    .addScaledVector(entryFrame.tangent, 1.95);
  const postMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 2.35, 8),
    new THREE.MeshStandardMaterial({ color: 0x3b2d22, roughness: 0.9 })
  );
  postMesh.position.set(entLanternPos.x, 1.175, entLanternPos.z);
  scene.add(postMesh);

  const entranceLantern = lanternModel.clone();
  entranceLantern.position.set(entLanternPos.x, 2.35, entLanternPos.z);
  scene.add(entranceLantern);

  const lanternFlame = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xffd078 })
  );
  lanternFlame.position.set(entLanternPos.x, 2.53, entLanternPos.z);
  scene.add(lanternFlame);

  // Ultra-dim ember glow only right on the lantern/exit so flashlight remains the sole real light source
  const entranceGlow = new THREE.PointLight(0xff8c33, 1.6, 5.0, 2.0);
  entranceGlow.position.set(entLanternPos.x, 2.55, entLanternPos.z);
  scene.add(entranceGlow);

  const exitLight = new THREE.PointLight(0x2ee655, 2.0, 6.5, 2.0);
  exitLight.position.set(exitRoom.center.x, 3.0, exitRoom.center.z);
  scene.add(exitLight);

  const hubLight = new THREE.PointLight(0xd92630, 0.0, 8, 2.0);
  hubLight.position.set(centerHub.center.x, 3.2, centerHub.center.z);
  scene.add(hubLight);

  // Dense surrounding nighttime forest strictly on the solid outer forest landmass (NEVER inside or near any maze room!)
  const rand = mulberry32(90017);
  const treeMatrices = [];
  const treeColliders = [];
  const dummy = new THREE.Object3D();

  function isSafeForForestTree(x, z) {
    if (waterSys.getOuterShoreFactor(x, z) < 1.06) return false;
    if (waterSys.isOnEntryCauseway(x, z) || waterSys.isOnExitPier(x, z)) return false;
    if (x > -64 && x < 64 && z > -46 && z < 56) return false;
    const minRoomSq = (HEX_RADIUS + 16.0) ** 2;
    for (const room of mazeGraph.rooms.values()) {
      const dx = x - room.center.x;
      const dz = z - room.center.z;
      if (dx * dx + dz * dz < minRoomSq) return false;
    }
    return true;
  }

  // Place framing forest trees right around the outer end of the Entry Causeway (strictly on outer forest shore)
  const entryForestAnchor = entryFrame.center.clone().addScaledVector(entryFrame.normal, 26.0);
  for (const [alongOff, perpOff, s] of [
    [0, 5.5, 1.15], [0, -5.5, 1.1], [5, 6.4, 1.25], [5, -6.2, 1.2],
    [10, 4.8, 1.3], [10, -5.0, 1.15], [14, 0.5, 1.35]
  ]) {
    const p = entryForestAnchor.clone()
      .addScaledVector(entryFrame.normal, alongOff)
      .addScaledVector(entryFrame.tangent, perpOff);
    if (isSafeForForestTree(p.x, p.z)) {
      dummy.position.set(p.x, 0, p.z);
      dummy.rotation.set(0, rand() * Math.PI * 2, 0);
      dummy.scale.set(s, s * 1.05, s);
      dummy.updateMatrix();
      treeMatrices.push(dummy.matrix.clone());
      treeColliders.push({ x: p.x, z: p.z, r: 0.45 * s });
    }
  }

  let attempts = 0;
  while (treeMatrices.length < 120 && attempts < 6000) {
    attempts++;
    const x = -12 + (rand() - 0.5) * 280;
    const z = 4 + (rand() - 0.5) * 230;
    if (!isSafeForForestTree(x, z)) continue;

    let tooClose = false;
    for (let i = 0; i < treeColliders.length; i++) {
      const dx = x - treeColliders[i].x;
      const dz = z - treeColliders[i].z;
      if (dx * dx + dz * dz < 22.0) { tooClose = true; break; }
    }
    if (tooClose) continue;

    const scale = 0.9 + rand() * 0.75;
    dummy.position.set(x, 0, z);
    dummy.rotation.set((rand() - 0.5) * 0.04, rand() * Math.PI * 2, (rand() - 0.5) * 0.04);
    dummy.scale.set(scale, scale * (0.95 + rand() * 0.2), scale);
    dummy.updateMatrix();
    treeMatrices.push(dummy.matrix.clone());
    treeColliders.push({ x, z, r: 0.45 * scale });
  }

  firModel.updateMatrixWorld(true);
  const firRootInv = firModel.matrixWorld.clone().invert();
  firModel.traverse((child) => {
    if (!child.isMesh) return;
    const localMat = firRootInv.clone().multiply(child.matrixWorld);
    const geo = child.geometry.clone();
    geo.applyMatrix4(localMat);
    const inst = new THREE.InstancedMesh(geo, child.material, treeMatrices.length);
    inst.castShadow = false;
    inst.receiveShadow = true;
    for (let i = 0; i < treeMatrices.length; i++) inst.setMatrixAt(i, treeMatrices[i]);
    inst.instanceMatrix.needsUpdate = true;
    inst.updateMatrix();
    inst.matrixAutoUpdate = false;
    scene.add(inst);
  });

  function scatterInstanced(model, transforms, castShadows = false) {
    if (!transforms.length) return;
    model.updateMatrixWorld(true);
    const rootInv = model.matrixWorld.clone().invert();
    model.traverse((child) => {
      if (!child.isMesh) return;
      const localMat = rootInv.clone().multiply(child.matrixWorld);
      const geo = child.geometry.clone();
      geo.applyMatrix4(localMat);
      const inst = new THREE.InstancedMesh(geo, child.material, transforms.length);
      inst.castShadow = castShadows;
      inst.receiveShadow = true;
      for (let i = 0; i < transforms.length; i++) inst.setMatrixAt(i, transforms[i]);
      inst.instanceMatrix.needsUpdate = true;
      inst.updateMatrix();
      inst.matrixAutoUpdate = false;
      scene.add(inst);
    });
  }

  // Framing boulders along the outer shoreline (dry land only)
  const boulderMats = [];
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 + 0.3;
    const bx = waterSys.basinCenter.x + Math.cos(ang) * (waterSys.basinRadiusX + 5.0);
    const bz = waterSys.basinCenter.z + Math.sin(ang) * (waterSys.basinRadiusZ + 5.0);
    dummy.position.set(bx, -0.05, bz);
    dummy.rotation.set(0, rand() * Math.PI * 2, 0);
    const s = 1.0 + rand() * 0.5;
    dummy.scale.set(s, s * 0.85, s);
    dummy.updateMatrix();
    boulderMats.push(dummy.matrix.clone());
  }
  scatterInstanced(boulderModel, boulderMats, false);

  // Fallen trunks on the eastern forest shore
  const trunkMats = [];
  for (const [alongOff, perpOff] of [[28, 7.5], [26, -7.8]]) {
    const p = entryFrame.center.clone()
      .addScaledVector(entryFrame.normal, alongOff)
      .addScaledVector(entryFrame.tangent, perpOff);
    dummy.position.set(p.x, 0, p.z);
    dummy.rotation.set(0, rand() * Math.PI * 2, 0);
    dummy.scale.set(1.05, 1.05, 1.05);
    dummy.updateMatrix();
    trunkMats.push(dummy.matrix.clone());
  }
  scatterInstanced(trunkModel, trunkMats, false);

  // Wooden barrels tucked inside select maze rooms
  const barrelMats = [];
  let rIdx = 0;
  for (const room of mazeGraph.rooms.values()) {
    rIdx++;
    if (room.key === ENTRANCE_KEY || room.key === EXIT_KEY) continue;
    if (rIdx % 3 !== 0) continue;
    const cornerAng = ((rIdx % 6) * Math.PI) / 3;
    const dist = HEX_RADIUS - 1.55;
    dummy.position.set(room.center.x + Math.cos(cornerAng) * dist, 0.02, room.center.z + Math.sin(cornerAng) * dist);
    dummy.rotation.set(0, rand() * Math.PI * 2, 0);
    const s = 0.92 + rand() * 0.16;
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    barrelMats.push(dummy.matrix.clone());
  }
  scatterInstanced(barrelModel, barrelMats, false);

  if (window.__FALLBACKS.length > 0) {
    const badge = document.getElementById('fallback-badge');
    badge.style.display = 'block';
    badge.textContent = `Fallback assets in use (${window.__FALLBACKS.length} missing)`;
    badge.onclick = () => alert('Missing assets:\n' + window.__FALLBACKS.join('\n'));
  }

  // First-person flashlight
  const torchGroup = new THREE.Group();
  torchGroup.position.set(0.28, -0.26, -0.45);
  camera.add(torchGroup);

  const torchBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.032, 0.24, 14),
    new THREE.MeshStandardMaterial({ color: 0x1e2329, roughness: 0.45, metalness: 0.8 })
  );
  torchBody.rotation.x = Math.PI / 2;
  torchGroup.add(torchBody);

  const torchLens = new THREE.Mesh(
    new THREE.CircleGeometry(0.024, 14),
    new THREE.MeshBasicMaterial({ color: 0xfff3d1 })
  );
  torchLens.position.z = -0.121;
  torchLens.rotation.y = Math.PI;
  torchGroup.add(torchLens);

  // Focused high-contrast horror flashlight beam — sole illumination in pitch darkness
  const spotMain = new THREE.SpotLight(0xfff2d6, 195, 44, Math.PI * 0.17, 0.56, 1.35);
  spotMain.position.set(0, 0, -0.14);
  spotMain.castShadow = true;
  spotMain.shadow.mapSize.set(512, 512);
  spotMain.shadow.camera.near = 0.2;
  spotMain.shadow.camera.far = 42;
  spotMain.shadow.bias = -0.0004;
  torchGroup.add(spotMain);
  const spotTarget = new THREE.Object3D();
  spotTarget.position.set(0, -0.25, -10);
  torchGroup.add(spotTarget);
  spotMain.target = spotTarget;

  const spotSpill = new THREE.SpotLight(0xcbdcf5, 18, 16, Math.PI * 0.30, 0.85, 1.6);
  spotSpill.position.set(0, 0, -0.14);
  torchGroup.add(spotSpill);
  spotSpill.target = spotTarget;

  const nearFill = new THREE.PointLight(0xffe9c7, 1.35, 4.8, 2.0);
  nearFill.position.set(0, 0, -0.2);
  torchGroup.add(nearFill);

  let flashlightOn = true;

  // Player state
  const audio = new HorrorAudio();
  const player = {
    pos: spawnPos.clone(),
    yaw: spawnYaw,
    pitch: spawnPitch,
    radius: 0.42,
    speed: 4.4,
    sprintSpeed: 6.8,
    bobPhase: 0,
    stepTimer: 0,
    doorsOpenedCount: 0,
    health: 100,
    oxygen: 100,
    wasInWater: false,
    dead: false,
    won: false,
    shakeTime: 0,
    startTime: performance.now()
  };
  window.__PLAYER = player;

  let activePresetView = null;
  let pointerLocked = false;
  let dragging = false;
  let lastMouseX = 0, lastMouseY = 0;
  const keys = {};

  function applyPlayerCamera() {
    camera.position.copy(player.pos);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = player.yaw;
    camera.rotation.x = player.pitch;
    camera.rotation.z = 0;
    torchGroup.visible = true;
  }

  function setPresetView(v) {
    activePresetView = v;
    if (!v) {
      applyPlayerCamera();
      return;
    }
    if (v === 1) {
      activePresetView = null;
      player.pos.copy(spawnPos);
      player.yaw = spawnYaw;
      player.pitch = spawnPitch;
      applyPlayerCamera();
      return;
    }
    if (v === 2) {
      // Inside Entrance Room (11,2)
      torchGroup.visible = true;
      camera.position.set(entranceRoom.center.x + 2.2, 1.75, entranceRoom.center.z - 1.5);
      camera.lookAt(entranceRoom.center.x - 2.0, 1.5, entranceRoom.center.z + 1.5);
    } else if (v === 3) {
      // Open an unauthorized exterior water door in room (11,2) dir 2 (SE) to inspect deep water outside!
      const waterDoor = doors.find((d) => d.roomA === ENTRANCE_KEY && d.doorRole === 'water');
      if (waterDoor) {
        setDoorImmediate(waterDoor, true);
        torchGroup.visible = true;
        const camPos = waterDoor.center.clone().addScaledVector(waterDoor.normal, -2.6);
        camPos.y = 1.75;
        const lookPt = waterDoor.center.clone().addScaledVector(waterDoor.normal, 12.0);
        lookPt.y = 0.0;
        camera.position.copy(camPos);
        camera.lookAt(lookPt);
      }
    } else if (v === 4) {
      // High aerial overview showing the honeycomb maze surrounded by continuous water & only 2 land causeways
      torchGroup.visible = false;
      scene.fog.density = 0.0035;
      moonLight.intensity = 1.75;
      hemiLight.intensity = 0.8;
      camera.position.set(-10, 118, 86);
      camera.lookAt(-10, 0, 4);
    } else if (v === 5) {
      // Looking straight out the designated Exit Door onto the lakeside Exit Pier & dark lake
      const exitDoor = doors.find((d) => d.doorRole === 'exit');
      if (exitDoor) {
        setDoorImmediate(exitDoor, true);
      }
      torchGroup.visible = true;
      const camPos = exitFrame.center.clone().addScaledVector(exitFrame.normal, -2.4);
      camPos.y = 1.85;
      const lookPt = exitFrame.center.clone().addScaledVector(exitFrame.normal, 18.0);
      lookPt.y = 0.4;
      camera.position.copy(camPos);
      camera.lookAt(lookPt);
    }
    if (v !== 4) {
      scene.fog.density = 0.048;
      moonLight.intensity = 0.0;
      hemiLight.intensity = 0.025;
      scene.environmentIntensity = 0.03;
    } else {
      scene.environmentIntensity = 0.65;
    }
  }

  const raycaster = new THREE.Raycaster();
  const _rcCenter = new THREE.Vector2(0, 0);
  const _rcFwd = new THREE.Vector3();
  const _rcToD = new THREE.Vector3();
  const _nearLeaves = [];
  let targetedDoor = null;

  function findTargetedDoor() {
    _nearLeaves.length = 0;
    const cx = camera.position.x;
    const cz = camera.position.z;
    for (let i = 0; i < doors.length; i++) {
      const d = doors[i];
      const dx = d.center.x - cx;
      const dz = d.center.z - cz;
      if (dx * dx + dz * dz <= 20.25) _nearLeaves.push(d.leaf);
    }
    if (_nearLeaves.length === 0) return null;

    raycaster.setFromCamera(_rcCenter, camera);
    raycaster.far = 4.2;
    const hits = raycaster.intersectObjects(_nearLeaves, false);
    if (hits.length > 0 && hits[0].object.userData.doorRef) {
      return hits[0].object.userData.doorRef;
    }
    _rcFwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
    let best = null, bestScore = 0.65;
    for (let i = 0; i < _nearLeaves.length; i++) {
      const d = _nearLeaves[i].userData.doorRef;
      _rcToD.subVectors(d.center, camera.position);
      const dist = _rcToD.length();
      if (dist > 3.6 || dist < 1e-4) continue;
      const dot = _rcToD.multiplyScalar(1 / dist).dot(_rcFwd);
      if (dot > bestScore) { bestScore = dot; best = d; }
    }
    return best;
  }

  function toggleDoor(d) {
    if (!d) return;
    d.open = !d.open;
    if (d.open) player.doorsOpenedCount++;
    const col = d.open ? 0x4ade80 : d.closedHex;
    d.indMat.color.setHex(col);
    d.indMat.emissive.setHex(col);
  }

  const overlay = document.getElementById('overlay');
  const startBtn = document.getElementById('start-btn');
  const crosshair = document.getElementById('crosshair');
  const interactPrompt = document.getElementById('interact-prompt');
  const minimapWrap = document.getElementById('minimap-wrap');
  const minimapCanvas = document.getElementById('minimap-canvas');
  const mmCtx = minimapCanvas.getContext('2d');
  const statsBox = document.getElementById('stats-box');
  const damageFlash = document.getElementById('damage-flash');
  const waterWarning = document.getElementById('water-warning');
  const hudHealth = document.getElementById('hud-health');
  const hudOxygen = document.getElementById('hud-oxygen');
  let showStats = false;
  let showMinimap = false;

  startBtn.disabled = false;
  startBtn.textContent = 'Enter the Forest';
  startBtn.addEventListener('click', () => {
    audio.init();
    overlay.style.display = 'none';
    if (player.dead || player.won) resetGame();
    renderer.domElement.requestPointerLock?.();
  });

  document.addEventListener('pointerlockchange', () => {
    pointerLocked = document.pointerLockElement === renderer.domElement;
  });

  renderer.domElement.addEventListener('mousedown', (e) => {
    audio.init();
    if (e.button === 0) {
      if (targetedDoor && !activePresetView) toggleDoor(targetedDoor);
      if (!pointerLocked && overlay.style.display === 'none') {
        dragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
      }
    }
  });
  window.addEventListener('mouseup', () => { dragging = false; });
  window.addEventListener('mousemove', (e) => {
    if (activePresetView || overlay.style.display !== 'none') return;
    if (pointerLocked) {
      player.yaw -= e.movementX * 0.0022;
      player.pitch = Math.max(-1.25, Math.min(1.25, player.pitch - e.movementY * 0.0022));
    } else if (dragging) {
      const dx = e.clientX - lastMouseX;
      const dy = e.clientY - lastMouseY;
      lastMouseX = e.clientX; lastMouseY = e.clientY;
      player.yaw -= dx * 0.004;
      player.pitch = Math.max(-1.25, Math.min(1.25, player.pitch - dy * 0.004));
    }
  });

  function triggerDeath(reason) {
    if (player.dead) return;
    player.dead = true;
    waterWarning.style.display = 'none';
    document.exitPointerLock?.();
    document.getElementById('overlay-content').innerHTML = `
      <h1 style="color:#f87171;">Claimed by the Water</h1>
      <p>${reason}</p>
      <button class="btn" id="retry-btn" style="background:#dc2626;">Try Again</button>
    `;
    overlay.style.display = 'flex';
    document.getElementById('retry-btn').onclick = () => {
      overlay.style.display = 'none';
      resetGame();
      renderer.domElement.requestPointerLock?.();
    };
  }

  function resetGame() {
    player.pos.copy(spawnPos);
    player.yaw = spawnYaw;
    player.pitch = spawnPitch;
    player.health = 100;
    player.oxygen = 100;
    player.wasInWater = false;
    player.dead = false;
    player.won = false;
    player.shakeTime = 0;
    player.doorsOpenedCount = 0;
    player.startTime = performance.now();
    hudHealth.textContent = '100%';
    hudOxygen.textContent = '100%';
    damageFlash.style.opacity = '0';
    waterWarning.style.display = 'none';
    for (const r of mazeGraph.rooms.values()) r.visited = false;
    for (const d of doors) {
      setDoorImmediate(d, false, audio);
    }
    aiDirector.reset();
    setPresetView(null);
  }

  window.addEventListener('pointerdown', () => audio.init(), { passive: true });
  window.addEventListener('keydown', (e) => {
    audio.init();
    keys[e.code] = true;
    if (e.code === 'KeyE') {
      audio.init();
      toggleDoor(targetedDoor);
    } else if (e.code === 'KeyF') {
      audio.init();
      flashlightOn = !flashlightOn;
      audio.playFlashlightClick();
      document.getElementById('hud-light').textContent = flashlightOn ? 'ON' : 'OFF';
    } else if (e.code === 'KeyM') {
      showMinimap = !showMinimap;
      minimapWrap.style.display = showMinimap ? 'block' : 'none';
    } else if (e.code === 'KeyP') {
      postFxEnabled = !postFxEnabled;
    } else if (e.code === 'KeyR') {
      overlay.style.display = 'none';
      resetGame();
    } else if (e.code === 'Digit0') {
      setPresetView(null);
    } else if (e.code >= 'Digit1' && e.code <= 'Digit5') {
      setPresetView(parseInt(e.code.slice(-1), 10));
    } else if (e.code === 'Backquote') {
      showStats = !showStats;
      statsBox.style.display = showStats ? 'block' : 'none';
    }
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  });

  function drawMinimap() {
    if (!showMinimap) return;
    mmCtx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);
    const scale = 1.15;
    const ox = minimapCanvas.width * 0.54;
    const oy = minimapCanvas.height * 0.48;

    // Continuous water moat & western lake
    mmCtx.fillStyle = 'rgba(14, 58, 78, 0.55)';
    mmCtx.beginPath();
    mmCtx.ellipse(
      ox + waterSys.basinCenter.x * scale,
      oy + waterSys.basinCenter.z * scale,
      waterSys.basinRadiusX * scale,
      waterSys.basinRadiusZ * scale,
      0, 0, Math.PI * 2
    );
    mmCtx.fill();

    for (const room of mazeGraph.rooms.values()) {
      if (!room.visited && room.key !== ENTRANCE_KEY) continue;
      const sx = ox + room.center.x * scale;
      const sy = oy + room.center.z * scale;
      mmCtx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const px = sx + Math.cos(a) * HEX_RADIUS * scale * 0.94;
        const py = sy + Math.sin(a) * HEX_RADIUS * scale * 0.94;
        if (i === 0) mmCtx.moveTo(px, py);
        else mmCtx.lineTo(px, py);
      }
      mmCtx.closePath();
      mmCtx.fillStyle = room.key === EXIT_KEY ? 'rgba(46,230,85,0.55)' : 'rgba(148,163,184,0.22)';
      mmCtx.fill();
      mmCtx.strokeStyle = '#' + room.color.toString(16).padStart(6, '0');
      mmCtx.lineWidth = 1.2;
      mmCtx.stroke();
    }

    const px = ox + player.pos.x * scale;
    const py = oy + player.pos.z * scale;
    mmCtx.fillStyle = '#fde047';
    mmCtx.beginPath();
    mmCtx.arc(px, py, 3.2, 0, Math.PI * 2);
    mmCtx.fill();
    mmCtx.strokeStyle = '#fde047';
    mmCtx.lineWidth = 1.5;
    mmCtx.beginPath();
    mmCtx.moveTo(px, py);
    mmCtx.lineTo(px - Math.sin(player.yaw) * 9, py - Math.cos(player.yaw) * 9);
    mmCtx.stroke();
  }

  if (initialView) setPresetView(initialView);
  else applyPlayerCamera();

  const hudZone = document.getElementById('hud-zone');
  const hudRooms = document.getElementById('hud-rooms');
  const hudDoors = document.getElementById('hud-doors');

  const clock = new THREE.Clock();
  let fpsFrames = 0, fpsAccum = 0, currentFps = 60;

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    const elapsed = clock.elapsedTime;

    const isAerialView = activePresetView === 4;
    updateDoors(doors, dt, audio, camera.position, isAerialView);

    entranceGlow.intensity = 1.6 + Math.sin(elapsed * 7.3) * 0.25 + Math.sin(elapsed * 19.1) * 0.15;
    const flicker = flashlightOn ? (1.0 - (Math.sin(elapsed * 37) > 0.985 ? 0.26 : 0)) : 0;
    spotMain.intensity = 195 * flicker;
    spotSpill.intensity = 18 * flicker;
    nearFill.intensity = 1.35 * flicker;
    torchLens.material.color.setHex(flashlightOn ? 0xfff3d1 : 0x1e293b);

    // Update continuous water waves & crocodile predators (with distance culling)
    const waterState = waterSys.update(
      dt,
      player.pos,
      () => {
        if (player.dead || player.won || activePresetView || overlay.style.display !== 'none') return;
        audio.playCrocBite();
        player.health = Math.max(0, player.health - 50);
        player.shakeTime = 0.45;
        hudHealth.textContent = `${Math.round(player.health)}%`;
        damageFlash.style.opacity = '0.95';
        setTimeout(() => { damageFlash.style.opacity = '0'; }, 360);
        if (player.health <= 0) {
          triggerDeath('A crocodile dragged you under the dark water surrounding the maze. Only the Entry and Exit doors connect to solid ground.');
        }
      },
      () => {
        if (!player.dead && !activePresetView) audio.playCrocGrowl();
      },
      camera.position,
      isAerialView
    );

    // Sync 3D directional AudioListener to player's head every frame
    audio.updateListener(player.pos, player.yaw, player.pitch);

    // Update Horror AI Director (vision/LOS, territories, 7-state FSM, strict single-chaser exclusivity)
    const aiActive = !activePresetView && overlay.style.display === 'none' && !player.dead && !player.won;
    let closestMonsterDist = 999;
    let anyMonsterChasing = false;
    if (aiActive) {
      const aiTelemetry = aiDirector.update(dt, player.pos, flashlightOn, {
        onStep: (monster, dist, chasing) => audio.playMonsterStep(monster.audioProfile, monster.root.position, chasing),
        onGrowl: (monster, dist, chasing) => audio.playMonsterVocal(monster.audioProfile, monster.root.position, chasing),
        onVoiceLine: (monster, dist) => audio.playMonsterVoiceLine(monster.audioProfile, monster.root.position, dist),
        onSpotPlayer: (monster, dist) => {
          audio.playMonsterVocal(monster.audioProfile, monster.root.position, true);
          if (dist < 18) audio.playPlayerGasp(0.85);
        },
        onOpenDoor: (door, dist) => {
          if (!door.open) {
            door.open = true;
            door.indMat.color.setHex(0x4ade80);
            door.indMat.emissive.setHex(0x4ade80);
            if (dist < 12) audio.playPlayerGasp(0.55);
          }
        },
        onAttack: (attacker) => {
          audio.playMonsterAttack(attacker.audioProfile, attacker.root.position);
          player.health = Math.max(0, player.health - attacker.damage);
          player.shakeTime = 0.5;
          hudHealth.textContent = `${Math.round(player.health)}%`;
          damageFlash.style.opacity = '0.95';
          setTimeout(() => { damageFlash.style.opacity = '0'; }, 380);
          if (player.health <= 0) {
            triggerDeath(attacker.deathMessage);
          }
        }
      });
      closestMonsterDist = aiTelemetry.closestMonsterDist;
      anyMonsterChasing = aiTelemetry.anyMonsterChasing;
    } else {
      for (let i = 0; i < monsters.length; i++) monsters[i].mixer.update(dt);
    }

    if (!activePresetView && overlay.style.display === 'none' && !player.dead && !player.won) {
      if (waterState.inWater && !player.wasInWater) {
        audio.playWaterSplash(true);
      }
      player.wasInWater = waterState.inWater;

      // Oxygen / drowning survival in deep water
      if (waterState.inWater) {
        player.oxygen = Math.max(0, player.oxygen - dt * 8.5);
        if (player.oxygen <= 0) {
          player.health = Math.max(0, player.health - dt * 18);
          damageFlash.style.opacity = '0.45';
          if (player.health <= 0) {
            triggerDeath('You drowned in the freezing dark water surrounding the honeycomb maze.');
          }
        }
      } else {
        player.oxygen = Math.min(100, player.oxygen + dt * 25);
        if (player.shakeTime <= 0) damageFlash.style.opacity = '0';
      }
      hudHealth.textContent = `${Math.round(player.health)}%`;
      hudOxygen.textContent = `${Math.round(player.oxygen)}%`;

      let moveF = 0, moveR = 0;
      if (keys['KeyW'] || keys['ArrowUp']) moveF += 1;
      if (keys['KeyS'] || keys['ArrowDown']) moveF -= 1;
      if (keys['KeyD'] || keys['ArrowRight']) moveR += 1;
      if (keys['KeyA'] || keys['ArrowLeft']) moveR -= 1;

      const sprinting = !!(keys['ShiftLeft'] || keys['ShiftRight']);
      const waterSlow = waterState.inWater ? 0.38 : 1.0;
      const curSpeed = (sprinting ? player.sprintSpeed : player.speed) * waterSlow;
      const moving = moveF !== 0 || moveR !== 0;

      if (moving) {
        const len = Math.hypot(moveF, moveR);
        moveF /= len; moveR /= len;
        const sinY = Math.sin(player.yaw);
        const cosY = Math.cos(player.yaw);
        const vx = (-sinY * moveF + cosY * moveR) * curSpeed * dt;
        const vz = (-cosY * moveF - sinY * moveR) * curSpeed * dt;

        player.pos.x += vx;
        player.pos.z += vz;

        resolvePlayerCollisions(player.pos, player.radius, colliders);

        for (let i = 0; i < treeColliders.length; i++) {
          const tc = treeColliders[i];
          const dx = player.pos.x - tc.x;
          const dz = player.pos.z - tc.z;
          const minD = player.radius + tc.r;
          const d2 = dx * dx + dz * dz;
          if (d2 < minD * minD && d2 > 1e-6) {
            const dist = Math.sqrt(d2);
            player.pos.x = tc.x + (dx / dist) * minD;
            player.pos.z = tc.z + (dz / dist) * minD;
          }
        }

        // World outer forest boundary clamp
        player.pos.x = Math.max(-135, Math.min(115, player.pos.x));
        player.pos.z = Math.max(-95, Math.min(100, player.pos.z));

        player.bobPhase += dt * (sprinting ? 12.5 : 8.5) * (waterState.inWater ? 0.6 : 1.0);
        player.stepTimer -= dt;
        if (player.stepTimer <= 0) {
          player.stepTimer = (sprinting ? 0.34 : 0.48) / (waterState.inWater ? 0.65 : 1.0);
          if (waterState.inWater) audio.playWaterSplash(false);
          else audio.playFootstep(!!findRoomAt(player.pos.x, player.pos.z, mazeGraph), sprinting);
        }
      } else {
        player.bobPhase += dt * 1.6;
      }

      const targetEyeY = waterState.inWater ? 0.44 : 1.7;
      const bobAmt = waterState.inWater ? 0.075 : (moving ? 0.045 : 0.008);
      player.pos.y += (targetEyeY + Math.sin(player.bobPhase) * bobAmt - player.pos.y) * Math.min(1, dt * 8);

      torchGroup.position.x = 0.28 + Math.cos(player.bobPhase * 0.5) * (moving ? 0.015 : 0.003);
      torchGroup.position.y = -0.26 + Math.abs(Math.sin(player.bobPhase * 0.5)) * (moving ? 0.018 : 0.004);

      applyPlayerCamera();
      if (player.shakeTime > 0) {
        player.shakeTime = Math.max(0, player.shakeTime - dt);
        camera.rotation.z = (Math.random() - 0.5) * 0.16 * (player.shakeTime / 0.45);
      }

      waterWarning.style.display = (waterState.inWater && !cleanMode) ? 'block' : 'none';

      // Escape victory when reaching the end of the designated Exit Pier beyond the Exit Door
      if (waterState.escapedAtExit && !player.won) {
        player.won = true;
        document.exitPointerLock?.();
        const secs = Math.round((performance.now() - player.startTime) / 1000);
        let visitedCount = 0;
        for (const r of mazeGraph.rooms.values()) if (r.visited) visitedCount++;
        document.getElementById('overlay-content').innerHTML = `
          <h1>Escaped!</h1>
          <p>You crossed the water-locked honeycomb maze and reached the western Exit Pier in <strong>${secs}s</strong>, exploring <strong>${visitedCount} / 41</strong> rooms and opening <strong>${player.doorsOpenedCount}</strong> doors.</p>
          <button class="btn" id="replay-btn">Play Again</button>
        `;
        overlay.style.display = 'flex';
        document.getElementById('replay-btn').onclick = () => {
          overlay.style.display = 'none';
          resetGame();
          renderer.domElement.requestPointerLock?.();
        };
      }

      const room = findRoomAt(player.pos.x, player.pos.z, mazeGraph);
      const nearWater = !room || waterSys.isOnEntryCauseway(player.pos.x, player.pos.z) || waterSys.isOnExitPier(player.pos.x, player.pos.z);
      audio.update(dt, {
        insideMaze: !!room,
        inWater: waterState.inWater,
        nearWater,
        flashlightOn,
        closestMonsterDist,
        anyMonsterChasing,
        playerHealth: player.health
      });
      if (room) {
        room.visited = true;
        if (room.key === EXIT_KEY) hudZone.textContent = 'Exit Chamber (Open Exit Door -> Pier)';
        else if (room.key === ENTRANCE_KEY) hudZone.textContent = 'Entrance Chamber (11,2)';
        else hudZone.textContent = room.zone.charAt(0).toUpperCase() + room.zone.slice(1) + ` Chamber (${room.key})`;
      } else if (waterState.inWater) {
        hudZone.textContent = 'Deep Water — DANGER!';
      } else if (waterSys.isOnEntryCauseway(player.pos.x, player.pos.z)) {
        hudZone.textContent = 'Entry Causeway (Forest)';
      } else if (waterSys.isOnExitPier(player.pos.x, player.pos.z)) {
        hudZone.textContent = 'Western Exit Pier (Lake)';
      } else {
        hudZone.textContent = 'Outer Dark Forest';
      }

      let visitedCount = 0;
      for (const r of mazeGraph.rooms.values()) if (r.visited) visitedCount++;
      hudRooms.textContent = `${visitedCount} / ${mazeGraph.rooms.size}`;
      hudDoors.textContent = String(player.doorsOpenedCount);

      targetedDoor = findTargetedDoor();
      if (targetedDoor && !cleanMode) {
        crosshair.classList.add('active');
        interactPrompt.style.display = 'block';
        const roleTag = targetedDoor.doorRole === 'entry'
          ? ' (Entry Door)'
          : targetedDoor.doorRole === 'exit'
            ? ' (Exit Door)'
            : '';
        interactPrompt.textContent = (targetedDoor.open ? '[E] Close Door' : '[E] Open Door') + roleTag;
      } else {
        crosshair.classList.remove('active');
        interactPrompt.style.display = 'none';
      }

      drawMinimap();
    }

    renderer.info.reset();
    if (postFxEnabled) composer.render();
    else renderer.render(scene, camera);

    fpsFrames++;
    fpsAccum += dt;
    if (fpsAccum >= 0.5) {
      currentFps = Math.round(fpsFrames / fpsAccum);
      fpsFrames = 0; fpsAccum = 0;
      if (showStats) {
        const dbg = aiDirector.getDebugState();
        const hunterTag = dbg.activeHunter ? `Hunter: ${dbg.activeHunter}` : 'Hunter: none';
        const statesStr = dbg.monsters.map((m) => `${m.name.slice(0, 5)}:${m.state}`).join(' ');
        statsBox.textContent = `FPS: ${currentFps} | Calls: ${renderer.info.render.calls} | ${hunterTag} | ${statesStr}`;
      }
    }
  }

  // Pre-compile all WebGL shaders & upload textures once on startup so mid-game never hitches
  renderer.compile(scene, camera);
  renderer.info.reset();
  if (postFxEnabled) composer.render();
  else renderer.render(scene, camera);
  window.__READY = true;
  animate();
}

init().catch((err) => {
  console.error('Fatal init error:', err);
  const box = document.getElementById('overlay-content');
  if (box) {
    box.innerHTML = `<h1 style="color:#f87171;">Load Error</h1><p>${String(err?.message || err)}</p>`;
  }
});
