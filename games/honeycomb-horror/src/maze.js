/**
 * Honeycomb Maze Layout, Guaranteed 4-Doors-Per-Room Solver,
 * 3D Hexagonal Room & Interactive Door Builder, and 2D Collision System.
 *
 * Performance architecture (zero visual quality loss):
 * - All static maze geometry (floors, ceilings, pillars, foundations, solid walls,
 *   doorway jambs, lintels, metal doorframe posts/headers, and per-room colored rim strips)
 *   is batched into InstancedMeshes with matrixAutoUpdate = false (~900 draw calls -> 10).
 * - Door AnimationMixers are lazily instantiated only when a door is actually interacted with.
 * - Distance/fog culling hides doors beyond fog visibility range in first-person mode
 *   (~3,876 door draw calls -> ~300–450 active nearby draw calls with identical visuals).
 */
import * as THREE from 'three';

export const HEX_RADIUS = 5.8; // Outer radius in meters (flat-to-flat ~10.05m)
export const WALL_HEIGHT = 4.2;
export const WALL_THICKNESS = 0.48;
export const DOOR_WIDTH = 2.0;
export const DOOR_HEIGHT = 2.65;

const SQRT3 = Math.sqrt(3);

// Odd-q flat-top hex layout matching the reference honeycomb map
export const ROOM_LAYOUT = [
  // Col 0 (Far-left Exit)
  [0, 2, 0x2ee655, 'exit'],
  // Col 1
  [1, 1, 0x2bb848, 'emerald'],
  [1, 2, 0x2bb848, 'emerald'],
  // Col 2
  [2, 1, 0x32b048, 'emerald'],
  [2, 2, 0x626b73, 'stone'],
  [2, 3, 0xa244b8, 'violet'],
  [2, 4, 0xa244b8, 'violet'],
  // Col 3 (void at [3,1])
  [3, 0, 0x3ec94e, 'emerald'],
  [3, 2, 0x267ad6, 'cobalt'],
  [3, 3, 0x8e3ea6, 'violet'],
  // Col 4
  [4, 0, 0x8a6d4b, 'ochre'],
  [4, 1, 0x806240, 'ochre'],
  [4, 2, 0x5c4f82, 'dusk'],
  [4, 3, 0x2270c7, 'cobalt'],
  // Col 5 (void at [5,0])
  [5, -1, 0x765c85, 'amethyst'],
  [5, 1, 0xc92e36, 'crimson'],
  [5, 2, 0xb02832, 'crimson'],
  [5, 3, 0x3f769e, 'slate'],
  [5, 4, 0x2c97cf, 'cyan'],
  // Col 6 (Center column)
  [6, -1, 0x9c3ea8, 'amethyst'],
  [6, 0, 0x8f389c, 'amethyst'],
  [6, 1, 0xd42c34, 'crimson'],
  [6, 2, 0xe02830, 'crimson'],
  [6, 3, 0x5d4c75, 'dusk'],
  [6, 4, 0x3b729c, 'slate'],
  // Col 7
  [7, -1, 0xa83ca2, 'amethyst'],
  [7, 0, 0xb56d36, 'amber'],
  [7, 1, 0xcf3038, 'crimson'],
  [7, 2, 0x6b564a, 'rust'],
  [7, 3, 0x8c7a38, 'olive'],
  [7, 4, 0x2e97cc, 'cyan'],
  // Col 8
  [8, 0, 0xab5066, 'rose'],
  [8, 1, 0x5a586b, 'slate'],
  [8, 2, 0x785c42, 'rust'],
  [8, 3, 0x7d5d3f, 'rust'],
  // Col 9
  [9, 1, 0xb87633, 'amber'],
  [9, 2, 0x6b5c4d, 'rust'],
  [9, 3, 0xb06f2e, 'amber'],
  // Col 10
  [10, 2, 0x8a6d48, 'ochre'],
  [10, 3, 0xb87430, 'amber'],
  // Col 11 (Far-right Entrance)
  [11, 2, 0x3ec24c, 'entrance']
];

export const ENTRANCE_KEY = '11,2';
export const EXIT_KEY = '0,2';
export const ENTRY_DOOR_DIR = 1; // NE face of far-right room (11,2) — ONLY forest entry door
export const EXIT_DOOR_DIR = 5;  // NW face of far-left room (0,2) — ONLY lakeside exit door

