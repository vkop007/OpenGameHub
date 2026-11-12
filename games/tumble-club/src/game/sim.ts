import * as THREE from "three";
import {
  ACCEL,
  AIR_ACCEL,
  CharacterDef,
  CHARACTERS,
  clamp,
  COYOTE_TIME,
  damp,
  dampAngle,
  emptyInput,
  FRICTION,
  GRAVITY,
  HudState,
  JUMP_BUFFER,
  JUMP_HOLD_TIME,
  JUMP_VELOCITY,
  KICK_RANGE,
  lerp,
  PlayerInput,
  RaceResult,
  RACER_HEIGHT,
  RACER_RADIUS,
  RacerState,
  rand,
  RUN_SPEED,
  STEP_UP,
  TOTAL_RACERS,
  WATER_Y,
} from "./core";
import {
  buildCourse,
  Course,
  createBallMesh,
  createSnowballMesh,
  geyserState,
  geyserTimeToErupt,
  gustStrength,
  hammerHits,
  pistonExtension,
  Section,
  Surface,
  surfaceContains,
  surfaceTop,
  updateCourse,
  updateSeesaws,
  updateSinkers,
} from "./course";
import { LevelDef } from "./levels";
import { sfx } from "./audio";

export interface Ball {
  mesh: THREE.Group;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  radius: number;
  state: "chute" | "drop" | "roll" | "dead";
  t: number;
  spin: number;
  style: "beach" | "snow";
}

export interface Effect {
  kind: "splash" | "hit" | "zap" | "kick" | "checkpoint" | "bounce" | "erupt";
  pos: THREE.Vector3;
  t: number;
  life: number;
}

interface AIState {
  lane: number;
  think: number;
  wait: boolean;
  jumpCd: number;
  mistake: number;
  stuck: number;
  checkT: number;
  lastZ: number;
  dodgeX: number;
  dodgeTimer: number;
  tileSkill: number;
  tileChoice: Map<number, number>;
}

export interface Racer {
  id: number;
  def: CharacterDef;
  isPlayer: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  yaw: number;
  grounded: boolean;
  ground: Surface | null;
  groundY: number;
  coyote: number;
  jumpBuffer: number;
  jumpTimer: number;
  state: RacerState;
  stateTimer: number;
  tumbleTimer: number;
  invuln: number;
  stun: number;
  diveCooldown: number;
  kickCooldown: number;
  kickTimer: number;
  bumpCd: number;
  animPhase: number;
  squash: number;
  cheerTime: number;
  finished: boolean;
  finishTime: number;
  place: number;
  splashes: number;
  zaps: number;
  checkpoint: number;
  respawn: THREE.Vector3;
  respawnYaw: number;
  speedMul: number;
  ai: AIState;
  input: PlayerInput;
  progress: number;
}

const makeAI = (lane: number): AIState => ({
  lane,
  think: 0,
  wait: false,
  jumpCd: 0,
  mistake: rand(4, 9),
  stuck: 0,
  checkT: 0,
  lastZ: 0,
  dodgeX: 0,
  dodgeTimer: 0,
  tileSkill: rand(0.55, 0.85),
  tileChoice: new Map(),
});

interface Plan {
  tx: number;
  tz: number;
  speed: number;
  jump: boolean;
  custom: { x: number; z: number } | null;
}

export class RaceSim {
  level: LevelDef;
  course: Course;
  racers: Racer[] = [];
  player!: Racer;
  time = 0;
  phase: "countdown" | "racing" | "finished" = "countdown";
  countdown = 3.0;
  autoPlay = false;
  balls: Ball[] = [];
  effects: Effect[] = [];
  ballTimer = 1.2;
  snowTimer = 2.0;
  redPhase: "green" | "yellow" | "red" = "green";
  redTimer = 4.4;
  redGrace = 0;
  banner = "GREEN LIGHT · RUN!";
  bannerTone: HudState["bannerTone"] = "green";
  playerFinished = false;
  results: RaceResult[] | null = null;
  finishDelay = 0;
  section = "Start";
  checkpointFlash = 0;
  splashFlash = 0;
  zapFlash = 0;

  constructor(level: LevelDef) {
    this.level = level;
    this.course = buildCourse(level);
    this.reset();
  }

  reset() {
    const course = this.course;
    this.time = 0;
    this.phase = "countdown";
    this.countdown = 3.0;
    this.balls.forEach((b) => course.group.remove(b.mesh));
    this.balls = [];
    this.effects = [];
    this.ballTimer = 1.2;
    this.snowTimer = 2.0;
    this.redPhase = "green";
    this.redTimer = 4.4 * course.mods.greenTime;
    this.redGrace = 0;
    this.banner = "GREEN LIGHT · RUN!";
    this.bannerTone = "green";
    this.playerFinished = false;
    this.results = null;
    this.finishDelay = 0;
    this.checkpointFlash = 0;
    this.splashFlash = 0;
    this.zapFlash = 0;
    this.racers = [];
    for (let i = 0; i < TOTAL_RACERS; i++) {
      const def = CHARACTERS[i];
      const sp = course.startPositions[i];
      const isPlayer = i === 0;
      const racer: Racer = {
        id: i,
        def,
        isPlayer,
        pos: new THREE.Vector3(sp.x, sp.y, sp.z),
        vel: new THREE.Vector3(),
        yaw: sp.yaw,
        grounded: true,
        ground: null,
        groundY: 0,
        coyote: 0,
        jumpBuffer: 0,
        jumpTimer: 0,
        state: "idle",
        stateTimer: 0,
        tumbleTimer: 0,
        invuln: 0,
        stun: 0,
        diveCooldown: 0,
        kickCooldown: 0,
        kickTimer: 0,
        bumpCd: 0,
        animPhase: rand(0, 6),
        squash: 0,
        cheerTime: 0,
        finished: false,
        finishTime: 0,
        place: 0,
        splashes: 0,
        zaps: 0,
        checkpoint: 0,
        respawn: new THREE.Vector3(sp.x, sp.y, sp.z),
        respawnYaw: sp.yaw,
        speedMul: isPlayer ? 1 : def.speed / RUN_SPEED,
        ai: makeAI(def.lane),
        input: emptyInput(),
        progress: 0,
      };
      if (isPlayer) this.player = racer;
      this.racers.push(racer);
    }
    // new random safe path every race, all tiles back in place
    if (course.tiles.length) {
      let col = 2;
      for (let r = 0; r < course.tileRows; r++) {
        if (r > 0) {
          const dir = Math.random() < 0.5 ? -1 : 1;
          col = clamp(col + (Math.random() < 0.72 ? dir : -dir), 0, course.tileCols - 1);
        }
        course.safePath[r] = col;
      }
    }
    for (const tile of course.tiles) {
      tile.state = course.safePath[tile.row] === tile.col ? "safe" : "fake";
      tile.revealed = false;
      tile.proven = false;
      tile.timer = 0;
      tile.drop = 0;
      tile.active = true;
      tile.surface.active = true;
      tile.mesh.position.set(tile.x, 0, tile.z);
      tile.mesh.rotation.set(0, 0, 0);
    }
    for (const s of course.seesaws) s.tilt = 0;
    for (const p of course.pads) p.squish = 0;
    for (const s of course.sinks) {
      s.active = true;
      s.sink!.timer = 0;
      s.sink!.respawn = 0;
      s.y = s.sink!.baseY;
      s.mesh!.visible = true;
      s.mesh!.position.set(s.x, 0, s.z);
    }
    for (const b of course.bumpers) b.flash = 0;
    this.updateRanking();
  }

  /* ------------------------------------------------------------------ */
  /*  Main fixed step                                                    */
  /* ------------------------------------------------------------------ */

