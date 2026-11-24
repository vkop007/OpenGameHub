/**
 * Horror Character AI Controller — Realistic Vision, Chase & Territory Hunter FSM
 *
 * Implements 7 independent AI states:
 *   idle | patrolling | suspicious | player_detected | chasing | searching | returning_to_territory
 *
 * Key guarantees:
 * - Vision-based detection using per-character range, darkRange, FOV cone, and wall/door LOS raycast
 * - Never knows player's real-time position when LOS is broken (chases last known position, then searches)
 * - Stays within configurable territory & patrol route unless actively chasing/searching
 * - Cooperates with HorrorAIDirector so ONLY ONE monster ever chases the player at a time
 */
import * as THREE from 'three';
import { AIState, TERRITORY_CONFIGS, evaluateVision } from './ai-director.js?v=13';

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

export class HorrorCharacterAI {
  constructor(scene, gltf, mazeGraph, doors, findRoomFn, options = {}) {
    this.scene = scene;
    this.mazeGraph = mazeGraph;
    this.doors = doors;
    this.findRoomFn = findRoomFn;

    this.name = options.name || 'CrawlingCreature';
    const preset = TERRITORY_CONFIGS[this.name] || {};

    this.audioProfile = options.audioProfile || 'crawling_creature';
    this.stepIntervalWalk = options.stepIntervalWalk || 0.48;
    this.stepIntervalChase = options.stepIntervalChase || 0.24;
    this.targetHeight = options.targetHeight || 1.15;
    this.hoverHeight = options.hoverHeight || 0.02;
    this.walkSpeed = options.walkSpeed || 1.95;
    this.chaseSpeed = options.chaseSpeed || 4.35;
    this.damage = options.damage || 45;
    this.deathMessage = options.deathMessage || 'A horror creature hunted you down inside the dark honeycomb maze.';
    this.anims = {
      idle: '01_Idle',
      walk: '04_Walking_Crawling',
      chase: '05_Fast_Movement_Chasing',
      search: '07_Searching',
      look: '03_Head_Looking_Around',
      attack: '08_Attack',
      openDoor: '10_Door_Opening',
      ...(options.animMap || {})
    };

    // Configurable vision profile
    this.vision = {
      range: 17.5,
      darkRange: 10.5,
      fovDeg: 100,
      closeSenseRange: 2.4,
      awarenessBuildRate: 1.8,
      awarenessDecayRate: 0.42,
      ...(preset.vision || {}),
      ...(options.vision || {})
    };

    // Configurable behavior timings
    this.behavior = {
      detectReactionTime: 0.42,
      searchPoints: 3,
      searchInspectTime: [1.7, 2.8],
      maxSearchDuration: 13.0,
      idleDuration: [1.8, 4.2],
      maxChaseLeashRooms: 5,
      ...(preset.behavior || {}),
      ...(options.behavior || {})
    };

    // Configurable territory & patrol route
    const startKey = options.startRoomKey || preset.startRoomKey || '6,2';
    const startRoom = mazeGraph.rooms.get(startKey) || Array.from(mazeGraph.rooms.values())[0];
    this.startRoomKey = startRoom.key;

    const rawTerritory = options.territoryRooms || preset.territoryRooms || [this.startRoomKey];
    const validTerritory = rawTerritory.filter((k) => mazeGraph.rooms.has(k));
    if (!validTerritory.includes(this.startRoomKey)) validTerritory.unshift(this.startRoomKey);
    this.territoryRooms = new Set(validTerritory);

    const rawPatrol = options.patrolRoute || preset.patrolRoute || validTerritory;
    this.patrolRoute = rawPatrol.filter((k) => mazeGraph.rooms.has(k));
    if (this.patrolRoute.length === 0) this.patrolRoute = [this.startRoomKey];
    this.patrolIndex = 0;
    this.patrolDir = 1;

    // 3D scene root & normalization
    this.root = gltf.scene;
    this.root.name = this.name;

    this.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(this.root);
    const size = new THREE.Vector3();
    box.getSize(size);
    if (size.y > 0.01) {
      this.root.scale.multiplyScalar(this.targetHeight / size.y);
    }
    this.root.updateMatrixWorld(true);
    const box2 = new THREE.Box3().setFromObject(this.root);
    this.root.position.y -= box2.min.y;

    this.skinnedMeshes = [];
    this.root.traverse((obj) => {
      if (obj.isMesh || obj.isSkinnedMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        obj.frustumCulled = false;
        this.skinnedMeshes.push(obj);
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => {
          if (!m) return;
          m.envMapIntensity = 0.25;
          if (m.name === 'MAT_CrawlingCreature_Eyes') {
            m.emissive = new THREE.Color(0xff2a1a);
            m.emissiveIntensity = 3.2;
          } else if (m.name === 'MAT_Butcher_Eyes') {
            m.emissive = new THREE.Color(0xffaa22);
            m.emissiveIntensity = 3.0;
          } else if (m.name === 'MAT_Eye_Cornea') {
            m.transparent = true;
            m.opacity = 0.16;
            m.roughness = 0.04;
          } else if (
            m.name === 'MAT_Horror_Dress' ||
            m.name === 'MAT_Horror_Hair' ||
            m.name === 'MAT_Butcher_Leather' ||
            m.name === 'MAT_Nurse_Uniform'
          ) {
            m.side = THREE.DoubleSide;
          }
        });
      }
    });
    this._shadowsEnabled = true;