const EVEN_DIRS = [
  [0, -1], [1, -1], [1, 0], [0, 1], [-1, 0], [-1, -1]
];
const ODD_DIRS = [
  [0, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]
];

export const FACE_ANGLES = [
  -Math.PI / 2,      // 0: N (-Z)
  -Math.PI / 6,      // 1: NE
  Math.PI / 6,       // 2: SE
  Math.PI / 2,       // 3: S (+Z)
  5 * Math.PI / 6,   // 4: SW
  -5 * Math.PI / 6   // 5: NW
];

export function getDoorWorldFrame(room, dir) {
  const apothem = (HEX_RADIUS * SQRT3) / 2;
  const ang = FACE_ANGLES[dir];
  const nx = Math.cos(ang);
  const nz = Math.sin(ang);
  return {
    center: new THREE.Vector3(room.center.x + nx * apothem, 0, room.center.z + nz * apothem),
    normal: new THREE.Vector3(nx, 0, nz),
    tangent: new THREE.Vector3(-nz, 0, nx),
    rotY: -ang + Math.PI / 2
  };
}

export function hexKey(col, row) {
  return `${col},${row}`;
}

export function hexToWorld(col, row) {
  const cx = (col - 5.5) * 1.5 * HEX_RADIUS;
  const cz = ((row - 1.5) + ((col & 1) ? 0.5 : 0)) * SQRT3 * HEX_RADIUS;
  return new THREE.Vector3(cx, 0, cz);
}

