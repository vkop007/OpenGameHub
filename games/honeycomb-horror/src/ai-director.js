/**
 * Horror AI Director, Vision/LOS Raycaster & Configurable Territory Registry
 *
 * Enforces:
 * 1. Realistic per-character Vision (range, darkRange, FOV cone, eye-level LOS blocked by walls & closed doors)
 * 2. Strict Single-Chaser Exclusivity (never more than ONE active hunter chasing/searching at once)
 * 3. Configurable per-character Territories, Spawn Rooms & Patrol Routes across the 41-room Honeycomb Maze
 */

export const AIState = Object.freeze({
  IDLE: 'idle',
  PATROLLING: 'patrolling',
  SUSPICIOUS: 'suspicious',
  PLAYER_DETECTED: 'player_detected',
  CHASING: 'chasing',
  SEARCHING: 'searching',
  RETURNING: 'returning_to_territory'
});

/**
 * Configurable territory, spawn, patrol, vision, and behavioral profiles for each monster.
 * Room keys match ROOM_LAYOUT in src/maze.js (Entrance '11,2' is kept as a safe entry buffer).
 */
export const TERRITORY_CONFIGS = {
  TheButcher: {
    startRoomKey: '8,1',
    territoryRooms: ['10,2', '10,3', '9,1', '9,2', '9,3', '8,0', '8,1', '8,2', '8,3', '7,2'],
    patrolRoute: ['8,1', '9,1', '9,2', '8,2', '8,3', '9,3', '10,3', '10,2'],
    vision: {
      range: 16.5,          // max sight distance with player flashlight ON (meters)
      darkRange: 9.5,       // max sight distance with player flashlight OFF
      fovDeg: 88,           // horizontal field of view cone (degrees)
      closeSenseRange: 2.3, // close-quarters human awareness (still requires clear LOS)
      awarenessBuildRate: 1.55,
      awarenessDecayRate: 0.45
    },
    behavior: {
      detectReactionTime: 0.48,
      searchPoints: 3,
      searchInspectTime: [1.8, 2.8],
      maxSearchDuration: 13.0,
      idleDuration: [2.2, 4.4],
      maxChaseLeashRooms: 4
    }
  },

  CrawlingCreature: {
    startRoomKey: '6,2',
    territoryRooms: ['7,-1', '7,0', '7,1', '6,-1', '6,0', '6,1', '6,2', '5,-1', '5,1', '5,2'],
    patrolRoute: ['6,2', '6,1', '7,1', '7,0', '6,0', '6,-1', '5,-1', '5,1', '5,2'],
    vision: {
      range: 18.0,
      darkRange: 12.0,
      fovDeg: 118,
      closeSenseRange: 2.7,
      awarenessBuildRate: 2.1,
      awarenessDecayRate: 0.4
    },
    behavior: {
      detectReactionTime: 0.34,
      searchPoints: 3,
      searchInspectTime: [1.5, 2.4],
      maxSearchDuration: 12.5,
      idleDuration: [1.5, 3.4],
      maxChaseLeashRooms: 5
    }
  },

  TheNurse: {
    startRoomKey: '6,4',
    territoryRooms: ['7,3', '7,4', '6,3', '6,4', '5,3', '5,4', '4,3', '3,3', '4,2'],
    patrolRoute: ['6,4', '7,4', '7,3', '6,3', '5,3', '5,4', '4,3', '4,2'],
    vision: {
      range: 20.5,
      darkRange: 11.5,
      fovDeg: 96,
      closeSenseRange: 2.4,
      awarenessBuildRate: 1.85,
      awarenessDecayRate: 0.42
    },
    behavior: {
      detectReactionTime: 0.40,
      searchPoints: 3,
      searchInspectTime: [1.9, 2.9],
      maxSearchDuration: 14.0,
      idleDuration: [2.0, 4.0],
      maxChaseLeashRooms: 5
    }
  },

  HorrorGirl: {
    startRoomKey: '3,2',
    territoryRooms: ['4,0', '4,1', '3,0', '3,2', '2,1', '2,2', '2,3', '2,4', '1,1', '1,2', '0,2'],
    patrolRoute: ['3,2', '2,2', '2,1', '1,1', '1,2', '2,3', '2,4', '3,0', '4,1', '4,0'],
    vision: {
      range: 18.5,
      darkRange: 10.5,
      fovDeg: 106,
      closeSenseRange: 2.5,
      awarenessBuildRate: 1.75,
      awarenessDecayRate: 0.38
    },
    behavior: {
      detectReactionTime: 0.42,
      searchPoints: 3,
      searchInspectTime: [1.8, 3.0],
      maxSearchDuration: 13.5,
      idleDuration: [2.4, 4.8],
      maxChaseLeashRooms: 4
    }
  }
};