    // Subtle eerie eye glow (never toggle .visible — modulate .intensity to prevent WebGL shader recompiles!)
    const eyeCol = options.eyeLightColor ?? 0xff2211;
    this.eyeLightBaseIntensity = options.eyeLightIntensity ?? 0.85;
    this.eyeGlow = new THREE.PointLight(eyeCol, this.eyeLightBaseIntensity, 4.4, 2.0);
    this.eyeGlow.position.set(0, options.eyeLightY ?? 0.72, 0.42);
    this.root.add(this.eyeGlow);
    this._meshesVisible = true;

    // Animation Mixer & Clips
    this.mixer = new THREE.AnimationMixer(this.root);
    this.actions = new Map();
    for (const clip of gltf.animations || []) {
      const act = this.mixer.clipAction(clip);
      this.actions.set(clip.name, act);
    }
    this.currentAnim = null;

    // Door lookup by sorted room pair
    this.doorByPair = new Map();
    for (const d of doors) {
      if (!d.isExterior) {
        const k = [d.roomA, d.roomB].sort().join('|');
        this.doorByPair.set(k, d);
      }
    }

    this._initState();
    this.scene.add(this.root);
  }

  _initState() {
    const startRoom = this.mazeGraph.rooms.get(this.startRoomKey);
    this.root.position.set(startRoom.center.x, this.hoverHeight, startRoom.center.z);
    this.yaw = Math.random() * Math.PI * 2;
    this.root.rotation.y = this.yaw;

    this.state = AIState.IDLE;
    this.subAction = null; // null | 'attack' | 'open_door'
    this.subActionTimer = 0;
    this.targetDoor = null;

    this.stateTimer = randRange(0.8, 2.4);
    this.attackCooldown = 0;
    this.stepTimer = 0;
    this.growlTimer = 4.0 + Math.random() * 5.0;
    this.voiceTimer = 10.0 + Math.random() * 14.0;

    this.currentRoomKey = this.startRoomKey;
    this.path = [];
    this.patrolIndex = 0;
    this.patrolDir = 1;

    // Perception & memory
    this.awareness = 0;
    this.headScanPhase = Math.random() * Math.PI * 2;
    this.headScanOffset = 0;
    this.lastVision = { visible: false, dist: 999, inFov: false, hasLos: false, visibilityScore: 0 };
    this.lastKnownPos = null;       // { x, z } — updated ONLY when player is actually visible
    this.lastKnownRoomKey = null;
    this.lastSeenDir = { x: 0, z: 0 };
    this.timeSinceLastSeen = 999;

    // Search state
    this.searchQueue = [];
    this.searchElapsed = 0;
    this.searchInspectTimer = 0;
    this.suspiciousTimer = 0;

    this.playAnim(this.anims.idle, 0.0);
  }

  reset() {
    this._initState();
  }

  isInTerritory(roomKey) {
    return !!roomKey && this.territoryRooms.has(roomKey);
  }

  playAnim(name, fade = 0.2, loopOnce = false) {
    if (this.currentAnim === name) return;
    const next = this.actions.get(name);
    if (!next) return;
    next.reset();
    if (loopOnce) {
      next.setLoop(THREE.LoopOnce, 1);
      next.clampWhenFinished = true;
    } else {
      next.setLoop(THREE.LoopRepeat, Infinity);
    }
    next.play();
    if (this.currentAnim && this.actions.get(this.currentAnim)) {
      this.actions.get(this.currentAnim).crossFadeTo(next, fade, true);
    }
    this.currentAnim = name;
  }

  _findRoomPath(fromKey, toKey, restrictToTerritory = false) {
    if (!fromKey || !toKey || fromKey === toKey) return [];
    const queue = [fromKey];
    const parent = new Map([[fromKey, null]]);
    while (queue.length > 0) {
      const cur = queue.shift();
      if (cur === toKey) break;
      const room = this.mazeGraph.rooms.get(cur);
      if (!room) continue;
      for (const dir of room.doors) {
        const nk = room.neighbors[dir];
        if (!nk || parent.has(nk)) continue;
        // Keep patrols out of entrance safe room '11,2' and inside territory when requested
        if (nk === '11,2' && toKey !== '11,2') continue;
        if (restrictToTerritory && nk !== toKey && !this.territoryRooms.has(nk)) continue;
        parent.set(nk, cur);
        queue.push(nk);
      }
    }
    if (!parent.has(toKey)) {
      // Fallback without territory restriction if territory is bridged via a neighboring corridor
      if (restrictToTerritory) return this._findRoomPath(fromKey, toKey, false);
      return [];
    }
    const res = [];
    let cur = toKey;
    while (cur && cur !== fromKey) {
      res.unshift(cur);
      cur = parent.get(cur);
    }
    return res;
  }

  _pickNextPatrolPath(fromKey) {
    // 25% chance to pick an unpredictable random room within own territory, 75% follow patrolRoute
    let targetKey = null;
    if (Math.random() < 0.25 && this.territoryRooms.size > 1) {
      const choices = Array.from(this.territoryRooms).filter((k) => k !== fromKey);
      targetKey = choices[Math.floor(Math.random() * choices.length)];
    } else {
      if (Math.random() < 0.15) this.patrolDir *= -1;
      for (let tries = 0; tries < this.patrolRoute.length; tries++) {
        this.patrolIndex = (this.patrolIndex + this.patrolDir + this.patrolRoute.length) % this.patrolRoute.length;
        const cand = this.patrolRoute[this.patrolIndex];
        if (cand !== fromKey) {
          targetKey = cand;
          break;
        }
      }
    }
    if (!targetKey || targetKey === fromKey) return [];
    return this._findRoomPath(fromKey, targetKey, true);
  }

  _findNearestTerritoryRoom(fromKey) {
    if (this.territoryRooms.has(fromKey)) return fromKey;
    const queue = [fromKey];
    const visited = new Set([fromKey]);
    while (queue.length > 0) {
      const cur = queue.shift();
      if (this.territoryRooms.has(cur)) return cur;
      const room = this.mazeGraph.rooms.get(cur);
      if (!room) continue;
      for (const dir of room.doors) {
        const nk = room.neighbors[dir];
        if (nk && !visited.has(nk)) {
          visited.add(nk);
          queue.push(nk);
        }
      }
    }
    return this.startRoomKey;
  }

  _buildLocalSearchQueue(originRoomKey) {
    const queue = [];
    const baseRoom = this.mazeGraph.rooms.get(originRoomKey);
    if (!baseRoom) return queue;

    // Gather all 1-hop connected rooms via doors (excluding entrance safe room unless player ran there)
    const neighbors = [];
    for (const dir of baseRoom.doors) {
      const nk = baseRoom.neighbors[dir];
      if (!nk || nk === '11,2') continue;
      const nRoom = this.mazeGraph.rooms.get(nk);
      if (!nRoom) continue;

      // Score neighbor by alignment with the player's last observed movement direction + slight randomness
      const dx = nRoom.center.x - baseRoom.center.x;
      const dz = nRoom.center.z - baseRoom.center.z;
      const len = Math.hypot(dx, dz) || 1;
      const dirDot = (dx / len) * this.lastSeenDir.x + (dz / len) * this.lastSeenDir.z;
      const score = dirDot * 1.4 + Math.random() * 0.9;
      neighbors.push({ key: nk, score });
    }

    neighbors.sort((a, b) => b.score - a.score);
    const maxPts = Math.min(this.behavior.searchPoints || 3, neighbors.length);
    for (let i = 0; i < maxPts; i++) {
      queue.push(neighbors[i].key);
    }
    return queue;
  }

  _turnToward(tx, tz, dt, turnSpeed = 5.0) {
    const dx = tx - this.root.position.x;
    const dz = tz - this.root.position.z;
    if (dx * dx + dz * dz < 1e-4) return;
    const desired = Math.atan2(dx, dz);
    let diff = desired - this.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.yaw += diff * Math.min(1, dt * turnSpeed);
    this.root.rotation.y = this.yaw;
  }

  _moveToward(tx, tz, speed, dt) {
    const dx = tx - this.root.position.x;
    const dz = tz - this.root.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.08) return true;
    this._turnToward(tx, tz, dt, speed > 3 ? 7.8 : 4.6);
    const step = Math.min(dist, speed * dt);
    this.root.position.x += (dx / dist) * step;
    this.root.position.z += (dz / dist) * step;
    return dist <= speed * dt + 0.14;
  }

  /**
   * Phase 1 (called by HorrorAIDirector): Pure perception — evaluates FOV, range, and LOS.
   * Never leaks player position when LOS is blocked by walls, obstacles, or closed doors.
   */
  evaluatePerception(dt, playerPos, flashlightOn, colliders, playerRoom) {
    const myRoom = this.findRoomFn(this.root.position.x, this.root.position.z);
    if (myRoom) this.currentRoomKey = myRoom.key;

    // Subtle scanning head-sweep while idling, suspicious, or searching
    if (this.state === AIState.IDLE || this.state === AIState.SUSPICIOUS || this.state === AIState.SEARCHING) {
      this.headScanPhase += dt * (this.state === AIState.SEARCHING ? 2.4 : 1.3);
      this.headScanOffset = Math.sin(this.headScanPhase) * 0.42;
    } else {
      this.headScanOffset *= Math.max(0, 1 - dt * 5);
    }

    const lookYaw = this.yaw + this.headScanOffset;
    const vision = evaluateVision(
      this.root.position.x,
      this.root.position.z,
      lookYaw,
      this.vision,
      playerPos,
      flashlightOn,
      colliders
    );
    this.lastVision = vision;

    // Monsters stay inside the honeycomb maze; only actively hunt players inside the maze
    const playerReachable = !!playerRoom;

    if (vision.visible && playerReachable) {
      // Update last-known position & escape direction ONLY while actually seeing the player
      if (this.lastKnownPos) {
        const vx = playerPos.x - this.lastKnownPos.x;
        const vz = playerPos.z - this.lastKnownPos.z;
        const vLen = Math.hypot(vx, vz);
        if (vLen > 0.05) {
          this.lastSeenDir.x = vx / vLen;
          this.lastSeenDir.z = vz / vLen;
        }
      }
      this.lastKnownPos = { x: playerPos.x, z: playerPos.z };
      this.lastKnownRoomKey = playerRoom.key;
      this.timeSinceLastSeen = 0;

      // Realistic human-like detection speed: near-instant when close & centered, gradual at edge/distance
      const rate = this.vision.awarenessBuildRate * vision.visibilityScore;
      const instantBoost = vision.dist < 5.2 ? 3.5 : 1.0;
      this.awareness = Math.min(1.0, this.awareness + dt * rate * instantBoost);
    } else {
      this.timeSinceLastSeen += dt;
      const decay = this.state === AIState.CHASING ? this.vision.awarenessDecayRate * 0.55 : this.vision.awarenessDecayRate;
      this.awareness = Math.max(0, this.awareness - dt * decay);
    }

    const wantsToChase = vision.visible && playerReachable && this.awareness >= 0.92;
    const isAlerted = vision.visible && playerReachable && this.awareness >= 0.25;

    return {
      visible: vision.visible && playerReachable,
      hasLos: vision.hasLos,
      dist: vision.dist,
      awareness: this.awareness,
      wantsToChase,
      isAlerted
    };
  }

  /**
   * Follows `this.path` room-by-room, automatically triggering the `open_door` sub-action
   * when approaching a closed door between rooms. Returns true if an open_door sub-action started.
   */
  _followRoomPath(dt, speed, isUrgent, distToPlayer, callbacks) {
    if (this.path.length === 0) return { arrived: true, openedDoor: false };

    const nextKey = this.path[0];
    const nextRoom = this.mazeGraph.rooms.get(nextKey);
    if (!nextRoom) {
      this.path.shift();
      return { arrived: this.path.length === 0, openedDoor: false };
    }

    // Check if there is a closed door between currentRoomKey and nextKey
    if (this.currentRoomKey && this.currentRoomKey !== nextKey) {
      const pairKey = [this.currentRoomKey, nextKey].sort().join('|');
      const door = this.doorByPair.get(pairKey);
      if (door && !door.open) {
        const distDoor = Math.hypot(door.center.x - this.root.position.x, door.center.z - this.root.position.z);
        if (distDoor < 2.25) {
          this.subAction = 'open_door';
          this.subActionTimer = isUrgent ? 0.95 : 1.25;
          this.targetDoor = door;
          this.playAnim(this.anims.openDoor, 0.14, true);
          return { arrived: false, openedDoor: true };
        }
      }
    }

    const tx = nextRoom.center.x;
    const tz = nextRoom.center.z;
    this._moveToward(tx, tz, speed, dt);
    this._tickAudio(dt, distToPlayer, isUrgent, callbacks);

    if (Math.hypot(tx - this.root.position.x, tz - this.root.position.z) < 1.15) {
      this.path.shift();
    }
    return { arrived: this.path.length === 0, openedDoor: false };
  }

  _tickAudio(dt, distToPlayer, isChasing, callbacks) {
    this.stepTimer -= dt;
    if (this.stepTimer <= 0) {
      this.stepTimer = isChasing ? this.stepIntervalChase : this.stepIntervalWalk;
      if (distToPlayer < 30) callbacks.onStep?.(this, distToPlayer, isChasing);
    }
    if (this.growlTimer <= 0 && distToPlayer < 26) {
      this.growlTimer = isChasing ? (3.2 + Math.random() * 2.2) : (7.5 + Math.random() * 8.0);
      callbacks.onGrowl?.(this, distToPlayer, isChasing);
    }
    if (this.voiceTimer <= 0 && distToPlayer < 21) {
      this.voiceTimer = 16.0 + Math.random() * 20.0;
      callbacks.onVoiceLine?.(this, distToPlayer, isChasing);
    }
  }

  _enterSearching() {
    this.state = AIState.SEARCHING;
    this.searchElapsed = 0;
    this.searchInspectTimer = randRange(this.behavior.searchInspectTime[0], this.behavior.searchInspectTime[1]);
    this.searchQueue = this.lastKnownRoomKey ? this._buildLocalSearchQueue(this.lastKnownRoomKey) : [];
    this.path = [];
    this.playAnim(this.anims.search, 0.22);
  }

  _enterReturning(director) {
    director?.releaseHunter(this);
    this.lastKnownPos = null;
    this.lastKnownRoomKey = null;
    this.searchQueue = [];
    this.path = [];

    if (this.isInTerritory(this.currentRoomKey)) {
      this.state = AIState.PATROLLING;
    } else {
      this.state = AIState.RETURNING;
      const homeKey = this._findNearestTerritoryRoom(this.currentRoomKey);
      this.path = this._findRoomPath(this.currentRoomKey, homeKey, false);
    }
  }

  /**
   * Phase 3 (called by HorrorAIDirector): Executes the 7-state FSM.
   * Respects `isAuthorizedHunter` so no two monsters ever chase simultaneously.
   */
  stepBehavior(dt, playerPos, playerRoom, perception, isAuthorizedHunter, director, callbacks = {}) {
    const distToPlayer = perception.dist;

    // Zero-freeze render/skinning/shadow culling:
    // NEVER toggle PointLight.visible (or its parent .visible), which forces WebGL to recompile all shaders!
    const visible = distToPlayer < 40.0;
    if (visible !== this._meshesVisible) {
      this._meshesVisible = visible;
      for (let i = 0; i < this.skinnedMeshes.length; i++) {
        this.skinnedMeshes[i].visible = visible;
      }
    }
    this.eyeGlow.intensity = distToPlayer < 26.0 ? this.eyeLightBaseIntensity : 0;
    const wantShadow = distToPlayer < 22.0;
    if (wantShadow !== this._shadowsEnabled) {
      this._shadowsEnabled = wantShadow;
      for (let i = 0; i < this.skinnedMeshes.length; i++) {
        this.skinnedMeshes[i].castShadow = wantShadow;
      }
    }
    if (visible) this.mixer.update(dt);

    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.growlTimer = Math.max(0, this.growlTimer - dt);
    this.voiceTimer = Math.max(0, this.voiceTimer - dt);

    // 1. Handle active transient sub-actions (attack / open_door) without losing logical AIState
    if (this.subAction === 'attack') {
      this.subActionTimer -= dt;
      if (perception.visible) {
        this._turnToward(playerPos.x, playerPos.z, dt, 9.5);
      }
      if (this.subActionTimer <= 0) {
        this.subAction = null;
      }
      return { distToPlayer, state: this.state };
    }

    if (this.subAction === 'open_door') {
      this.subActionTimer -= dt;
      if (this.targetDoor) {
        this._turnToward(this.targetDoor.center.x, this.targetDoor.center.z, dt, 7.5);
        if (this.subActionTimer < 0.65 && !this.targetDoor.open) {
          callbacks.onOpenDoor?.(this.targetDoor, distToPlayer);
        }
      }
      if (this.subActionTimer <= 0) {
        this.subAction = null;
        this.targetDoor = null;
      }
      return { distToPlayer, state: this.state };
    }

    // 2. Enforce strict Single-Chaser Rule:
    //    If this monster is NOT authorized to hunt, it can NEVER be in player_detected or chasing.
    if (!isAuthorizedHunter && (this.state === AIState.PLAYER_DETECTED || this.state === AIState.CHASING)) {
      this._enterReturning(null);
    }

    // 3. Promotion into PLAYER_DETECTED if authorized by HorrorAIDirector
    if (isAuthorizedHunter && perception.wantsToChase &&
        this.state !== AIState.PLAYER_DETECTED && this.state !== AIState.CHASING) {
      if (this.state === AIState.SEARCHING) {
        // Re-spotted player during active search — snap straight back into CHASING!
        this.state = AIState.CHASING;
        this.path = [];
        callbacks.onSpotPlayer?.(this, distToPlayer);
      } else {
        this.state = AIState.PLAYER_DETECTED;
        this.stateTimer = this.behavior.detectReactionTime;
        this.path = [];
        this.playAnim(this.anims.look, 0.12);
        callbacks.onSpotPlayer?.(this, distToPlayer);
        return { distToPlayer, state: this.state };
      }
    }

    // 4. Promotion into SUSPICIOUS if the monster catches a partial glimpse (or sees player while another hunts)
    if (perception.isAlerted &&
        (this.state === AIState.IDLE || this.state === AIState.PATROLLING || this.state === AIState.RETURNING)) {
      this.state = AIState.SUSPICIOUS;
      this.suspiciousTimer = randRange(2.4, 3.8);
      this.path = [];
    }

    // 5. State-specific execution
    switch (this.state) {
      case AIState.IDLE: {
        this.stateTimer -= dt;
        // Alternate between idle stance and eerie head-look around
        this.playAnim(this.stateTimer < 1.2 ? this.anims.look : this.anims.idle, 0.25);
        // Subtle natural look-around yaw sway
        this.yaw += Math.sin(this.headScanPhase * 0.7) * dt * 0.45;
        this.root.rotation.y = this.yaw;

        if (this.stateTimer <= 0) {
          this.state = AIState.PATROLLING;
          this.path = this._pickNextPatrolPath(this.currentRoomKey);
        }
        break;
      }

      case AIState.PATROLLING: {
        if (!this.isInTerritory(this.currentRoomKey) && this.path.length === 0) {
          this._enterReturning(null);
          break;
        }
        if (this.path.length === 0) {
          this.path = this._pickNextPatrolPath(this.currentRoomKey);
          if (this.path.length === 0) {
            this.state = AIState.IDLE;
            this.stateTimer = randRange(this.behavior.idleDuration[0], this.behavior.idleDuration[1]);
            break;
          }
        }
        this.playAnim(this.anims.walk, 0.2);
        const step = this._followRoomPath(dt, this.walkSpeed, false, distToPlayer, callbacks);
        if (step.arrived) {
          // Natural unpredictable pause at waypoint (75% pause to idle/look, 25% continue patrolling)
          if (Math.random() < 0.75) {
            this.state = AIState.IDLE;
            this.stateTimer = randRange(this.behavior.idleDuration[0], this.behavior.idleDuration[1]);
          } else {
            this.path = this._pickNextPatrolPath(this.currentRoomKey);
          }
        }
        break;
      }

      case AIState.SUSPICIOUS: {
        this.suspiciousTimer -= dt;
        if (this.lastKnownPos) {
          this._turnToward(this.lastKnownPos.x, this.lastKnownPos.z, dt, 5.5);
        }

        // If another monster already holds the chase lock, guard territory cautiously without chasing
        const blockedByOtherHunter = director && director.hasActiveHunter() && !isAuthorizedHunter;
        if (blockedByOtherHunter) {
          this.playAnim(this.anims.look, 0.22);
          if (!perception.visible && this.suspiciousTimer <= 0) {
            this._enterReturning(null);
          }
          break;
        }

        // Creep cautiously toward last known glimpse ONLY if inside own territory
        if (this.lastKnownPos && this.lastKnownRoomKey && this.isInTerritory(this.lastKnownRoomKey) &&
            this.lastKnownRoomKey === this.currentRoomKey) {
          const d = Math.hypot(this.lastKnownPos.x - this.root.position.x, this.lastKnownPos.z - this.root.position.z);
          if (d > 2.0) {
            this.playAnim(this.anims.walk, 0.2);
            this._moveToward(this.lastKnownPos.x, this.lastKnownPos.z, this.walkSpeed * 0.65, dt);
          } else {
            this.playAnim(this.anims.search, 0.22);
          }
        } else {
          this.playAnim(this.anims.look, 0.22);
        }

        if (perception.visible) {
          this.suspiciousTimer = Math.max(this.suspiciousTimer, 1.5);
        } else if (this.suspiciousTimer <= 0 && this.awareness < 0.2) {
          this._enterReturning(null);
        }
        break;
      }

      case AIState.PLAYER_DETECTED: {
        this.stateTimer -= dt;
        if (this.lastKnownPos) {
          this._turnToward(this.lastKnownPos.x, this.lastKnownPos.z, dt, 10.0);
        }
        if (this.stateTimer <= 0) {
          this.state = AIState.CHASING;
          this.path = [];
        }
        break;
      }

      case AIState.CHASING: {
        // Melee attack ONLY when close AND unobstructed LOS (never through walls or closed doors)
        if (perception.hasLos && distToPlayer < 1.85 && this.attackCooldown <= 0) {
          this.subAction = 'attack';
          this.subActionTimer = 1.1;
          this.attackCooldown = 1.85;
          this.playAnim(this.anims.attack, 0.1, true);
          callbacks.onAttack?.(this);
          break;
        }

        if (!this.lastKnownPos || !this.lastKnownRoomKey) {
          this._enterSearching();
          break;
        }

        // Never cheat: pursue ONLY lastKnownPos / lastKnownRoomKey (updated solely when vision.visible is true)
        this.playAnim(this.anims.chase, 0.16);

        if (this.currentRoomKey === this.lastKnownRoomKey) {
          this.path = [];
          const reachedLkp = this._moveToward(this.lastKnownPos.x, this.lastKnownPos.z, this.chaseSpeed, dt);
          this._tickAudio(dt, distToPlayer, true, callbacks);

          // If player escaped vision and we arrived at their last visible spot -> SEARCH!
          if (!perception.visible && reachedLkp) {
            this._enterSearching();
            break;
          }
        } else {
          if (this.path.length === 0 || this.path[this.path.length - 1] !== this.lastKnownRoomKey) {
            this.path = this._findRoomPath(this.currentRoomKey, this.lastKnownRoomKey, false);
          }
          if (this.path.length === 0) {
            this._enterSearching();
            break;
          }
          const step = this._followRoomPath(dt, this.chaseSpeed, true, distToPlayer, callbacks);
          if (!perception.visible && step.arrived) {
            this._enterSearching();
            break;
          }
        }

        // Safety fallback: if blind for too long without reaching LKP (e.g., player escaped far away)
        if (!perception.visible && this.timeSinceLastSeen > 5.0) {
          this._enterSearching();
        }
        break;
      }

      case AIState.SEARCHING: {
        this.searchElapsed += dt;

        // If player is spotted again with clear LOS while searching -> resume CHASING immediately!
        if (isAuthorizedHunter && perception.visible && this.awareness >= 0.45) {
          this.state = AIState.CHASING;
          this.path = [];
          callbacks.onSpotPlayer?.(this, distToPlayer);
          break;
        }

        // Give up search after max duration and return to territory
        if (this.searchElapsed >= this.behavior.maxSearchDuration) {
          this._enterReturning(director);
          break;
        }

        // Inspect current spot before moving to the next candidate room
        if (this.searchInspectTimer > 0) {
          this.searchInspectTimer -= dt;
          this.playAnim(this.searchInspectTimer > 1.0 ? this.anims.search : this.anims.look, 0.24);
          this.yaw += Math.sin(this.headScanPhase * 1.4) * dt * 1.25;
          this.root.rotation.y = this.yaw;
          break;
        }

        // Move to next nearby room in searchQueue
        if (this.path.length === 0) {
          if (this.searchQueue.length === 0) {
            this._enterReturning(director);
            break;
          }
          const nextSearchRoom = this.searchQueue.shift();
          this.path = this._findRoomPath(this.currentRoomKey, nextSearchRoom, false);
          if (this.path.length === 0) {
            this.searchInspectTimer = randRange(1.2, 2.0);
            break;
          }
        }

        this.playAnim(this.anims.walk, 0.2);
        const step = this._followRoomPath(dt, this.walkSpeed * 1.15, false, distToPlayer, callbacks);
        if (step.arrived) {
          this.searchInspectTimer = randRange(this.behavior.searchInspectTime[0], this.behavior.searchInspectTime[1]);
        }
        break;
      }

      case AIState.RETURNING: {
        if (this.isInTerritory(this.currentRoomKey)) {
          this.state = AIState.PATROLLING;
          this.path = this._pickNextPatrolPath(this.currentRoomKey);
          break;
        }
        if (this.path.length === 0) {
          const homeKey = this._findNearestTerritoryRoom(this.currentRoomKey);
          this.path = this._findRoomPath(this.currentRoomKey, homeKey, false);
          if (this.path.length === 0) {
            this.state = AIState.IDLE;
            this.stateTimer = 2.0;
            break;
          }
        }
        this.playAnim(this.anims.walk, 0.2);
        const step = this._followRoomPath(dt, this.walkSpeed, false, distToPlayer, callbacks);
        if (step.arrived) {
          this.state = AIState.IDLE;
          this.stateTimer = randRange(this.behavior.idleDuration[0], this.behavior.idleDuration[1]);
        }
        break;
      }
    }

    return { distToPlayer, state: this.state };
  }
}

export { HorrorCharacterAI as CrawlingCreatureAI };