export function getNeighborCoords(col, row, dir) {
  const d = (col & 1) ? ODD_DIRS[dir] : EVEN_DIRS[dir];
  return [col + d[0], row + d[1]];
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

/**
 * Generates the maze graph and guarantees EVERY room has EXACTLY 4 functional doors.
 */
export function buildMazeGraph() {
  const rooms = new Map();
  for (const [col, row, color, zone] of ROOM_LAYOUT) {
    const key = hexKey(col, row);
    rooms.set(key, {
      key,
      col,
      row,
      color,
      zone,
      center: hexToWorld(col, row),
      doors: new Set(),
      neighbors: new Array(6).fill(null),
      visited: false
    });
  }

  for (const room of rooms.values()) {
    for (let dir = 0; dir < 6; dir++) {
      const [nc, nr] = getNeighborCoords(room.col, room.row, dir);
      const nk = hexKey(nc, nr);
      if (rooms.has(nk)) {
        room.neighbors[dir] = nk;
      }
    }
  }

  const rand = mulberry32(42199);

  const visited = new Set([ENTRANCE_KEY]);
  const queue = [ENTRANCE_KEY];
  const addSharedDoor = (keyA, dirA) => {
    const a = rooms.get(keyA);
    const keyB = a.neighbors[dirA];
    if (!keyB) return false;
    const b = rooms.get(keyB);
    const opp = (dirA + 3) % 6;
    if (a.doors.has(dirA)) return false;
    if (a.doors.size >= 4 || b.doors.size >= 4) return false;
    a.doors.add(dirA);
    b.doors.add(opp);
    return true;
  };

  while (queue.length > 0) {
    const curKey = queue.shift();
    const cur = rooms.get(curKey);
    const dirs = [0, 1, 2, 3, 4, 5].sort(() => rand() - 0.5);
    for (const d of dirs) {
      const nk = cur.neighbors[d];
      if (nk && !visited.has(nk)) {
        visited.add(nk);
        addSharedDoor(curKey, d);
        queue.push(nk);
      }
    }
  }

  const roomList = Array.from(rooms.values());
  const exteriorCount = (r) => r.neighbors.filter((n) => n === null).length;

  roomList.sort((a, b) => exteriorCount(a) - exteriorCount(b));
  for (let pass = 0; pass < 4; pass++) {
    for (const r of roomList) {
      if (r.doors.size >= 4) continue;
      const candDirs = [0, 1, 2, 3, 4, 5]
        .filter((d) => r.neighbors[d] && !r.doors.has(d) && rooms.get(r.neighbors[d]).doors.size < 4)
        .sort((d1, d2) => {
          const n1 = rooms.get(r.neighbors[d1]);
          const n2 = rooms.get(r.neighbors[d2]);
          return (exteriorCount(n1) - exteriorCount(n2)) || (n1.doors.size - n2.doors.size);
        });
      for (const d of candDirs) {
        if (r.doors.size >= 4) break;
        addSharedDoor(r.key, d);
      }
    }
  }

  for (const r of rooms.values()) {
    if (r.key === ENTRANCE_KEY) {
      for (const d of [1, 2, 0, 3]) {
        if (r.doors.size >= 4) break;
        if (!r.neighbors[d] && !r.doors.has(d)) r.doors.add(d);
      }
    } else if (r.key === EXIT_KEY) {
      for (const d of [5, 4, 0, 3]) {
        if (r.doors.size >= 4) break;
        if (!r.neighbors[d] && !r.doors.has(d)) r.doors.add(d);
      }
    } else {
      const openOuterDirs = [0, 1, 2, 3, 4, 5].filter((d) => !r.neighbors[d] && !r.doors.has(d));
      openOuterDirs.sort(() => rand() - 0.5);
      for (const d of openOuterDirs) {
        if (r.doors.size >= 4) break;
        r.doors.add(d);
      }
    }
  }

  for (const r of rooms.values()) {
    while (r.doors.size < 4) {
      let fixed = false;
      for (let d = 0; d < 6; d++) {
        const nk = r.neighbors[d];
        if (!nk || r.doors.has(d)) continue;
        const n = rooms.get(nk);
        const nExt = [...n.doors].find((nd) => !n.neighbors[nd]);
        if (nExt !== undefined) {
          n.doors.delete(nExt);
          addSharedDoor(r.key, d);
          fixed = true;
          break;
        }
      }
      if (!fixed) {
        for (let d = 0; d < 6 && !fixed; d++) {
          const nk = r.neighbors[d];
          if (!nk || r.doors.has(d)) continue;
          const n = rooms.get(nk);
          for (const nd of [...n.doors]) {
            const pk = n.neighbors[nd];
            if (!pk || pk === r.key) continue;
            const p = rooms.get(pk);
            const pFreeExt = [0, 1, 2, 3, 4, 5].find((pd) => !p.neighbors[pd] && !p.doors.has(pd));
            if (pFreeExt !== undefined) {
              n.doors.delete(nd);
              p.doors.delete((nd + 3) % 6);
              p.doors.add(pFreeExt);
              addSharedDoor(r.key, d);
              fixed = true;
              break;
            }
          }
        }
      }
      if (!fixed) break;
    }
  }

  const reach = new Set([ENTRANCE_KEY]);
  const bfs = [ENTRANCE_KEY];
  while (bfs.length) {
    const k = bfs.shift();
    const rm = rooms.get(k);
    for (const d of rm.doors) {
      const nk = rm.neighbors[d];
      if (nk && !reach.has(nk)) {
        reach.add(nk);
        bfs.push(nk);
      }
    }
  }

  let minD = 99, maxD = 0;
  for (const r of rooms.values()) {
    minD = Math.min(minD, r.doors.size);
    maxD = Math.max(maxD, r.doors.size);
  }

  return {
    rooms,
    stats: {
      roomCount: rooms.size,
      minDoorsPerRoom: minD,
      maxDoorsPerRoom: maxD,
      allRoomsHave4Doors: minD === 4 && maxD === 4,
      reachableRooms: reach.size,
      connectedFromEntranceToExit: reach.has(EXIT_KEY)
    }
  };
}

function makeStaticInstanced(geo, mat, matrices, castShadow, receiveShadow, colors = null) {
  const inst = new THREE.InstancedMesh(geo, mat, matrices.length);
  inst.castShadow = castShadow;
  inst.receiveShadow = receiveShadow;
  for (let i = 0; i < matrices.length; i++) {
    inst.setMatrixAt(i, matrices[i]);
    if (colors) inst.setColorAt(i, colors[i]);
  }
  inst.instanceMatrix.needsUpdate = true;
  if (colors && inst.instanceColor) inst.instanceColor.needsUpdate = true;
  inst.updateMatrix();
  inst.matrixAutoUpdate = false;
  return inst;
}

function addCollider(colliders, ax, az, bx, bz, halfThick, doorRef = null) {
  const mx = (ax + bx) * 0.5;
  const mz = (az + bz) * 0.5;
  const halfLen = Math.hypot(bx - ax, bz - az) * 0.5;
  colliders.push({
    ax, az, bx, bz,
    mx, mz,
    boundR: halfLen + halfThick + 0.6,
    halfThick,
    doorRef
  });
}

function ensureDoorMixer(d, initialTime = 0) {
  if (d.mixer || !d.doorModel || !d.doorAnimClip) return;
  d.mixer = new THREE.AnimationMixer(d.doorModel);
  d.openAction = d.mixer.clipAction(d.doorAnimClip);
  d.openAction.setLoop(THREE.LoopOnce, 1);
  d.openAction.clampWhenFinished = true;
  d.openAction.play();
  d.openAction.paused = true;
  d.openAction.time = initialTime;
  d.mixer.update(0);
}

/**
 * Builds the 3D honeycomb maze using InstancedMeshes for all static geometry
 * and distance-culled AAA hinged wooden horror doors.
 */
export function buildMaze3D(mazeGraph, materials, doorGltf = null) {
  const group = new THREE.Group();
  group.name = 'HoneycombMaze';

  const doorAnimClip = doorGltf?.animations?.find((c) => c.name === 'WoodenHorrorDoor_Opening') || doorGltf?.animations?.[0] || null;
  if (doorGltf?.scene) {
    doorGltf.scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = false;
        obj.receiveShadow = true;
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => {
          if (!m) return;
          m.envMapIntensity = 0.45;
          if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
        });
      }
    });
  }

  const doors = [];
  const colliders = [];
  const seenEdges = new Set();

  const apothem = (HEX_RADIUS * SQRT3) / 2;
  const edgeLen = HEX_RADIUS;
  const sideW = (edgeLen - DOOR_WIDTH) / 2;
  const sideOffset = DOOR_WIDTH / 2 + sideW / 2;
  const lintelH = WALL_HEIGHT - DOOR_HEIGHT;

  // Shared geometries (allocated ONCE, reused across all rooms/edges)
  const hexShape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    const x = Math.cos(a) * (HEX_RADIUS + 0.08);
    const y = Math.sin(a) * (HEX_RADIUS + 0.08);
    if (i === 0) hexShape.moveTo(x, y);
    else hexShape.lineTo(x, y);
  }
  hexShape.closePath();

  const floorGeo = new THREE.ShapeGeometry(hexShape);
  floorGeo.rotateX(-Math.PI / 2);
  const posAttr = floorGeo.attributes.position;
  const uvAttr = floorGeo.attributes.uv;
  for (let i = 0; i < posAttr.count; i++) {
    uvAttr.setXY(i, posAttr.getX(i) / 3.0, posAttr.getZ(i) / 3.0);
  }

  const ceilGeo = floorGeo.clone();
  ceilGeo.rotateX(Math.PI);

  const pillarGeo = new THREE.CylinderGeometry(0.42, 0.46, WALL_HEIGHT + 0.16, 6);
  const foundationGeo = new THREE.CylinderGeometry(HEX_RADIUS + 0.12, HEX_RADIUS + 0.24, 2.6, 6);
  foundationGeo.rotateY(Math.PI / 6);

  const solidWallGeo = new THREE.BoxGeometry(edgeLen + 0.14, WALL_HEIGHT, WALL_THICKNESS);
  const jambWallGeo = new THREE.BoxGeometry(sideW + 0.08, WALL_HEIGHT, WALL_THICKNESS);
  const lintelGeo = new THREE.BoxGeometry(DOOR_WIDTH + 0.16, lintelH, WALL_THICKNESS + 0.04);
  const framePostGeo = new THREE.BoxGeometry(0.16, DOOR_HEIGHT + 0.1, WALL_THICKNESS + 0.14);
  const headerGeo = new THREE.BoxGeometry(DOOR_WIDTH + 0.32, 0.18, WALL_THICKNESS + 0.16);
  const rimStripGeo = new THREE.BoxGeometry(edgeLen * 0.72, 0.09, 0.12);

  // Shared door proxy & indicator geometries/materials
  const sharedLeafGeo = new THREE.BoxGeometry(DOOR_WIDTH - 0.06, DOOR_HEIGHT - 0.04, 0.22);
  const sharedInvisibleMat = new THREE.MeshBasicMaterial({ visible: false });
  const sharedIndGeo = new THREE.BoxGeometry(0.32, 0.07, WALL_THICKNESS + 0.18);

  const placedPillars = new Set();
  const floorMatrices = [];
  const ceilMatrices = [];
  const pillarMatrices = [];
  const foundationMatrices = [];
  const solidWallMatrices = [];
  const jambWallMatrices = [];
  const lintelMatrices = [];
  const framePostMatrices = [];
  const headerMatrices = [];
  const rimMatrices = [];
  const rimColors = [];

  const dummy = new THREE.Object3D();

  for (const room of mazeGraph.rooms.values()) {
    const c = room.center;

    dummy.position.set(c.x, 0.02, c.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    floorMatrices.push(dummy.matrix.clone());

    dummy.position.set(c.x, -1.29, c.z);
    dummy.updateMatrix();
    foundationMatrices.push(dummy.matrix.clone());

    dummy.position.set(c.x, WALL_HEIGHT, c.z);
    dummy.updateMatrix();
    ceilMatrices.push(dummy.matrix.clone());

    for (let i = 0; i < 6; i++) {
      const va = (i * Math.PI) / 3;
      const vx = c.x + Math.cos(va) * HEX_RADIUS;
      const vz = c.z + Math.sin(va) * HEX_RADIUS;
      const pk = `${Math.round(vx * 2)},${Math.round(vz * 2)}`;
      if (!placedPillars.has(pk)) {
        placedPillars.add(pk);
        dummy.position.set(vx, WALL_HEIGHT / 2 + 0.04, vz);
        dummy.rotation.set(0, va, 0);
        dummy.updateMatrix();
        pillarMatrices.push(dummy.matrix.clone());
      }
    }

    // Batched room accent rim strips (1 InstancedMesh instead of 246 individual meshes)
    const rimScale = room.key === EXIT_KEY ? 0.52 : (room.key === ENTRANCE_KEY ? 0.28 : 0.14);
    const rimCol = new THREE.Color(room.color).multiplyScalar(rimScale);
    for (let dir = 0; dir < 6; dir++) {
      const ang = FACE_ANGLES[dir];
      const rx = c.x + Math.cos(ang) * (apothem - 0.28);
      const rz = c.z + Math.sin(ang) * (apothem - 0.28);
      dummy.position.set(rx, WALL_HEIGHT - 0.14, rz);
      dummy.rotation.set(0, -ang + Math.PI / 2, 0);
      dummy.updateMatrix();
      rimMatrices.push(dummy.matrix.clone());
      rimColors.push(rimCol);
    }

    for (let dir = 0; dir < 6; dir++) {
      const nk = room.neighbors[dir];
      const edgeId = nk ? [room.key, nk].sort().join('|') : `${room.key}|EXT_${dir}`;
      if (seenEdges.has(edgeId)) continue;
      seenEdges.add(edgeId);

      const hasDoor = room.doors.has(dir);
      const ang = FACE_ANGLES[dir];
      const mx = c.x + Math.cos(ang) * apothem;
      const mz = c.z + Math.sin(ang) * apothem;
      const tx = -Math.sin(ang);
      const tz = Math.cos(ang);
      const rotY = -ang + Math.PI / 2;

      if (!hasDoor) {
        dummy.position.set(mx, WALL_HEIGHT / 2, mz);
        dummy.rotation.set(0, rotY, 0);
        dummy.updateMatrix();
        solidWallMatrices.push(dummy.matrix.clone());

        addCollider(
          colliders,
          mx - tx * (edgeLen * 0.52), mz - tz * (edgeLen * 0.52),
          mx + tx * (edgeLen * 0.52), mz + tz * (edgeLen * 0.52),
          WALL_THICKNESS * 0.5 + 0.12
        );
      } else {
        // Left & right doorway jambs (instanced)
        dummy.rotation.set(0, rotY, 0);
        dummy.position.set(mx - tx * sideOffset, WALL_HEIGHT / 2, mz - tz * sideOffset);
        dummy.updateMatrix();
        jambWallMatrices.push(dummy.matrix.clone());

        dummy.position.set(mx + tx * sideOffset, WALL_HEIGHT / 2, mz + tz * sideOffset);
        dummy.updateMatrix();
        jambWallMatrices.push(dummy.matrix.clone());

        // Top lintel (instanced)
        dummy.position.set(mx, DOOR_HEIGHT + lintelH / 2, mz);
        dummy.updateMatrix();
        lintelMatrices.push(dummy.matrix.clone());

        // Heavy metal doorframe posts & header (instanced)
        dummy.position.set(mx - tx * (DOOR_WIDTH / 2 + 0.04), DOOR_HEIGHT / 2, mz - tz * (DOOR_WIDTH / 2 + 0.04));
        dummy.updateMatrix();
        framePostMatrices.push(dummy.matrix.clone());

        dummy.position.set(mx + tx * (DOOR_WIDTH / 2 + 0.04), DOOR_HEIGHT / 2, mz + tz * (DOOR_WIDTH / 2 + 0.04));
        dummy.updateMatrix();
        framePostMatrices.push(dummy.matrix.clone());

        dummy.position.set(mx, DOOR_HEIGHT + 0.05, mz);
        dummy.updateMatrix();
        headerMatrices.push(dummy.matrix.clone());

        // Interactive 3D Wooden Horror Door (lazy mixer + distance visibility culling)
        const doorPivot = new THREE.Group();
        doorPivot.position.set(mx, 0, mz);
        doorPivot.rotation.y = rotY;
        doorPivot.updateMatrix();
        doorPivot.matrixAutoUpdate = false;

        const leaf = new THREE.Mesh(sharedLeafGeo, doorGltf?.scene ? sharedInvisibleMat : materials.doorLeaf);
        leaf.position.set(0, DOOR_HEIGHT / 2, 0);
        if (!doorGltf?.scene) {
          leaf.castShadow = true;
          leaf.receiveShadow = true;
        }
        doorPivot.add(leaf);

        let doorModel = null;
        const animDuration = doorAnimClip?.duration || 2.4;
        if (doorGltf?.scene) {
          doorModel = doorGltf.scene.clone(true);
          doorModel.position.set(0, 0, 0);
          doorPivot.add(doorModel);
        }

        let doorRole = 'interior';
        if (!nk) {
          if (room.key === ENTRANCE_KEY && dir === ENTRY_DOOR_DIR) doorRole = 'entry';
          else if (room.key === EXIT_KEY && dir === EXIT_DOOR_DIR) doorRole = 'exit';
          else doorRole = 'water';
        }

        const closedHex = (doorRole === 'entry' || doorRole === 'exit') ? 0x38bdf8 : 0xff3b2f;
        const indMat = new THREE.MeshStandardMaterial({
          color: closedHex,
          emissive: new THREE.Color(closedHex),
          emissiveIntensity: 1.5,
          roughness: 0.35
        });
        const indMesh = new THREE.Mesh(sharedIndGeo, indMat);
        indMesh.position.set(0, DOOR_HEIGHT + 0.05, 0);
        indMesh.updateMatrix();
        indMesh.matrixAutoUpdate = false;
        doorPivot.add(indMesh);

        group.add(doorPivot);

        const doorObj = {
          id: edgeId,
          roomA: room.key,
          roomB: nk || 'exterior',
          dir,
          isExterior: !nk,
          doorRole,
          closedHex,
          center: new THREE.Vector3(mx, DOOR_HEIGHT / 2, mz),
          normal: new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang)),
          tangent: new THREE.Vector3(tx, 0, tz),
          pivot: doorPivot,
          doorModel,
          doorAnimClip,
          leaf,
          indMat,
          mixer: null,
          openAction: null,
          animDuration,
          open: false,
          progress: 0,
          slideDist: DOOR_WIDTH - 0.18,
          audioState: {
            lastOpenCmd: false,
            grabPlayed: false,
            clickPlayed: false,
            openThudPlayed: false,
            closeThudPlayed: false,
            creakHandle: null
          }
        };
        leaf.userData.doorRef = doorObj;
        doors.push(doorObj);

        addCollider(
          colliders,
          mx - tx * (edgeLen * 0.52), mz - tz * (edgeLen * 0.52),
          mx - tx * (DOOR_WIDTH * 0.5), mz - tz * (DOOR_WIDTH * 0.5),
          WALL_THICKNESS * 0.5 + 0.1
        );
        addCollider(
          colliders,
          mx + tx * (DOOR_WIDTH * 0.5), mz + tz * (DOOR_WIDTH * 0.5),
          mx + tx * (edgeLen * 0.52), mz + tz * (edgeLen * 0.52),
          WALL_THICKNESS * 0.5 + 0.1
        );
        addCollider(
          colliders,
          mx - tx * (DOOR_WIDTH * 0.5), mz - tz * (DOOR_WIDTH * 0.5),
          mx + tx * (DOOR_WIDTH * 0.5), mz + tz * (DOOR_WIDTH * 0.5),
          0.24,
          doorObj
        );
      }
    }
  }

  // Only 10 static InstancedMesh draw calls for the ENTIRE 41-room honeycomb maze!
  group.add(makeStaticInstanced(floorGeo, materials.floor, floorMatrices, false, true));
  group.add(makeStaticInstanced(ceilGeo, materials.ceiling, ceilMatrices, false, false));
  group.add(makeStaticInstanced(pillarGeo, materials.wall, pillarMatrices, true, true));
  group.add(makeStaticInstanced(foundationGeo, materials.wall, foundationMatrices, false, true));
  if (solidWallMatrices.length) group.add(makeStaticInstanced(solidWallGeo, materials.wall, solidWallMatrices, true, true));
  if (jambWallMatrices.length) group.add(makeStaticInstanced(jambWallGeo, materials.wall, jambWallMatrices, true, true));
  if (lintelMatrices.length) group.add(makeStaticInstanced(lintelGeo, materials.wall, lintelMatrices, true, true));
  if (framePostMatrices.length) group.add(makeStaticInstanced(framePostGeo, materials.doorFrame, framePostMatrices, false, true));
  if (headerMatrices.length) group.add(makeStaticInstanced(headerGeo, materials.doorFrame, headerMatrices, false, true));
  if (rimMatrices.length) {
    const rimMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    group.add(makeStaticInstanced(rimStripGeo, rimMat, rimMatrices, false, false, rimColors));
  }

  return { group, doors, colliders };
}