/**
 * Exact 2D segment-to-segment distance squared helper.
 * Used to guarantee sight rays cannot leak through walls, door jambs, or closed doors.
 */
function segmentToSegmentDistSq(ax, az, bx, bz, cx, cz, dx, dz) {
  const ux = bx - ax;
  const uz = bz - az;
  const vx = dx - cx;
  const vz = dz - cz;
  const wx = ax - cx;
  const wz = az - cz;

  const a = ux * ux + uz * uz;
  const b = ux * vx + uz * vz;
  const c = vx * vx + vz * vz;
  const d = ux * wx + uz * wz;
  const e = vx * wx + vz * wz;
  const D = a * c - b * b;

  let sc, sN, sD = D;
  let tc, tN, tD = D;
  const EPS = 1e-8;

  if (D < EPS) {
    sN = 0.0;
    sD = 1.0;
    tN = e;
    tD = c;
  } else {
    sN = (b * e - c * d);
    tN = (a * e - b * d);
    if (sN < 0.0) {
      sN = 0.0;
      tN = e;
      tD = c;
    } else if (sN > sD) {
      sN = sD;
      tN = e + b;
      tD = c;
    }
  }

  if (tN < 0.0) {
    tN = 0.0;
    if (-d < 0.0) {
      sN = 0.0;
    } else if (-d > a) {
      sN = sD;
    } else {
      sN = -d;
      sD = a;
    }
  } else if (tN > tD) {
    tN = tD;
    if ((-d + b) < 0.0) {
      sN = 0.0;
    } else if ((-d + b) > a) {
      sN = sD;
    } else {
      sN = (-d + b);
      sD = a;
    }
  }

  sc = Math.abs(sN) < EPS ? 0.0 : sN / sD;
  tc = Math.abs(tN) < EPS ? 0.0 : tN / tD;

  const dPx = wx + (sc * ux) - (tc * vx);
  const dPz = wz + (sc * uz) - (tc * vz);
  return dPx * dPx + dPz * dPz;
}

/**
 * Checks whether there is a clear line of sight between (x1, z1) and (x2, z2).
 * Blocked by all solid walls, doorway jambs, and closed/mostly-closed doors (progress <= 0.65).
 */
export function hasLineOfSight(x1, z1, x2, z2, colliders) {
  if (!colliders || colliders.length === 0) return true;
  const minX = Math.min(x1, x2) - 0.5;
  const maxX = Math.max(x1, x2) + 0.5;
  const minZ = Math.min(z1, z2) - 0.5;
  const maxZ = Math.max(z1, z2) + 0.5;

  for (let i = 0; i < colliders.length; i++) {
    const col = colliders[i];
    // Open doors do not block line of sight
    if (col.doorRef && col.doorRef.progress > 0.65) continue;

    // Fast AABB rejection
    const cMinX = col.ax < col.bx ? col.ax : col.bx;
    const cMaxX = col.ax > col.bx ? col.ax : col.bx;
    const cMinZ = col.az < col.bz ? col.az : col.bz;
    const cMaxZ = col.az > col.bz ? col.az : col.bz;
    if (cMaxX + col.halfThick < minX || cMinX - col.halfThick > maxX ||
        cMaxZ + col.halfThick < minZ || cMinZ - col.halfThick > maxZ) {
      continue;
    }

    // Thick-segment occlusion test so vision never leaks through wall seams or closed door edges
    const blockRadius = col.doorRef ? 0.14 : Math.max(0.14, col.halfThick * 0.45);
    const distSq = segmentToSegmentDistSq(x1, z1, x2, z2, col.ax, col.az, col.bx, col.bz);
    if (distSq <= blockRadius * blockRadius) {
      return false;
    }
  }
  return true;
}