  step(dt: number, input: PlayerInput) {
    dt = Math.min(dt, 1 / 30);
    this.checkpointFlash = Math.max(0, this.checkpointFlash - dt);
    this.splashFlash = Math.max(0, this.splashFlash - dt);
    this.zapFlash = Math.max(0, this.zapFlash - dt);

    if (this.phase === "countdown") {
      const before = Math.ceil(this.countdown);
      this.countdown -= dt;
      const after = Math.ceil(this.countdown);
      if (after !== before && after >= 0) sfx.countdown(after);
      this.animateIdle(dt);
      updateCourse(this.course, dt, this.time);
      if (this.countdown <= 0) {
        this.phase = "racing";
        sfx.go();
      }
      return;
    }

    this.time += dt;
    this.player.input = input;

    // moving platforms carry their riders
    const moving = this.course.movers;
    const before = moving.map((s) => ({ x: s.x, y: s.y, z: s.z }));
    updateCourse(this.course, dt, this.time);
    for (let i = 0; i < moving.length; i++) {
      const s = moving[i];
      const dx = s.x - before[i].x;
      const dy = s.y - before[i].y;
      const dz = s.z - before[i].z;
      if (dx === 0 && dy === 0 && dz === 0) continue;
      for (const r of this.racers) {
        if (r.ground === s) {
          r.pos.x += dx;
          r.pos.y += dy;
          r.pos.z += dz;
        }
      }
    }

    updateSeesaws(this.course, this.racers.map((r) => ({ x: r.pos.x, z: r.pos.z, on: r.ground })), dt);
    updateSinkers(this.course, this.racers, dt, this.time);
    this.updateRedLight(dt);
    this.updateBalls(dt);
    this.updateSnow(dt);
    this.hazardSounds();

    for (const r of this.racers) {
      if (!(r.isPlayer && !this.autoPlay)) this.updateAI(r, dt);
      this.stepRacer(r, dt);
    }

    this.separateRacers();
    this.obstacleCollisions();
    this.tileChecks();
    this.postChecks();
    this.updateEffects(dt);
    this.updateRanking();
    this.updateSection();

    if (this.playerFinished && !this.results) {
      this.finishDelay += dt;
      if (this.finishDelay > 1.15) this.buildResults();
    }
  }