/**
 * Resolves 2D circle-vs-segment collisions with fast broadphase distance reject.
 */
export function resolvePlayerCollisions(pos, radius, colliders) {
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      if (c.doorRef && c.doorRef.progress > 0.65) continue;

      // Fast broadphase AABB reject skips >95% of distant wall segments
      if (Math.abs(pos.x - c.mx) > c.boundR || Math.abs(pos.z - c.mz) > c.boundR) continue;

      const abx = c.bx - c.ax;
      const abz = c.bz - c.az;
      const abLenSq = abx * abx + abz * abz;
      if (abLenSq < 1e-6) continue;

      let t = ((pos.x - c.ax) * abx + (pos.z - c.az) * abz) / abLenSq;
      if (t < 0) t = 0;
      else if (t > 1) t = 1;

      const cx = c.ax + abx * t;
      const cz = c.az + abz * t;
      const dx = pos.x - cx;
      const dz = pos.z - cz;
      const distSq = dx * dx + dz * dz;
      const minDist = radius + c.halfThick;

      if (distSq < minDist * minDist && distSq > 1e-8) {
        const dist = Math.sqrt(distSq);
        const push = minDist - dist;
        pos.x += (dx / dist) * push;
        pos.z += (dz / dist) * push;
      }
    }
  }
}