/**
 * Evaluates whether a character can see the player based on:
 * - Effective vision range (boosted when player flashlight is on)
 * - Horizontal FOV cone centered on the character's facing yaw + head scan offset
 * - Close-quarters awareness radius (still requiring unobstructed LOS)
 * - True wall/obstacle/closed-door line of sight
 */
export function evaluateVision(originX, originZ, lookYaw, visionCfg, playerPos, flashlightOn, colliders) {
  const dx = playerPos.x - originX;
  const dz = playerPos.z - originZ;
  const dist = Math.hypot(dx, dz);

  const maxRange = flashlightOn ? visionCfg.range : visionCfg.darkRange;
  if (dist > maxRange) {
    return { visible: false, dist, inFov: false, hasLos: false, visibilityScore: 0 };
  }

  // Angle between character's look direction (sin(yaw), cos(yaw)) and vector to player
  const fwdX = Math.sin(lookYaw);
  const fwdZ = Math.cos(lookYaw);
  const invDist = dist > 1e-5 ? 1 / dist : 0;
  const dot = Math.max(-1, Math.min(1, (dx * fwdX + dz * fwdZ) * invDist));
  const angleRad = Math.acos(dot);
  const halfFovRad = ((visionCfg.fovDeg || 95) * Math.PI) / 360;

  const inFov = angleRad <= halfFovRad || dist <= (visionCfg.closeSenseRange || 2.3);
  if (!inFov) {
    return { visible: false, dist, inFov: false, hasLos: false, visibilityScore: 0 };
  }

  // Must have clear line of sight — never detect through walls, obstacles, or closed doors
  const clearLos = hasLineOfSight(originX, originZ, playerPos.x, playerPos.z, colliders);
  if (!clearLos) {
    return { visible: false, dist, inFov: true, hasLos: false, visibilityScore: 0 };
  }

  // Realistic visibility strength: higher when centered in view, closer, or illuminated by flashlight
  const distFactor = Math.max(0.15, 1.0 - dist / maxRange);
  const angleFactor = angleRad <= halfFovRad
    ? Math.max(0.25, 1.0 - (angleRad / Math.max(0.01, halfFovRad)) * 0.65)
    : 0.75; // close-sense behind/side
  const lightBoost = flashlightOn ? 1.25 : 0.85;
  const visibilityScore = Math.min(2.5, distFactor * angleFactor * lightBoost * 2.0);

  return {
    visible: true,
    dist,
    inFov: true,
    hasLos: true,
    visibilityScore
  };
}

/**
 * Coordinates all HorrorCharacterAI instances so that:
 * - At most ONE monster actively chases / hunts the player at any time.
 * - If multiple monsters spot the player simultaneously, only the best candidate initiates the chase.
 * - Other monsters continue patrolling, guarding their territories, or observing cautiously without joining the chase.
 */
export class HorrorAIDirector {
  constructor(colliders, mazeGraph, findRoomFn) {
    this.colliders = colliders;
    this.mazeGraph = mazeGraph;
    this.findRoomFn = findRoomFn;
    this.monsters = [];
    this.activeHunter = null;
    this.handoffCooldown = 0; // brief breathing window after a chase fully ends
  }

  register(monster) {
    if (!this.monsters.includes(monster)) {
      this.monsters.push(monster);
    }
  }