  private animateIdle(dt: number) {
    for (const r of this.racers) {
      r.animPhase += dt * 2;
      r.squash = damp(r.squash, 0, 8, dt);
      r.state = "idle";
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Red light                                                          */
  /* ------------------------------------------------------------------ */

  private updateRedLight(dt: number) {
    const rl = this.course.rl;
    if (!rl) return;
    const mods = this.course.mods;
    this.redTimer -= dt;
    if (this.redTimer <= 0) {
      if (this.redPhase === "green") {
        this.redPhase = "yellow";
        this.redTimer = 1.35;
        this.banner = "GET READY TO FREEZE…";
        this.bannerTone = "yellow";
        sfx.yellow();
      } else if (this.redPhase === "yellow") {
        this.redPhase = "red";
        this.redTimer = 3.1 * mods.redTime;
        this.redGrace = 0.42;
        this.banner = "RED LIGHT · FREEZE!";
        this.bannerTone = "red";
        sfx.red();
      } else {
        this.redPhase = "green";
        this.redTimer = 4.5 * mods.greenTime;
        this.banner = "GREEN LIGHT · RUN!";
        this.bannerTone = "green";
        sfx.green();
      }
    }
    if (this.redPhase === "red") this.redGrace = Math.max(0, this.redGrace - dt);

    const targetRot = this.redPhase === "red" ? 0 : Math.PI;
    rl.toy.rotation.y = dampAngle(rl.toy.rotation.y, targetRot, 9, dt);
    const eyeTarget = this.redPhase === "red" ? 2.6 + Math.sin(this.time * 14) * 0.5 : this.redPhase === "yellow" ? 0.5 : 0.08;
    rl.eyeMat.emissiveIntensity = damp(rl.eyeMat.emissiveIntensity, eyeTarget, 10, dt);
    rl.glow.intensity = damp(rl.glow.intensity, this.redPhase === "red" ? 40 : 0, 8, dt);
    const col = this.redPhase === "red" ? 0xff3b2f : this.redPhase === "yellow" ? 0xffc93c : 0x39d98a;
    rl.stripMat.color.setHex(col);
    rl.stripMat.emissive.setHex(col);
    rl.stripMat.emissiveIntensity = this.redPhase === "red" ? 1.5 + Math.sin(this.time * 12) * 0.5 : this.redPhase === "yellow" ? 1.1 + Math.sin(this.time * 16) * 0.5 : 0.9;
    const active = this.redPhase === "green" ? 0 : this.redPhase === "yellow" ? 1 : 2;
    rl.lamps.forEach((m, i) => {
      m.emissiveIntensity = damp(m.emissiveIntensity, i === active ? 3.6 : 0.08, 14, dt);
    });

    if (this.redPhase === "red" && this.redGrace <= 0) {
      for (const r of this.racers) {
        if (r.finished) continue;
        if (r.pos.z > rl.zoneHi || r.pos.z < rl.zoneLo) continue;
        const speed = Math.hypot(r.vel.x, r.vel.z);
        const wants = Math.hypot(r.input.x, r.input.z) > 0.15;
        if (speed > 0.85 || wants) this.zap(r);
      }
    }
  }

  private zap(r: Racer) {
    if (r.invuln > 0) return;
    const rl = this.course.rl!;
    r.pos.set(clamp(r.pos.x, -8, 8), 0.05, rl.zapZ);
    r.vel.set(0, 0, 0);
    r.state = "zapped";
    r.stateTimer = 0.75;
    r.invuln = 1.3;
    r.zaps++;
    r.grounded = true;
    r.ground = null;
    this.effects.push({ kind: "zap", pos: r.pos.clone(), t: 0, life: 0.6 });
    if (r.isPlayer) {
      this.zapFlash = 0.8;
      sfx.zap();
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Balls                                                              */
  /* ------------------------------------------------------------------ */

  private updateBalls(dt: number) {
    const ramp = this.course.ramp;
    if (!ramp) return;
    this.ballTimer -= dt;
    const active = this.balls.filter((b) => b.state !== "dead").length;
    if (this.ballTimer <= 0 && active < 7) {
      this.ballTimer = rand(1.55, 2.05) * this.course.mods.ballInterval;
      const mesh = createBallMesh(1.0);
      const pos = ramp.chuteCurve.getPoint(0).clone();
      mesh.position.copy(pos);
      this.course.group.add(mesh);
      this.balls.push({ mesh, pos, vel: new THREE.Vector3(), radius: 1.0, state: "chute", t: 0, spin: 0, style: "beach" });
    }
    for (const b of this.balls) {
      if (b.state === "chute") {
        b.t += dt * 0.62;
        if (b.t >= 1) {
          b.t = 1;
          b.state = "drop";
          b.pos.copy(ramp.chuteLip);
          b.vel.set(rand(-0.4, 0.4), -1.5, 2.4);
        } else {
          b.pos.copy(ramp.chuteCurve.getPoint(b.t));
        }
      } else if (b.state === "drop" || b.state === "roll") {
        b.vel.y -= GRAVITY * dt;
        b.pos.addScaledVector(b.vel, dt);
        const top = this.ballSupportTop(b.pos.x, b.pos.z);
        if (top !== null && b.pos.y - b.radius <= top + 0.06 && b.vel.y <= 0) {
          b.pos.y = top + b.radius;
          b.vel.y = 0;
          if (b.state === "drop") {
            b.state = "roll";
            b.vel.z = 3.2;
            sfx.thud();
            this.effects.push({ kind: "hit", pos: b.pos.clone(), t: 0, life: 0.35 });
          }
          const onRamp = b.pos.z > ramp.rampLo && b.pos.z < ramp.rampHi;
          b.vel.z += (onRamp ? 9.0 : 2.0) * dt;
          b.vel.z = Math.min(b.vel.z, 10.5);
          b.vel.x *= 1 - 1.6 * dt;
        }
        if (b.pos.z > ramp.killZ && b.state === "roll") {
          b.state = "dead";
          b.vel.x = b.pos.x > 0 ? 5 : -5;
          b.vel.z = 1.5;
        }
        b.spin += b.vel.z * dt * 0.9;
      } else {
        b.vel.y -= GRAVITY * dt;
        b.pos.addScaledVector(b.vel, dt);
        const top = this.ballSupportTop(b.pos.x, b.pos.z);
        if (top !== null && b.pos.y - b.radius <= top && b.vel.y <= 0) {
          b.pos.y = top + b.radius;
          b.vel.y = 0;
        }
        b.spin += b.vel.x * dt * 0.6;
        if (b.pos.y < WATER_Y + 1.5) b.mesh.scale.multiplyScalar(1 - dt * 3);
      }
      b.mesh.position.copy(b.pos);
      b.mesh.rotation.x = b.spin;
      b.mesh.rotation.z = b.spin * 0.4;
    }
    this.balls = this.balls.filter((b) => {
      if (b.state === "dead" && (b.pos.y < WATER_Y - 1 || b.mesh.scale.x < 0.2)) {
        this.course.group.remove(b.mesh);
        return false;
      }
      return true;
    });
  }

  private ballSupportTop(x: number, z: number): number | null {
    const r = this.course.ramp!;
    if (Math.abs(x) < r.w / 2 && z <= r.zBottom && z >= r.zTop) {
      const t = clamp((z - r.zTop) / (r.zBottom - r.zTop), 0, 1);
      return lerp(r.yTop, r.yBottom, t);
    }
    if (Math.abs(x) < 5.5 && z <= r.platZ1 && z >= r.platZ0) return r.yTop;
    return null;
  }

  /* ------------------------------------------------------------------ */
  /*  Avalanche snowballs (roll downhill, chasing the racers)            */
  /* ------------------------------------------------------------------ */

  private updateSnow(dt: number) {
    const info = this.course.snow;
    if (!info) return;
    this.snowTimer -= dt;
    const active = this.balls.filter((b) => b.style === "snow" && b.state !== "dead").length;
    if (this.snowTimer <= 0 && active < 6) {
      this.snowTimer = rand(0.9, 1.4) * this.course.mods.ballInterval;
      const mesh = createSnowballMesh(1.1);
      const pos = new THREE.Vector3(rand(-4.2, 4.2), info.yTop + 1.1, info.zTop + 0.6);
      mesh.position.copy(pos);
      this.course.group.add(mesh);
      this.balls.push({
        mesh,
        pos,
        vel: new THREE.Vector3(rand(-0.5, 0.5), 0, -3),
        radius: 1.1,
        state: "roll",
        t: 0,
        spin: 0,
        style: "snow",
      });
    }
    for (const b of this.balls) {
      if (b.style !== "snow" || b.state === "dead") continue;
      b.vel.z = Math.max(b.vel.z - 6.5 * dt, -12.5);
      b.vel.x *= 1 - 0.4 * dt;
      b.pos.x += b.vel.x * dt;
      b.pos.z += b.vel.z * dt;
      const top = this.snowSupportTop(b.pos.x, b.pos.z);
      if (top !== null) {
        b.pos.y = top + b.radius;
        b.vel.y = 0;
      } else {
        b.vel.y -= GRAVITY * dt;
        b.pos.y += b.vel.y * dt;
      }
      const half = info.w / 2 - b.radius * 0.5;
      if (b.pos.x > half) {
        b.pos.x = half;
        b.vel.x = -Math.abs(b.vel.x);
      } else if (b.pos.x < -half) {
        b.pos.x = -half;
        b.vel.x = Math.abs(b.vel.x);
      }
      if (b.pos.z < info.killZ) {
        b.state = "dead";
        b.vel.set(b.pos.x > 0 ? 4 : -4, 1, -1);
      }
      b.spin += -b.vel.z * dt * 0.9;
      b.mesh.position.copy(b.pos);
      b.mesh.rotation.x = b.spin;
      b.mesh.rotation.z = b.spin * 0.4;
    }
  }

  private snowSupportTop(x: number, z: number): number | null {
    const r = this.course.snow!;
    if (Math.abs(x) < r.w / 2 + 0.4 && z <= r.zTop && z >= r.zBottom) {
      const t = clamp((z - r.zTop) / (r.zBottom - r.zTop), 0, 1);
      return lerp(r.yTop, r.yBottom, t);
    }
    return null;
  }

  /** Piston slams + nearby geyser eruptions (player-gated so it never spams). */
  private hazardSounds() {
    const p = this.player.pos;
    for (const w of this.course.walls) {
      if (w.kind !== "piston") continue;
      const e = pistonExtension(w, this.time);
      const was = w.pe ?? 0;
      w.pe = e;
      if (e > 0.97 && was <= 0.97) {
        const d = Math.hypot(w.x - p.x, w.z - p.z);
        if (d < 16) sfx.piston();
      }
    }
    for (const g of this.course.geysers) {
      if (geyserState(g, this.time) !== "erupt" || g.audited) continue;
      g.audited = true;
      const d = Math.hypot(g.x - p.x, g.z - p.z);
      if (d < 18) sfx.erupt();
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Racer physics                                                      */
  /* ------------------------------------------------------------------ */

  private stepRacer(r: Racer, dt: number) {
    r.invuln = Math.max(0, r.invuln - dt);
    r.stun = Math.max(0, r.stun - dt);
    r.diveCooldown = Math.max(0, r.diveCooldown - dt);
    r.kickCooldown = Math.max(0, r.kickCooldown - dt);
    r.kickTimer = Math.max(0, r.kickTimer - dt);
    r.bumpCd = Math.max(0, r.bumpCd - dt);
    r.jumpBuffer = Math.max(0, r.jumpBuffer - dt);
    r.coyote = Math.max(0, r.coyote - dt);
    r.animPhase += dt * (4 + Math.hypot(r.vel.x, r.vel.z) * 1.15);
    r.squash = damp(r.squash, 0, 9, dt);

    const inp = r.input;
    const st = r.state as RacerState;
    const canControl = !r.finished && st !== "tumble" && st !== "zapped" && r.stun <= 0 && st !== "dive";
    let mx = 0;
    let mz = 0;
    if (canControl) {
      mx = inp.x;
      mz = inp.z;
      const mag = Math.hypot(mx, mz);
      if (mag > 1) {
        mx /= mag;
        mz /= mag;
      }
    }

    if (st === "tumble") {
      r.tumbleTimer -= dt;
      if (r.tumbleTimer <= 0) {
        r.state = r.grounded ? "run" : "air";
        r.stun = 0.22;
        r.squash = 0.2;
      }
    } else if (st === "zapped") {
      r.stateTimer -= dt;
      if (r.stateTimer <= 0) r.state = "idle";
    } else if (st === "dive") {
      r.stateTimer -= dt;
      if (r.stateTimer <= 0 && r.grounded) {
        r.state = "run";
        r.squash = 0.35;
      }
    } else if (r.finished) {
      r.state = r.cheerTime > 0 ? "cheer" : "run";
    } else if (r.grounded) {
      r.state = Math.hypot(r.vel.x, r.vel.z) > 0.6 ? "run" : "idle";
    } else {
      r.state = "air";
    }

    // jump (buffered, coyote, variable height)
    if (canControl && inp.jumpPressed) r.jumpBuffer = JUMP_BUFFER;
    if (r.jumpBuffer > 0 && (r.grounded || r.coyote > 0) && canControl) {
      r.vel.y = JUMP_VELOCITY;
      r.grounded = false;
      r.coyote = 0;
      r.jumpBuffer = 0;
      r.jumpTimer = JUMP_HOLD_TIME;
      r.squash = -0.32;
      if (r.isPlayer) sfx.jump();
    }
    if (r.jumpTimer > 0 && inp.jump && r.vel.y > 0 && canControl) r.jumpTimer -= dt;
    else r.jumpTimer = 0;

    // belly-flop dive
    if (canControl && inp.dive && r.grounded && r.diveCooldown <= 0) {
      const f = this.forward(r);
      r.state = "dive";
      r.stateTimer = 0.62;
      r.diveCooldown = 1.15;
      r.vel.x = f.x * 13.5;
      r.vel.z = f.z * 13.5;
      r.vel.y = 3.4;
      r.grounded = false;
      r.squash = -0.25;
      if (r.isPlayer) sfx.dive();
    }

    // kick (player only)
    if (r.isPlayer && canControl && inp.kick && r.kickCooldown <= 0) {
      r.kickCooldown = 0.85;
      r.kickTimer = 0.28;
      const f = this.forward(r);
      r.vel.x += f.x * 4.2;
      r.vel.z += f.z * 4.2;
      sfx.kick();
      this.effects.push({ kind: "kick", pos: r.pos.clone().add(new THREE.Vector3(f.x * 1.4, 0.9, f.z * 1.4)), t: 0, life: 0.3 });
      for (const o of this.racers) {
        if (o === r || o.finished) continue;
        const dx = o.pos.x - r.pos.x;
        const dz = o.pos.z - r.pos.z;
        const dist = Math.hypot(dx, dz);
        if (dist > KICK_RANGE || dist < 0.01) continue;
        const dot = (dx / dist) * f.x + (dz / dist) * f.z;
        if (dot < 0.15) continue;
        if (Math.abs(o.pos.y - r.pos.y) > 2.2) continue;
        const nx = dx / dist;
        const nz = dz / dist;
        o.vel.x = nx * 12.5 + f.x * 2;
        o.vel.z = nz * 12.5 + f.z * 2;
        o.vel.y = 5.4;
        o.state = "tumble";
        o.tumbleTimer = 1.05;
        o.invuln = 1.5;
        o.grounded = false;
        o.ground = null;
        this.effects.push({ kind: "hit", pos: o.pos.clone().add(new THREE.Vector3(0, 1, 0)), t: 0, life: 0.4 });
        sfx.hit();
      }
    }

    // horizontal movement (ice grip makes steering + braking slidey)
    const grip = r.grounded ? (r.ground?.friction ?? 1) : 1;
    const maxSpeed = RUN_SPEED * r.speedMul * (r.state === "dive" ? 1.5 : 1);
    const accel = (r.grounded ? ACCEL : AIR_ACCEL) * (r.grounded ? Math.max(0.22, grip) : 1);
    const targetX = mx * maxSpeed;
    const targetZ = mz * maxSpeed;
    if (r.state === "dive") {
      r.vel.x *= 1 - 0.6 * dt;
      r.vel.z *= 1 - 0.6 * dt;
    } else if (canControl) {
      r.vel.x = this.approach(r.vel.x, targetX, accel * dt);
      r.vel.z = this.approach(r.vel.z, targetZ, accel * dt);
    } else if (r.grounded) {
      r.vel.x = this.approach(r.vel.x, 0, FRICTION * grip * dt);
      r.vel.z = this.approach(r.vel.z, 0, FRICTION * grip * dt);
    } else {
      r.vel.x *= 1 - 0.4 * dt;
      r.vel.z *= 1 - 0.4 * dt;
    }

    if (r.grounded && r.ground?.kind === "seesaw") r.vel.z += Math.tan(r.ground.tilt ?? 0) * 34 * dt;
    if (r.grounded && r.ground?.kind === "ramp") r.vel.z -= 5.5 * dt;

    if (canControl && (Math.abs(mx) > 0.05 || Math.abs(mz) > 0.05)) {
      r.yaw = dampAngle(r.yaw, Math.atan2(mx, mz), 14, dt);
    }

    // conveyor belts carry grounded racers backwards
    const belt = r.grounded && r.ground?.belt ? r.ground.belt : 0;
    // blizzard gusts shove racers sideways (grounded or airborne)
    for (const wz of this.course.winds) {
      if (r.pos.x < wz.x0 || r.pos.x > wz.x1 || r.pos.z > wz.z0 || r.pos.z < wz.z1 || r.pos.y > 5) continue;
      r.vel.x += wz.dir * gustStrength(wz, this.time) * 1.6 * dt;
    }
    r.pos.x += r.vel.x * dt;
    r.pos.z += (r.vel.z + belt) * dt;
    this.resolveWalls(r);

    const prevY = r.pos.y;
    const gravityScale = r.jumpTimer > 0 && r.vel.y > 0 ? 0.55 : 1;
    r.vel.y -= GRAVITY * gravityScale * dt;
    r.pos.y += r.vel.y * dt;
    this.resolveGround(r, prevY);

    if (r.pos.x > 30) r.pos.x = 30;
    if (r.pos.x < -30) r.pos.x = -30;
  }

  private approach(v: number, target: number, delta: number) {
    if (v < target) return Math.min(v + delta, target);
    return Math.max(v - delta, target);
  }

  private forward(r: Racer) {
    return { x: Math.sin(r.yaw), z: Math.cos(r.yaw) };
  }

  private resolveWalls(r: Racer) {
    for (const w of this.course.walls) {
      if (!w.active) continue;
      if (r.pos.y >= w.y1 - 0.04) continue;
      if (r.pos.y + RACER_HEIGHT <= w.y0) continue;
      const cx = clamp(r.pos.x, w.x - w.w / 2, w.x + w.w / 2);
      const cz = clamp(r.pos.z, w.z - w.d / 2, w.z + w.d / 2);
      let dx = r.pos.x - cx;
      let dz = r.pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= RACER_RADIUS * RACER_RADIUS) continue;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        dx /= d;
        dz /= d;
        const push = RACER_RADIUS - d;
        r.pos.x += dx * push;
        r.pos.z += dz * push;
        const vn = r.vel.x * dx + r.vel.z * dz;
        if (vn < 0) {
          r.vel.x -= vn * dx;
          r.vel.z -= vn * dz;
        }
      } else {
        const px = w.w / 2 + RACER_RADIUS - Math.abs(r.pos.x - w.x);
        const pz = w.d / 2 + RACER_RADIUS - Math.abs(r.pos.z - w.z);
        if (px < pz) {
          r.pos.x += Math.sign(r.pos.x - w.x || 1) * px;
          r.vel.x = 0;
        } else {
          r.pos.z += Math.sign(r.pos.z - w.z || 1) * pz;
          r.vel.z = 0;
        }
      }
    }
  }

  /** Racers are soft bodies: they shove each other apart, which crowds the gaps. */
  private separateRacers() {
    const rs = this.racers;
    const minD = RACER_RADIUS * 1.7;
    for (let i = 0; i < rs.length; i++) {
      const a = rs[i];
      for (let j = i + 1; j < rs.length; j++) {
        const b = rs[j];
        if (Math.abs(a.pos.y - b.pos.y) > RACER_HEIGHT * 0.8) continue;
        const dx = b.pos.x - a.pos.x;
        const dz = b.pos.z - a.pos.z;
        const d2 = dx * dx + dz * dz;
        if (d2 >= minD * minD || d2 < 1e-6) continue;
        const d = Math.sqrt(d2);
        const push = (minD - d) * 0.5;
        const nx = dx / d;
        const nz = dz / d;
        a.pos.x -= nx * push;
        a.pos.z -= nz * push;
        b.pos.x += nx * push;
        b.pos.z += nz * push;
        // damp the closing speed a little so lines bunch up instead of tunnelling
        const rel = (b.vel.x - a.vel.x) * nx + (b.vel.z - a.vel.z) * nz;
        if (rel < 0) {
          const j2 = rel * 0.25;
          a.vel.x += nx * j2;
          a.vel.z += nz * j2;
          b.vel.x -= nx * j2;
          b.vel.z -= nz * j2;
        }
      }
    }
    for (const r of rs) this.resolveWalls(r);
  }

  private resolveGround(r: Racer, prevY: number) {
    let best: Surface | null = null;
    let bestTop = -Infinity;
    for (const s of this.course.surfaces) {
      if (!s.active) continue;
      if (!surfaceContains(s, r.pos.x, r.pos.z, RACER_RADIUS * 0.45)) continue;
      const top = surfaceTop(s, r.pos.z);
      if (top > prevY + STEP_UP + 0.02) continue;
      const landing = prevY >= top - 0.06 && r.pos.y <= top + 0.06 && r.vel.y <= 0.5;
      const stepUp = r.grounded && top <= prevY + STEP_UP && top >= prevY - 0.4;
      if ((landing || stepUp) && top > bestTop) {
        best = s;
        bestTop = top;
      }
    }
    if (best && best.bounce) {
      // trampoline: launch instead of landing
      r.pos.y = bestTop;
      r.vel.y = best.bounce + (r.input.jump && !r.isPlayer ? 0 : r.input.jump ? 1.6 : 0);
      r.grounded = false;
      r.ground = null;
      r.coyote = 0;
      r.squash = -0.35;
      best.squish = 1;
      if (r.state !== "tumble") r.state = "air";
      this.effects.push({ kind: "bounce", pos: new THREE.Vector3(r.pos.x, bestTop, r.pos.z), t: 0, life: 0.45 });
      if (r.isPlayer) sfx.boing();
      return;
    }
    if (best) {
      if (!r.grounded && r.vel.y < -7) {
        r.squash = clamp(-r.vel.y * 0.035, 0.12, 0.42);
        if (r.isPlayer) sfx.land();
      }
      if (r.state === "dive") {
        r.vel.x *= 0.72;
        r.vel.z *= 0.72;
      }
      r.pos.y = bestTop;
      r.vel.y = 0;
      r.grounded = true;
      r.ground = best;
      r.groundY = bestTop;
      r.coyote = COYOTE_TIME;
    } else {
      if (r.grounded) r.coyote = COYOTE_TIME;
      r.grounded = false;
      r.ground = null;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Obstacle collisions                                                */
  /* ------------------------------------------------------------------ */

  private obstacleCollisions() {
    for (const r of this.racers) {
      if (r.invuln > 0 || r.finished) continue;
      // sweep bars: a hit racer is flipped over to the side the bar has already passed
      if (r.pos.y < 1.25) {
        for (const b of this.course.bars) {
          const dx = r.pos.x - b.x;
          const dz = r.pos.z - b.z;
          if (dx * dx + dz * dz > 64) continue;
          const ca = Math.cos(b.angle);
          const sa = -Math.sin(b.angle);
          const half = b.len / 2;
          const t = clamp(dx * ca + dz * sa, -half, half);
          const px = b.x + ca * t;
          const pz = b.z + sa * t;
          const ddx = r.pos.x - px;
          const ddz = r.pos.z - pz;
          if (ddx * ddx + ddz * ddz < (RACER_RADIUS + b.thick * 0.5) ** 2) {
            // direction the bar is travelling at this point; the racer is thrown against it, over the bar
            const sgn = Math.sign(b.speed) * (t >= 0 ? 1 : -1);
            const mx = sa * sgn;
            const mz = -ca * sgn;
            this.knock(r, -mx, -mz, 9.5, 5.4);
            break;
          }
        }
      }
      if ((r.state as string) === "tumble") continue;
      // padded hammers: flat-ended cylinder lying along z
      for (const h of this.course.hammers) {
        if (!hammerHits(h, r.pos.x, r.pos.y, r.pos.z, RACER_RADIUS, RACER_HEIGHT)) continue;
        const dir = Math.sign(Math.cos(this.time * h.speed + h.phase)) || 1;
        this.knock(r, dir * 0.85, 0.5, 10.5, 5.6);
        break;
      }
      if ((r.state as string) === "tumble") continue;
      for (const b of this.balls) {
        if (b.state === "chute" || b.state === "dead") continue;
        const dx = r.pos.x - b.pos.x;
        const dz = r.pos.z - b.pos.z;
        const rr = b.radius + RACER_RADIUS;
        if (dx * dx + dz * dz > rr * rr) continue;
        if (b.pos.y + b.radius < r.pos.y || b.pos.y - b.radius > r.pos.y + RACER_HEIGHT) continue;
        const sp = Math.hypot(b.vel.x, b.vel.z) || 1;
        const hd = Math.hypot(dx, dz) || 1;
        this.knock(r, dx / hd + (b.vel.x / sp) * 0.25, (dz / hd) * 0.35 - 0.55, 7.8, 4.8);
        b.vel.x *= -0.25;
        b.vel.z *= 0.4;
        break;
      }
      if ((r.state as string) === "tumble") continue;
      // pinball bumpers: springy bounce, no full tumble
      if (r.bumpCd <= 0) {
        for (const b of this.course.bumpers) {
          const dx = r.pos.x - b.x;
          const dz = r.pos.z - b.z;
          const rr = b.r + RACER_RADIUS;
          if (dx * dx + dz * dz > rr * rr) continue;
          if (r.pos.y > b.y + 1.9 || r.pos.y + RACER_HEIGHT < b.y) continue;
          const d = Math.hypot(dx, dz) || 1;
          r.vel.x = (dx / d) * 13;
          r.vel.z = (dz / d) * 13;
          r.vel.y = Math.max(r.vel.y, 4.5);
          r.bumpCd = 0.6;
          r.squash = 0.3;
          b.flash = 1;
          this.effects.push({ kind: "bounce", pos: new THREE.Vector3(b.x, b.y + 0.2, b.z), t: 0, life: 0.4 });
          if (r.isPlayer) sfx.bumper();
          break;
        }
      }
      if ((r.state as string) === "tumble") continue;
      // lava geysers: timed eruptions launch racers sky-high
      for (const g of this.course.geysers) {
        if (geyserState(g, this.time) !== "erupt") continue;
        const dx = r.pos.x - g.x;
        const dz = r.pos.z - g.z;
        const rr = g.r + RACER_RADIUS * 0.5;
        if (dx * dx + dz * dz > rr * rr) continue;
        if (r.pos.y > g.y + 4) continue;
        const d = Math.hypot(dx, dz) || 1;
        r.vel.x = (dx / d) * 3;
        r.vel.z = (dz / d) * 3;
        r.vel.y = 13.5;
        r.state = "tumble";
        r.tumbleTimer = 0.7;
        r.invuln = 1.2;
        r.grounded = false;
        r.ground = null;
        this.effects.push({ kind: "erupt", pos: new THREE.Vector3(g.x, g.y + 0.3, g.z), t: 0, life: 0.5 });
        if (r.isPlayer) sfx.erupt();
        break;
      }
    }
  }

  private knock(r: Racer, dx: number, dz: number, force: number, up: number) {
    if (r.invuln > 0) return;
    const len = Math.hypot(dx, dz) || 1;
    r.vel.x = (dx / len) * force;
    r.vel.z = (dz / len) * force;
    r.vel.y = up;
    r.state = "tumble";
    r.tumbleTimer = 1.05;
    r.invuln = 1.5;
    r.grounded = false;
    r.ground = null;
    r.squash = 0.3;
    this.effects.push({ kind: "hit", pos: r.pos.clone().add(new THREE.Vector3(0, 1, 0)), t: 0, life: 0.4 });
    if (r.isPlayer) sfx.hit();
  }

  private tileChecks() {
    for (const r of this.racers) {
      if (!r.grounded || !r.ground) continue;
      const tag = r.ground.tag;
      if (!tag || !tag.startsWith("tile-")) continue;
      const tile = this.course.tiles.find((t) => t.surface === r.ground);
      if (!tile) continue;
      if (tile.state === "safe") {
        tile.proven = true;
        continue;
      }
      if (tile.revealed || tile.timer > 0) continue;
      tile.timer = 0.5;
      sfx.tile();
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Checkpoints, falls, finish                                         */
  /* ------------------------------------------------------------------ */

  private postChecks() {
    const course = this.course;
    for (const r of this.racers) {
      for (const cp of course.checkpoints) {
        if (cp.index > r.checkpoint && r.pos.z < cp.z + 0.4 && r.pos.y > cp.y - 2.5) {
          r.checkpoint = cp.index;
          r.respawn.set(cp.x, cp.y + 0.05, cp.z - 0.6);
          r.respawnYaw = cp.yaw;
          if (r.isPlayer) {
            this.checkpointFlash = 1.4;
            this.effects.push({ kind: "checkpoint", pos: new THREE.Vector3(cp.x, cp.y + 0.1, cp.z), t: 0, life: 0.8 });
            sfx.green();
          }
        }
      }
      if (!r.finished && r.pos.z < course.finishZ && r.pos.y > course.finishY - 2.2) {
        r.finished = true;
        r.finishTime = this.time;
        r.place = this.racers.filter((o) => o.finished).length;
        r.cheerTime = 0.9;
        r.state = "run";
        if (r.isPlayer) {
          this.playerFinished = true;
          this.finishDelay = 0;
          sfx.finish();
        }
      }
      if (r.finished) {
        r.cheerTime = Math.max(0, r.cheerTime - 0.016);
        // slow down and celebrate past the line
        if (r.pos.z > course.finishZ - 5.5) {
          r.vel.x = damp(r.vel.x, 0, 4, 0.016);
          r.vel.z = damp(r.vel.z, -3.4, 3, 0.016);
        } else {
          r.vel.x = damp(r.vel.x, 0, 5, 0.016);
          r.vel.z = damp(r.vel.z, 0, 5, 0.016);
          r.state = "cheer";
        }
      }
      const climb = course.climb;
      const aiFast = !r.isPlayer && climb && r.pos.z < climb.oz - 176 && r.pos.y < -2.5;
      if (r.pos.y < WATER_Y + 0.4 || aiFast) {
        r.splashes++;
        if (r.isPlayer) {
          this.splashFlash = 1.2;
          if (course.level.style === "forge") sfx.sizzle();
          else sfx.splash();
        }
        this.effects.push({ kind: "splash", pos: new THREE.Vector3(r.pos.x, WATER_Y + 0.2, r.pos.z), t: 0, life: 0.9 });
        this.respawn(r);
      }
    }
  }

  private respawn(r: Racer) {
    r.pos.copy(r.respawn);
    r.pos.y += 0.15;
    r.vel.set(0, 0, 0);
    r.state = "idle";
    r.stateTimer = 0;
    r.tumbleTimer = 0;
    r.stun = 0.15;
    r.invuln = 1.5;
    r.grounded = false;
    r.ground = null;
    r.yaw = r.respawnYaw;
    r.jumpBuffer = 0;
    r.jumpTimer = 0;
    r.diveCooldown = 0;
    r.ai.jumpCd = 0;
    r.ai.stuck = 0;
    r.ai.dodgeTimer = 0;
  }

  /* ------------------------------------------------------------------ */
  /*  AI                                                                 */
  /* ------------------------------------------------------------------ */

  private activeSection(z: number): Section {
    const secs = this.course.sections;
    for (const s of secs) if (z > s.aiEnd) return s;
    return secs[secs.length - 1];
  }

  private updateAI(r: Racer, dt: number) {
    const ai = r.ai;
    ai.jumpCd = Math.max(0, ai.jumpCd - dt);
    ai.mistake -= dt;
    ai.think -= dt;
    const z = r.pos.z;

    if (r.finished) {
      r.input.x = 0;
      r.input.z = z > this.course.finishZ - 5 ? -1 : 0;
      r.input.jump = false;
      r.input.jumpPressed = false;
      r.input.dive = false;
      r.input.kick = false;
      return;
    }

    // occasional hesitation for variety
    if (ai.mistake <= 0) {
      ai.mistake = rand(5, 11);
      if (Math.random() < 0.35) ai.think = rand(0.25, 0.5);
    }

    const sec = this.activeSection(z);
    const plan: Plan = { tx: r.pos.x, tz: z - 4, speed: 1, jump: false, custom: null };
    this.planSection(r, sec, plan, dt);
    if (ai.think > 0 && sec.type !== "bounce") plan.speed = 0;

    const airJump = plan.jump && ai.jumpCd <= 0;
    let jumpNow = false;
    if (plan.jump) {
      jumpNow = true;
    }
    void airJump;

    if (plan.custom) {
      r.input.x = plan.custom.x;
      r.input.z = plan.custom.z;
    } else {
      // never run backwards
      if (plan.speed > 0) plan.tz = Math.min(plan.tz, z - 0.35);
      let dx = plan.tx - r.pos.x;
      let dz = plan.tz - z;
      const len = Math.hypot(dx, dz);
      if (len > 0.001) {
        dx /= len;
        dz /= len;
      } else {
        dx = 0;
        dz = 0;
      }
      r.input.x = dx * plan.speed;
      r.input.z = dz * plan.speed;
    }

    // stuck failsafe: measure progress over half-second windows (belts slow racers legitimately)
    ai.wait = plan.speed < 0.5;
    ai.checkT += dt;
    if (ai.checkT >= 0.5) {
      const moved = Math.abs(z - ai.lastZ);
      ai.lastZ = z;
      ai.checkT = 0;
      if (!ai.wait && r.grounded && moved < 0.3) ai.stuck += 0.5;
      else ai.stuck = 0;
    }
    if (ai.stuck > 2.5) {
      jumpNow = true;
      r.input.x += rand(-0.6, 0.6);
      if (ai.stuck > 7) {
        ai.stuck = 0;
        this.respawn(r);
      }
    }

    r.input.jump = plan.jump || jumpNow;
    r.input.jumpPressed = jumpNow;
    r.input.dive = false;
    r.input.kick = false;
  }

  private jumpOnce(ai: AIState, plan: Plan, cooldown: number) {
    if (ai.jumpCd <= 0) {
      plan.jump = true;
      ai.jumpCd = cooldown;
    }
  }

  private planSection(r: Racer, sec: Section, plan: Plan, dt: number) {
    const ai = r.ai;
    const course = this.course;
    const z = r.pos.z;
    const oz = sec.oz;
    const lz = z - oz;
    const lane = ai.lane;

    switch (sec.type) {
      case "sweep": {
        plan.tx = lane * 0.8;
        plan.tz = oz - 19.5;
        for (const b of course.bars) {
          const dx = r.pos.x - b.x;
          const dz = r.pos.z - b.z;
          if (Math.hypot(dx, dz) > 7.5) continue;
          const phi = Math.atan2(-dz, dx);
          const period = Math.PI / Math.abs(b.speed);
          let t = ((phi - b.angle) / b.speed) % period;
          if (t < 0) t += period;
          if (t < 0.34) this.jumpOnce(ai, plan, 0.55);
        }
        break;
      }
      case "seesaw": {
        const onSeesaw = r.ground?.kind === "seesaw";
        plan.tx = onSeesaw ? r.ground!.x : lane > 0 ? 3.4 : -3.4;
        plan.tz = oz - 45;
        plan.speed = 1.05;
        if (onSeesaw) {
          const nearEnd = Math.abs(z - (r.ground!.pivotZ ?? r.ground!.z)) > 6.6;
          if (nearEnd) this.jumpOnce(ai, plan, 0.4);
        } else if (lz < -21.5 && lz > -23.5) {
          const s = course.seesaws.find((q) => Math.abs(r.pos.x - q.x) < 3.4);
          if (s && surfaceTop(s, z - 0.6) > r.pos.y + 0.32) this.jumpOnce(ai, plan, 0.4);
        }
        break;
      }
      case "hammer": {
        plan.tx = lz > -60 ? -1.5 : 1.5;
        plan.tz = oz - 77;
        for (const h of course.hammers) {
          const dz = z - h.z;
          if (dz < -0.5 || dz > 6.5) continue;
          const hx = h.x + Math.sin(h.angle) * h.armLen;
          const hy = h.pivotY - Math.cos(h.angle) * h.armLen;
          if (Math.abs(hx - h.x) < 2.5 && hy < 3.0) {
            plan.tz = z;
            plan.speed = 0;
          }
        }
        break;
      }
      case "redlight": {
        const rl = course.rl!;
        if (z < rl.zoneHi && this.redPhase === "red") {
          plan.speed = 0;
          plan.tz = z;
        } else {
          plan.tx = lane * 0.7;
          plan.tz = oz - 99;
        }
        break;
      }
      case "ballramp": {
        const ramp = course.ramp!;
        plan.tz = oz - 117;
        ai.think = 0;
        if (lz < -110.5) {
          plan.tx = course.safePath.length ? (course.safePath[0] - 2) * 3.0 : 0;
          ai.dodgeTimer = 0;
        } else {
          plan.tx = lane * 0.5;
          let danger: { x: number; d: number } | null = null;
          for (const b of this.balls) {
            if (b.state !== "roll" && b.state !== "drop") continue;
            const dz = z - b.pos.z;
            if (dz < -1.5 || dz > 20) continue;
            if (Math.abs(b.pos.x - r.pos.x) < 4.2 && (!danger || dz < danger.d)) danger = { x: b.pos.x, d: dz };
          }
          if (danger) {
            ai.dodgeX = danger.x > 0.4 ? -4.1 : danger.x < -0.4 ? 4.1 : r.pos.x > 0 ? -4.1 : 4.1;
            ai.dodgeTimer = 1.25;
          }
          if (ai.dodgeTimer > 0) {
            ai.dodgeTimer -= dt;
            plan.tx = ai.dodgeX;
            plan.tz = z - 1.4;
          }
        }
        void ramp;
        plan.speed = 1.08;
        break;
      }
      case "tiles": {
        const rows = course.tileRows;
        const row = clamp(Math.floor((course.tileStartZ - z) / course.tileSpacing) + 1, 0, rows - 1);
        const col = this.chooseTile(r, row);
        plan.tx = (col - (course.tileCols - 1) / 2) * course.tileSpacing;
        plan.tz = course.tileStartZ - row * course.tileSpacing;
        plan.speed = 0.92;
        break;
      }
      case "walls": {
        plan.tx = lane * 0.5;
        plan.tz = oz - 178;
        if (lz > -158) {
          plan.tx = Math.abs(r.pos.x + 5.5) < Math.abs(r.pos.x - 5.5) ? -5.5 : 5.5;
        } else if (lz > -165) {
          const sliders = course.walls.filter((w) => w.kind === "slider");
          if (sliders.length >= 2) plan.tx = (sliders[0].x + sliders[1].x) / 2;
        } else {
          const gaps = [-6.5, 0, 6.5];
          let best = gaps[0];
          for (const g of gaps) if (Math.abs(g - r.pos.x) < Math.abs(best - r.pos.x)) best = g;
          plan.tx = best;
          if (lz < -166.4 && lz > -169.5) this.jumpOnce(ai, plan, 0.8);
        }
        plan.speed = 1.04;
        break;
      }
      case "climb": {
        const c = course.climb!;
        let step = 0;
        if (lz < -199.5) step = 4;
        else if (lz < -194) step = 3;
        else if (lz < -188.5) step = 2;
        else if (lz < -182.5) step = 1;
        let target: Surface;
        let jumpZ: number;
        let wait = false;
        if (step === 0) {
          target = c.slider1;
          jumpZ = oz - 181.0;
        } else if (step === 1) {
          target = c.lift;
          jumpZ = oz - 187.2;
          wait = c.lift.y > 1.5;
        } else if (step === 2) {
          target = Math.abs(r.pos.x - c.pairL.x) < Math.abs(r.pos.x - c.pairR.x) ? c.pairL : c.pairR;
          jumpZ = oz - 192.4;
          wait = c.lift.y < 4.0;
        } else if (step === 3) {
          target = c.slider2;
          jumpZ = oz - 198.0;
        } else {
          target = c.finishPad;
          jumpZ = oz - 203.0;
        }
        plan.tx = target.x;
        plan.tz = target.z;
        if (wait) {
          if (z > jumpZ + 0.15) {
            plan.tz = jumpZ;
            plan.speed = 0.34;
          } else {
            plan.tz = z;
            plan.speed = 0;
          }
        } else if (z < jumpZ + 0.3) {
          this.jumpOnce(ai, plan, 0.3);
        }
        break;
      }
      case "bounce": {
        const pads = course.pads;
        const g = RaceSim.G;
        if (!r.grounded) {
          const next = pads.find((p) => p.z < z - 4.5);
          const targetZ = next ? next.z : oz - 41.5;
          const vy = r.vel.y;
          const tRem = (vy + Math.sqrt(Math.max(0, vy * vy + 2 * g * Math.max(0, r.pos.y)))) / g;
          const need = Math.max(0, z - targetZ) / Math.max(tRem, 0.08);
          const maxSp = RUN_SPEED * r.speedMul;
          plan.custom = { x: clamp((0 - r.pos.x) * 0.9, -1, 1), z: -clamp(need / maxSp, 0, 1) };
        } else {
          plan.tx = 0;
          plan.tz = pads.length ? pads[0].z : oz - 41;
          if (z < pads[pads.length - 1].z - 4) plan.tz = oz - 44;
        }
        break;
      }
      case "treadmill": {
        plan.tx = lane * 0.6;
        plan.tz = oz - 41;
        for (const w of course.walls) {
          if (w.kind !== "pillar") continue;
          const dz = z - w.z;
          if (dz < 0 || dz > 5.5) continue;
          if (Math.abs(plan.tx - w.x) < w.w / 2 + 1.7 || Math.abs(r.pos.x - w.x) < w.w / 2 + 1.2) {
            if (ai.dodgeTimer <= 0) {
              ai.dodgeX = r.pos.x >= w.x ? w.x + w.w / 2 + 2.0 : w.x - w.w / 2 - 2.0;
              ai.dodgeX = clamp(ai.dodgeX, -5.2, 5.2);
              ai.dodgeTimer = 0.45;
            }
          }
        }
        if (ai.dodgeTimer > 0) {
          ai.dodgeTimer -= dt;
          plan.tx = ai.dodgeX;
        }
        break;
      }
      case "ice": {
        plan.tx = lane * 0.4;
        plan.tz = oz - 39;
        plan.speed = 0.95;
        if (r.grounded && !this.groundAhead(r.pos.x, z, r.pos.y, 2.0)) this.jumpOnce(ai, plan, 0.5);
        break;
      }
      case "snow": {
        ai.think = 0;
        plan.speed = 1.1;
        if (lz > -12) {
          plan.tx = lane * 0.3;
          plan.tz = oz - 13;
        } else {
          plan.tx = lane * 0.4;
          plan.tz = oz - 48;
          for (const b of this.balls) {
            if (b.style !== "snow" || b.state === "dead") continue;
            const dz = b.pos.z - z;
            if (dz < -2 || dz > 14) continue;
            if (Math.abs(b.pos.x - r.pos.x) < 3) {
              plan.tx = clamp(r.pos.x + (r.pos.x < b.pos.x ? -3.5 : 3.5), -4.5, 4.5);
              break;
            }
          }
        }
        break;
      }
      case "wind": {
        plan.tx = 0;
        plan.tz = oz - 46.5;
        plan.speed = 1;
        if (r.grounded && !this.groundAhead(r.pos.x, z, r.pos.y, 2.0)) this.jumpOnce(ai, plan, 0.5);
        break;
      }
      case "floes":
      case "lavahop": {
        const hop = sec.type === "lavahop";
        const cands = course.sinks
          .filter((s) => s.z < z - 0.5 && s.z > z - 18)
          .sort((a, b) => b.z - a.z);
        const next = cands[0];
        if (!next) {
          plan.tx = 0;
          plan.tz = sec.aiEnd - 3;
          plan.speed = 1;
        } else if (!next.active) {
          // the next hop is gone — wait for it to come back
          plan.tx = r.pos.x;
          plan.tz = z;
          plan.speed = 0;
        } else {
          plan.tx = next.x;
          plan.tz = next.z;
          plan.speed = hop ? 0.9 : 0.85;
          const dist = Math.hypot(next.x - r.pos.x, next.z - z);
          if (r.grounded && (dist < (hop ? 4.6 : 4.2) || !this.groundAhead(r.pos.x, z, r.pos.y, 2.0))) {
            this.jumpOnce(ai, plan, 0.5);
          }
        }
        break;
      }
      case "pistons": {
        plan.tz = oz - 37.5;
        plan.tx = lane * 0.4;
        plan.speed = 1.0;
        // steer for the middle of the open gap in the nearest piston row
        let rowZ = 0;
        let found = false;
        for (const w of course.walls) {
          if (w.kind !== "piston") continue;
          const dz = z - w.z;
          if (dz < -2 || dz > 6) continue;
          if (!found || w.z > rowZ) {
            rowZ = w.z;
            found = true;
          }
        }
        if (found) {
          let lo = -6.8;
          let hi = 6.8;
          for (const w of course.walls) {
            if (w.kind !== "piston" || Math.abs(w.z - rowZ) > 0.5) continue;
            if (w.x < 0) lo = Math.max(lo, w.x + w.w / 2 + 0.8);
            else hi = Math.min(hi, w.x - w.w / 2 - 0.8);
          }
          plan.tx = (lo + hi) / 2;
          if (hi - lo < 2.2) plan.speed = 0.55;
        }
        break;
      }
      case "geysers": {
        plan.tz = oz - 37.5;
        plan.tx = lane * 0.4;
        plan.speed = 1.02;
        // weave around the nearest threatening vent instead of stopping dead
        let threat: { x: number; z: number } | null = null;
        for (const g of course.geysers) {
          const dz = z - g.z;
          if (dz < -1 || dz > 7) continue;
          if (Math.abs(g.x - r.pos.x) > 2.6) continue;
          if (geyserTimeToErupt(g, this.time) < 0.7) {
            if (!threat || dz < z - threat.z) threat = g;
          }
        }
        if (threat) {
          plan.tx = clamp(threat.x + (r.pos.x < threat.x ? -3.4 : 3.4), -6.5, 6.5);
          plan.tz = z - 1.5;
          plan.speed = 0.9;
        }
        break;
      }
      case "bumpers": {
        plan.tz = oz - 35.5;
        plan.tx = lane * 0.5;
        plan.speed = 1.05;
        for (const b of course.bumpers) {
          const dz = z - b.z;
          if (dz < 0 || dz > 8) continue;
          if (Math.abs(b.x - r.pos.x) < 2.4) {
            plan.tx = clamp(r.pos.x + (r.pos.x < b.x ? -2.8 : 2.8), -6.5, 6.5);
            break;
          }
        }
        break;
      }
      case "firebars": {
        plan.tx = lane * 0.4;
        plan.tz = oz - 36;
        for (const b of course.bars) {
          const dx = r.pos.x - b.x;
          const dz = r.pos.z - b.z;
          if (Math.hypot(dx, dz) > 7.5) continue;
          const phi = Math.atan2(-dz, dx);
          const period = Math.PI / Math.abs(b.speed);
          let t = ((phi - b.angle) / b.speed) % period;
          if (t < 0) t += period;
          if (t < 0.34) this.jumpOnce(ai, plan, 0.55);
        }
        break;
      }
    }
  }

  /** True if there is standable ground ~dist ahead of (x, z) at height y. */
  private groundAhead(x: number, z: number, y: number, dist = 2.0) {
    const pz = z - dist;
    for (const s of this.course.surfaces) {
      if (!s.active) continue;
      if (!surfaceContains(s, x, pz, 0.1)) continue;
      const top = surfaceTop(s, pz);
      if (top <= y + 0.6 && top >= y - 2.5) return true;
    }
    return false;
  }

  static readonly G = GRAVITY;

  /** Tip-toe tiles: follow tiles others have proven safe, otherwise take an informed guess. */
  private chooseTile(r: Racer, row: number): number {
    const ai = r.ai;
    const cached = ai.tileChoice.get(row);
    const course = this.course;
    const rowTiles = course.tiles.filter((t) => t.row === row);
    if (cached !== undefined) {
      const t = rowTiles.find((q) => q.col === cached);
      // a tile that has since been revealed as fake is never trusted
      if (t && !(t.revealed || t.timer > 0)) {
        const proven = rowTiles.find((q) => q.proven);
        if (!proven || proven.col === cached) return cached;
      }
    }
    const proven = rowTiles.find((q) => q.proven);
    let col: number;
    if (proven && Math.random() < 0.96) {
      col = proven.col;
    } else {
      const open = rowTiles.filter((t) => !t.revealed && t.timer <= 0);
      const safe = open.find((t) => t.state === "safe");
      if (safe && Math.random() < ai.tileSkill) col = safe.col;
      else {
        const pool = open.length ? open : rowTiles;
        col = pool[Math.floor(Math.random() * pool.length)].col;
      }
    }
    ai.tileChoice.set(row, col);
    return col;
  }

  /* ------------------------------------------------------------------ */
  /*  Effects, ranking, HUD                                              */
  /* ------------------------------------------------------------------ */

  private updateEffects(dt: number) {
    for (const e of this.effects) e.t += dt;
    this.effects = this.effects.filter((e) => e.t < e.life);
  }

  private sortedRacers() {
    return [...this.racers].sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.pos.z - a.pos.z;
    });
  }

  private updateRanking() {
    this.sortedRacers().forEach((r, i) => {
      r.progress = r.finished ? 1000 - r.place : -r.pos.z;
      if (!r.finished) r.place = i + 1;
    });
  }

  private updateSection() {
    const z = this.player.pos.z;
    const secs = this.course.sections;
    let label = "Start";
    if (z < secs[0].zIn) {
      label = secs[secs.length - 1].label;
      for (const s of secs) {
        if (z > s.zOut) {
          label = s.label;
          break;
        }
      }
    }
    this.section = label;
  }

  private buildResults() {
    this.results = this.sortedRacers().map((r, i) => ({
      name: r.def.name,
      color: r.def.color,
      place: i + 1,
      time: r.finished ? r.finishTime : 0,
      isPlayer: r.isPlayer,
      finished: r.finished,
    }));
    this.phase = "finished";
  }

  getHud(): HudState {
    const c = this.course;
    return {
      phase: this.phase,
      countdown: this.countdown,
      time: this.time,
      place: this.player.place,
      total: this.racers.length,
      splashes: this.player.splashes,
      zaps: this.player.zaps,
      banner: this.banner,
      bannerTone: this.bannerTone,
      progress: clamp((c.startZ - this.player.pos.z) / (c.startZ - c.finishZ), 0, 1),
      section: this.section,
      finished: this.playerFinished,
      results: this.results,
      playerPlace: this.player.place,
      playerTime: this.player.finishTime,
      checkpointFlash: this.checkpointFlash,
      splashFlash: this.splashFlash,
      zapFlash: this.zapFlash,
      levelId: this.level.id,
      levelName: this.level.name,
      inRedLight: this.course.rl !== null && this.section === "RED LIGHT",
    };
  }

  racerVisual(r: Racer) {
    return {
      state: r.state,
      speed: Math.hypot(r.vel.x, r.vel.z),
      vy: r.vel.y,
      grounded: r.grounded,
      tumbleTimer: r.tumbleTimer,
      diveTimer: r.state === "dive" ? r.stateTimer : 0,
      animPhase: r.animPhase,
      squash: r.squash,
      cheerTime: r.cheerTime,
      finished: r.finished,
      place: r.place,
    };
  }
}