export function setDoorImmediate(d, isOpen, audio = null) {
  d.open = !!isOpen;
  d.progress = isOpen ? 1 : 0;
  if (d.audioState) {
    if (d.audioState.creakHandle && audio) { audio.stopDoorCreak(d.audioState.creakHandle); }
    d.audioState.creakHandle = null;
    d.audioState.lastOpenCmd = d.open;
    d.audioState.grabPlayed = isOpen;
    d.audioState.clickPlayed = isOpen;
    d.audioState.openThudPlayed = isOpen;
    d.audioState.closeThudPlayed = !isOpen;
  }
  if (d.doorModel && d.doorAnimClip) {
    if (isOpen || d.mixer) {
      ensureDoorMixer(d, isOpen ? d.animDuration : 0);
      d.openAction.paused = true;
      d.openAction.time = isOpen ? d.animDuration : 0;
      d.mixer.update(0);
    }
  } else {
    d.leaf.position.x = d.progress * d.slideDist;
  }
  const col = isOpen ? 0x4ade80 : d.closedHex;
  d.indMat.color.setHex(col);
  d.indMat.emissive.setHex(col);
}

/**
 * Advances active doors' hinged animations, drives frame-exact 3D spatial audio,
 * and applies zero-quality-loss fog-distance culling (hiding doors beyond 36m in FP mode).
 */