  reset() {
    this.activeHunter = null;
    this.handoffCooldown = 0;
    for (const m of this.monsters) {
      m.reset();
    }
  }

  isActiveHunter(monster) {
    return this.activeHunter === monster;
  }

  hasActiveHunter() {
    return this.activeHunter !== null;
  }

  releaseHunter(monster, cooldown = 1.2) {
    if (this.activeHunter === monster) {
      this.activeHunter = null;
      this.handoffCooldown = Math.max(this.handoffCooldown, cooldown);
    }
  }

  /**
   * Main per-frame AI coordinator update.
   * Phase 1: Every monster evaluates its own vision/LOS perception independently.
   * Phase 2: If no active hunter exists, select AT MOST ONE monster among those ready to chase.
   * Phase 3: Advance each monster's independent 7-state FSM.
   */
  update(dt, playerPos, flashlightOn, callbacks = {}) {
    this.handoffCooldown = Math.max(0, this.handoffCooldown - dt);

    const playerRoom = this.findRoomFn(playerPos.x, playerPos.z);

    // Validate current activeHunter still holds a pursuit state
    if (this.activeHunter) {
      const s = this.activeHunter.state;
      if (s !== AIState.PLAYER_DETECTED && s !== AIState.CHASING && s !== AIState.SEARCHING) {
        this.activeHunter = null;
        this.handoffCooldown = Math.max(this.handoffCooldown, 1.0);
      }
    }

    // Phase 1: Perception pass for all monsters
    const perceptions = new Map();
    const chaseCandidates = [];

    for (let i = 0; i < this.monsters.length; i++) {
      const m = this.monsters[i];
      const p = m.evaluatePerception(dt, playerPos, flashlightOn, this.colliders, playerRoom);
      perceptions.set(m, p);

      if (!this.activeHunter && this.handoffCooldown <= 0 && p.wantsToChase) {
        // Priority score: closer distance + higher awareness + defending own territory
        const territoryBonus = (playerRoom && m.isInTerritory(playerRoom.key)) ? 25.0 : 0.0;
        const score = territoryBonus + p.awareness * 20.0 - p.dist * 1.1;
        chaseCandidates.push({ monster: m, score, dist: p.dist });
      }
    }

    // Phase 2: Arbitrate simultaneous detections — select ONLY ONE hunter
    if (!this.activeHunter && chaseCandidates.length > 0) {
      chaseCandidates.sort((a, b) => b.score - a.score);
      this.activeHunter = chaseCandidates[0].monster;
    }

    // Phase 3: Execute individual state machines
    let closestMonsterDist = 999;
    let anyMonsterChasing = false;

    for (let i = 0; i < this.monsters.length; i++) {
      const m = this.monsters[i];
      const p = perceptions.get(m);
      const isAuthorizedHunter = this.activeHunter === m;

      const res = m.stepBehavior(dt, playerPos, playerRoom, p, isAuthorizedHunter, this, callbacks);
      if (res) {
        if (res.distToPlayer < closestMonsterDist) closestMonsterDist = res.distToPlayer;
        if (res.state === AIState.CHASING || res.state === AIState.PLAYER_DETECTED) {
          anyMonsterChasing = true;
        }
      }
    }

    return {
      closestMonsterDist,
      anyMonsterChasing,
      activeHunterName: this.activeHunter ? this.activeHunter.name : null
    };
  }

  getDebugState() {
    return {
      activeHunter: this.activeHunter ? this.activeHunter.name : null,
      handoffCooldown: +this.handoffCooldown.toFixed(2),
      monsters: this.monsters.map((m) => ({
        name: m.name,
        state: m.state,
        subAction: m.subAction,
        room: m.currentRoomKey,
        inTerritory: m.isInTerritory(m.currentRoomKey),
        awareness: +m.awareness.toFixed(2),
        hasLos: m.lastVision.hasLos,
        visible: m.lastVision.visible,
        dist: +m.lastVision.dist.toFixed(2)
      }))
    };
  }
}