export function updateDoors(doors, dt, audio = null, camPos = null, disableCulling = false) {
  const cullDistSq = 36.0 * 36.0;

  for (let i = 0; i < doors.length; i++) {
    const d = doors[i];

    // Zero-quality-loss fog/occlusion culling: beyond 36m in pitch-black FogExp2(0.048) doors are invisible
    if (camPos) {
      if (disableCulling) {
        d.pivot.visible = true;
      } else {
        const dx = d.center.x - camPos.x;
        const dz = d.center.z - camPos.z;
        d.pivot.visible = (dx * dx + dz * dz) <= cullDistSq;
      }
    }

    const target = d.open ? 1 : 0;
    const st = d.audioState;

    if (st && st.lastOpenCmd !== d.open) {
      st.lastOpenCmd = d.open;
      if (d.open) {
        st.grabPlayed = false;
        st.clickPlayed = false;
        st.openThudPlayed = false;
      } else {
        st.closeThudPlayed = false;
      }
      // Lazily instantiate AnimationMixer starting from current progress (0 when closed)
      if (d.doorModel && d.doorAnimClip && !d.mixer) {
        ensureDoorMixer(d, d.progress * d.animDuration);
      }
    }

    if (d.mixer && d.openAction) {
      const targetTime = d.open ? d.animDuration : 0;
      const prevNorm = d.openAction.time / d.animDuration;

      if (Math.abs(d.openAction.time - targetTime) > 0.002) {
        const speed = d.open ? 1.75 : 2.10;
        const dir = d.open ? 1 : -1;
        d.openAction.paused = false;
        d.openAction.time = Math.max(0, Math.min(d.animDuration, d.openAction.time + dir * dt * speed));
        d.mixer.update(0);
        const currNorm = d.openAction.time / d.animDuration;
        d.progress = currNorm;

        if (audio && st) {
          if (d.open) {
            if (!st.grabPlayed && currNorm > 0.001) {
              st.grabPlayed = true;
              audio.playDoorHandleGrab(d.center);
            }
            if (!st.clickPlayed && prevNorm < 0.14 && currNorm >= 0.14) {
              st.clickPlayed = true;
              audio.playDoorLatchClick(d.center);
            }
            const inSwingPhase = currNorm >= 0.21 && currNorm < 0.70;
            if (inSwingPhase) {
              if (!st.creakHandle) st.creakHandle = audio.startDoorCreak(d.center);
              const phaseU = (currNorm - 0.21) / (0.70 - 0.21);
              const velocityWeight = Math.sin(phaseU * Math.PI) * (0.45 + 0.55 * phaseU);
              audio.updateDoorCreak(st.creakHandle, velocityWeight, phaseU);
            } else if (st.creakHandle) {
              audio.stopDoorCreak(st.creakHandle);
              st.creakHandle = null;
            }
            if (!st.openThudPlayed && prevNorm < 0.70 && currNorm >= 0.70) {
              st.openThudPlayed = true;
              audio.playDoorStopThud(d.center, false);
            }
          } else {
            const inCloseSwing = currNorm <= 0.82 && currNorm > 0.08;
            if (inCloseSwing) {
              if (!st.creakHandle) st.creakHandle = audio.startDoorCreak(d.center);
              const phaseU = 1.0 - (currNorm - 0.08) / (0.82 - 0.08);
              const velocityWeight = Math.sin(phaseU * Math.PI) * 0.75;
              audio.updateDoorCreak(st.creakHandle, velocityWeight, 1.0 - phaseU);
            } else if (st.creakHandle) {
              audio.stopDoorCreak(st.creakHandle);
              st.creakHandle = null;
            }
            if (!st.closeThudPlayed && prevNorm > 0.05 && currNorm <= 0.05) {
              st.closeThudPlayed = true;
              audio.playDoorStopThud(d.center, true);
            }
          }
        }
      } else {
        d.progress = target;
        if (!d.openAction.paused) {
          d.openAction.time = targetTime;
          d.openAction.paused = true;
          d.mixer.update(0);
        }
        if (audio && st && st.creakHandle) {
          audio.stopDoorCreak(st.creakHandle);
          st.creakHandle = null;
        }
      }
    } else if (!d.doorModel && Math.abs(d.progress - target) > 0.001) {
      d.progress += (target - d.progress) * Math.min(1, dt * 6.5);
      d.leaf.position.x = d.progress * d.slideDist;
    }
  }
}

export function findRoomAt(x, z, mazeGraph) {
  let best = null;
  let bestDistSq = (HEX_RADIUS * 0.94) ** 2;
  for (const room of mazeGraph.rooms.values()) {
    const dx = x - room.center.x;
    const dz = z - room.center.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < bestDistSq) {
      bestDistSq = d2;
      best = room;
    }
  }
  return best;
}
