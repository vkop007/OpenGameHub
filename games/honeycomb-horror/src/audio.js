/**
 * Honeycomb Horror — 3D Spatial Psychological Horror Audio Engine
 *
 * Design pillars:
 * 1. NO background music, NO continuous water/wind loops, and NO robotic browser TTS
 *    (window.speechSynthesis is completely removed).
 * 2. True 3D HRTF spatialization (AudioListener + PannerNode) + dark stone-corridor
 *    convolver reverb so every monster, door, voice line, and phantom cue is directional.
 * 3. Drop-in real human-acted voice & SFX sample support:
 *      - assets/audio/sfxmint-door-creak-42.wav (door hinge creak)
 *      - assets/audio/voices/<profile>_01..04.mp3 (or .wav) — 3D spatialized real horror dialogue
 *      - assets/audio/sfx/<key>.mp3 (or .wav) — optional real recorded monster/croc SFX
 * 4. Organic, non-cartoonish horror sound design fallback: formant-filtered breath/vocal
 *    tracts, waveshaper grit, inharmonic metallic scrapes, and realistic foley impacts —
 *    zero raw square/triangle/sine arcade synths.
 */

const VOICE_SLOTS = {
  crawling_creature: ['crawling_01', 'crawling_02', 'crawling_03', 'crawling_04'],
  horror_girl: ['girl_01', 'girl_02', 'girl_03', 'girl_04'],
  the_butcher: ['butcher_01', 'butcher_02', 'butcher_03', 'butcher_04'],
  the_nurse: ['nurse_01', 'nurse_02', 'nurse_03', 'nurse_04']
};

const OPTIONAL_SFX_KEYS = [
  'crawling_vocal', 'crawling_attack',
  'girl_vocal', 'girl_attack',
  'butcher_vocal', 'butcher_attack',
  'nurse_vocal', 'nurse_attack',
  'croc_growl', 'croc_bite'
];

export class HorrorAudio {
  constructor() {
    this.ctx = null;
    this.started = false;
    this.muted = false;

    this.masterGain = null;
    this.dryBus = null;
    this.reverbNode = null;
    this.reverbSend = null;

    this.pinkNoiseBuffer = null;
    this.whiteNoiseBuffer = null;
    this.gritCurveSoft = null;
    this.gritCurveHarsh = null;

    // Preloaded real audio sample banks
    this.doorCreakBuffer = null;
    this._doorCreakLoading = false;
    this.voiceBuffers = {
      crawling_creature: [],
      horror_girl: [],
      the_butcher: [],
      the_nurse: []
    };
    this.sfxBuffers = {};
    this._samplesPreloaded = false;

    // Listener tracking
    this.listenerPos = { x: 0, y: 1.7, z: 0 };
    this.listenerYaw = 0;

    // Dynamic silence & atmosphere timers
    this.time = 0;
    this.silencePhase = 0;
    this.silenceTarget = 1.0;
    this.nextSilenceSwitch = 12 + Math.random() * 14;
    this.nextEnvEventTimer = 7 + Math.random() * 10;
    this.nextPhantomTimer = 24 + Math.random() * 26;

    // Player fear, breathing & heartbeat state
    this.fearLevel = 0;
    this.breathTimer = 2.4;
    this.heartTimer = 0.8;
    this.lastGaspTime = -10;

    // Monster voice-line throttling so cues stay rare, tense, and unsettling
    this.lastVoiceLineTime = -20;
  }

  init() {
    if (this.started) {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.92;
    this.masterGain.connect(this.ctx.destination);

    this.dryBus = this.ctx.createGain();
    this.dryBus.gain.value = 1.0;
    this.dryBus.connect(this.masterGain);

    // Dark stone-corridor impulse response for realistic maze echoes
    this.reverbNode = this.ctx.createConvolver();
    this.reverbNode.buffer = this._createStoneReverbIR(1.75, 2.65);
    this.reverbSend = this.ctx.createGain();
    this.reverbSend.gain.value = 0.14;
    this.reverbNode.connect(this.reverbSend);
    this.reverbSend.connect(this.masterGain);

    // Pre-build reusable pink & white noise buffers
    const sr = this.ctx.sampleRate;
    const len = sr * 4;
    this.pinkNoiseBuffer = this.ctx.createBuffer(1, len, sr);
    this.whiteNoiseBuffer = this.ctx.createBuffer(1, len, sr);
    const pink = this.pinkNoiseBuffer.getChannelData(0);
    const white = this.whiteNoiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      white[i] = w;
      b0 = 0.997 * b0 + w * 0.029;
      b1 = 0.985 * b1 + w * 0.032;
      b2 = 0.950 * b2 + w * 0.048;
      b3 = 0.850 * b3 + w * 0.060;
      pink[i] = Math.max(-1, Math.min(1, (b0 + b1 + b2 + b3 + w * 0.015) * 1.15));
    }

    this.gritCurveSoft = this._makeWaveshaperCurve(14);
    this.gritCurveHarsh = this._makeWaveshaperCurve(55);

    // Preload real door creak + any user-supplied horror voice & SFX samples
    this._loadDoorCreakSample('assets/audio/sfxmint-door-creak-42.wav');
    this._preloadCustomHorrorSamples();

    this.started = true;
  }

  _makeWaveshaperCurve(drive = 20) {
    const n = 1024;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = ((3 + drive) * x * 20 * (Math.PI / 180)) / (Math.PI + drive * Math.abs(x));
    }
    return curve;
  }

  _createStoneReverbIR(duration, decay) {
    const sr = this.ctx.sampleRate;
    const length = Math.floor(sr * duration);
    const ir = this.ctx.createBuffer(2, length, sr);
    for (let ch = 0; ch < 2; ch++) {
      const data = ir.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const t = i / length;
        const env = Math.pow(1 - t, decay);
        const sample = (Math.random() * 2 - 1) * env * 0.45;
        data[i] = i > 0 ? data[i - 1] * 0.40 + sample * 0.60 : sample;
      }
    }
    return ir;
  }

  async _tryDecodeUrl(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const arr = await res.arrayBuffer();
      if (arr.byteLength < 1024) return null;
      return await this.ctx.decodeAudioData(arr);
    } catch (_) {
      return null;
    }
  }

  async _preloadCustomHorrorSamples() {
    if (this._samplesPreloaded || !this.ctx) return;
    this._samplesPreloaded = true;

    // Load optional real voice-acted character lines (assets/audio/voices/<slot>.mp3 or .wav)
    for (const [profile, slots] of Object.entries(VOICE_SLOTS)) {
      for (const slot of slots) {
        const buf = (await this._tryDecodeUrl(`assets/audio/voices/${slot}.mp3`))
          || (await this._tryDecodeUrl(`assets/audio/voices/${slot}.wav`));
        if (buf) this.voiceBuffers[profile].push(buf);
      }
    }

    // Load optional real recorded horror SFX (assets/audio/sfx/<key>.mp3 or .wav)
    for (const key of OPTIONAL_SFX_KEYS) {
      const buf = (await this._tryDecodeUrl(`assets/audio/sfx/${key}.mp3`))
        || (await this._tryDecodeUrl(`assets/audio/sfx/${key}.wav`));
      if (buf) this.sfxBuffers[key] = buf;
    }
  }

  _playSpatialBuffer(buffer, worldPos, {
    gain = 0.85,
    rate = 1.0,
    rateJitter = 0.05,
    refDistance = 3.2,
    maxDistance = 36,
    rolloff = 1.25,
    wetAmount = 0.45
  } = {}) {
    if (!buffer || !this.ctx) return false;
    const now = this.ctx.currentTime;
    const dest = worldPos
      ? this._createSpatialNode(worldPos, refDistance, maxDistance, rolloff, wetAmount)
      : this.masterGain;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate * (1 + (Math.random() - 0.5) * 2 * rateJitter);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, now);
    src.connect(g);
    g.connect(dest);
    src.start(now);
    return true;
  }

  /**
   * Sync 3D Web Audio AudioListener to the player's camera position & orientation every frame.
   */
  updateListener(pos, yaw, pitch = 0) {
    this.listenerPos.x = pos.x;
    this.listenerPos.y = pos.y;
    this.listenerPos.z = pos.z;
    this.listenerYaw = yaw;

    if (!this.started || !this.ctx) return;
    const listener = this.ctx.listener;
    const now = this.ctx.currentTime;

    const cosP = Math.cos(pitch);
    const fx = -Math.sin(yaw) * cosP;
    const fy = Math.sin(pitch);
    const fz = -Math.cos(yaw) * cosP;

    if (listener.positionX) {
      listener.positionX.setTargetAtTime(pos.x, now, 0.02);
      listener.positionY.setTargetAtTime(pos.y, now, 0.02);
      listener.positionZ.setTargetAtTime(pos.z, now, 0.02);
      listener.forwardX.setTargetAtTime(fx, now, 0.02);
      listener.forwardY.setTargetAtTime(fy, now, 0.02);
      listener.forwardZ.setTargetAtTime(fz, now, 0.02);
      listener.upX.setTargetAtTime(0, now, 0.02);
      listener.upY.setTargetAtTime(1, now, 0.02);
      listener.upZ.setTargetAtTime(0, now, 0.02);
    } else if (listener.setPosition) {
      listener.setPosition(pos.x, pos.y, pos.z);
      listener.setOrientation(fx, fy, fz, 0, 1, 0);
    }
  }

  /**
   * Create a true 3D HRTF PannerNode positioned in world space and routed to dry + reverb.
   */
  _createSpatialNode(worldPos, refDistance = 2.4, maxDistance = 32, rolloff = 1.45, wetAmount = 0.28) {
    const panner = this.ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = refDistance;
    panner.maxDistance = maxDistance;
    panner.rolloffFactor = rolloff;
    panner.coneInnerAngle = 360;
    panner.coneOuterAngle = 360;

    const px = worldPos?.x ?? this.listenerPos.x;
    const py = worldPos?.y ?? this.listenerPos.y;
    const pz = worldPos?.z ?? this.listenerPos.z;
    const now = this.ctx.currentTime;

    if (panner.positionX) {
      panner.positionX.setValueAtTime(px, now);
      panner.positionY.setValueAtTime(py, now);
      panner.positionZ.setValueAtTime(pz, now);
    } else if (panner.setPosition) {
      panner.setPosition(px, py, pz);
    }

    panner.connect(this.dryBus);
    if (wetAmount > 0 && this.reverbNode) {
      const wet = this.ctx.createGain();
      wet.gain.value = wetAmount;
      panner.connect(wet);
      wet.connect(this.reverbNode);
    }
    return panner;
  }

  _randomPointAroundPlayer(minDist, maxDist, behindBias = false) {
    let angle;
    if (behindBias) {
      angle = this.listenerYaw + Math.PI + (Math.random() - 0.5) * Math.PI * 1.1;
    } else {
      angle = Math.random() * Math.PI * 2;
    }
    const dist = minDist + Math.random() * (maxDist - minDist);
    return {
      x: this.listenerPos.x - Math.sin(angle) * dist,
      y: 1.2 + Math.random() * 1.4,
      z: this.listenerPos.z - Math.cos(angle) * dist
    };
  }

  /**
   * Main per-frame update: handles silence lulls, sparse realistic micro-events,
   * dynamic player fear/breathing/heartbeat, and rare unexplained psychological cues.
   */
  update(dt, state) {
    if (!this.started || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.time += dt;

    const {
      insideMaze = false,
      inWater = false,
      flashlightOn = true,
      closestMonsterDist = 999,
      anyMonsterChasing = false,
      playerHealth = 100
    } = state || {};

    this.nextSilenceSwitch -= dt;
    if (this.nextSilenceSwitch <= 0) {
      const goSilent = Math.random() < 0.48;
      this.silenceTarget = goSilent ? 0.08 : (0.55 + Math.random() * 0.45);
      this.nextSilenceSwitch = goSilent ? (10 + Math.random() * 14) : (12 + Math.random() * 16);
    }
    this.silencePhase += (this.silenceTarget - this.silencePhase) * Math.min(1, dt * 0.35);

    const targetReverb = insideMaze ? 0.46 : 0.09;
    this.reverbSend.gain.setTargetAtTime(targetReverb, now, 0.8);

    // Sparse realistic nighttime environmental micro-events
    this.nextEnvEventTimer -= dt;
    if (this.nextEnvEventTimer <= 0) {
      this.nextEnvEventTimer = insideMaze
        ? (13 + Math.random() * 20)
        : (10 + Math.random() * 16);
      if (this.silencePhase > 0.15) {
        if (insideMaze) this._playMazeAmbientDetail();
        else this._playForestAmbientDetail();
      }
    }

    // Rare unexplained psychological horror cues (only when NOT currently chased)
    this.nextPhantomTimer -= dt;
    if (this.nextPhantomTimer <= 0) {
      this.nextPhantomTimer = 28 + Math.random() * 30;
      if (!anyMonsterChasing && closestMonsterDist > 11 && !inWater) {
        this._playPhantomHorrorCue(insideMaze);
      }
    }

    // Dynamic Player Fear, Breathing & Heartbeat System
    let targetFear = 0;
    if (closestMonsterDist < 26) {
      targetFear = Math.max(targetFear, Math.pow(1 - closestMonsterDist / 26, 1.55));
    }
    if (anyMonsterChasing) {
      targetFear = Math.max(targetFear, 0.68 + Math.max(0, (1 - closestMonsterDist / 18) * 0.32));
    }
    if (inWater) {
      targetFear = Math.max(targetFear, 0.58);
    }
    if (insideMaze && !flashlightOn) {
      targetFear = Math.max(targetFear, 0.24);
    }
    if (playerHealth < 55) {
      targetFear = Math.max(targetFear, 0.38);
    }
    targetFear = Math.min(1, targetFear);

    const fearRate = targetFear > this.fearLevel ? 2.4 : 0.28;
    this.fearLevel += (targetFear - this.fearLevel) * Math.min(1, dt * fearRate);

    if (this.fearLevel >= 0.20) {
      this.breathTimer -= dt;
      if (this.breathTimer <= 0) {
        const heavy = this.fearLevel >= 0.55;
        this._playPlayerBreath(this.fearLevel);
        this.breathTimer = heavy
          ? (0.95 + (1 - this.fearLevel) * 0.85 + Math.random() * 0.25)
          : (2.6 + (1 - this.fearLevel) * 2.0 + Math.random() * 0.9);
      }
    } else {
      this.breathTimer = Math.min(this.breathTimer, 1.4);
    }

    if (this.fearLevel >= 0.38) {
      this.heartTimer -= dt;
      if (this.heartTimer <= 0) {
        this._playHeartbeat(this.fearLevel);
        const bpm = 74 + ((this.fearLevel - 0.38) / 0.62) * 78;
        this.heartTimer = 60 / bpm;
      }
    }
  }

  updateZone(insideMaze, dt) {
    this.update(dt, { insideMaze });
  }

  // =========================================================================
  // PLAYER FEAR, BREATHING, GASPING & HEARTBEAT
  // =========================================================================

  _playPlayerBreath(fear) {
    if (!this.started || !this.ctx || !this.pinkNoiseBuffer) return;
    const now = this.ctx.currentTime;
    const heavy = fear >= 0.55;
    const vol = (0.025 + Math.pow(fear, 1.4) * 0.14);
    const inDur = heavy ? 0.34 : 0.55;
    const outDur = heavy ? 0.42 : 0.72;

    const srcIn = this.ctx.createBufferSource();
    srcIn.buffer = this.pinkNoiseBuffer;
    const fIn = this.ctx.createBiquadFilter();
    fIn.type = 'bandpass';
    fIn.frequency.setValueAtTime(heavy ? 1150 : 880, now);
    fIn.frequency.linearRampToValueAtTime(heavy ? 1420 : 1020, now + inDur);
    fIn.Q.value = 2.6;
    const gIn = this.ctx.createGain();
    gIn.gain.setValueAtTime(0.0005, now);
    gIn.gain.linearRampToValueAtTime(vol * 0.75, now + inDur * 0.55);
    gIn.gain.exponentialRampToValueAtTime(0.0005, now + inDur);
    srcIn.connect(fIn);
    fIn.connect(gIn);
    gIn.connect(this.masterGain);
    srcIn.start(now, Math.random() * 2.5, inDur + 0.04);

    const exStart = now + inDur + (heavy ? 0.05 : 0.16);
    const srcOut = this.ctx.createBufferSource();
    srcOut.buffer = this.pinkNoiseBuffer;
    const fOut = this.ctx.createBiquadFilter();
    fOut.type = 'bandpass';
    fOut.frequency.setValueAtTime(heavy ? 760 : 620, exStart);
    fOut.frequency.exponentialRampToValueAtTime(420, exStart + outDur);
    fOut.Q.value = 2.0;

    const gOut = this.ctx.createGain();
    gOut.gain.setValueAtTime(0.0005, exStart);
    gOut.gain.linearRampToValueAtTime(vol, exStart + outDur * 0.28);
    gOut.gain.exponentialRampToValueAtTime(0.0005, exStart + outDur);

    if (fear > 0.42) {
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 6.5 + Math.random() * 3.5;
      const lfoG = this.ctx.createGain();
      lfoG.gain.value = vol * 0.22;
      lfo.connect(lfoG);
      lfoG.connect(gOut.gain);
      lfo.start(exStart);
      lfo.stop(exStart + outDur + 0.05);
    }

    srcOut.connect(fOut);
    fOut.connect(gOut);
    gOut.connect(this.masterGain);
    srcOut.start(exStart, Math.random() * 2.5, outDur + 0.04);
  }

  playPlayerGasp(intensity = 0.8) {
    if (!this.started || !this.ctx || !this.pinkNoiseBuffer) return;
    if (this.time - this.lastGaspTime < 2.2) return;
    this.lastGaspTime = this.time;

    const now = this.ctx.currentTime;
    // Sharp air intake through throat formants (pure organic breath, no cartoon oscillator)
    const src = this.ctx.createBufferSource();
    src.buffer = this.pinkNoiseBuffer;
    const f1 = this.ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.setValueAtTime(780, now);
    f1.frequency.exponentialRampToValueAtTime(1650, now + 0.14);
    f1.Q.value = 3.6;

    const f2 = this.ctx.createBiquadFilter();
    f2.type = 'bandpass';
    f2.frequency.setValueAtTime(2200, now);
    f2.frequency.exponentialRampToValueAtTime(2950, now + 0.15);
    f2.Q.value = 4.2;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.22 * intensity, now + 0.055);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.26);

    src.connect(f1);
    src.connect(f2);
    f1.connect(gain);
    f2.connect(gain);
    gain.connect(this.masterGain);
    src.start(now, Math.random() * 2.0, 0.29);
  }

  _playHeartbeat(fear) {
    if (!this.started || !this.ctx) return;
    const now = this.ctx.currentTime;
    const strength = Math.min(1, (fear - 0.35) / 0.65);
    const vol = 0.05 + strength * 0.24;

    const thump = (startTime, pitch, amp) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(pitch, startTime);
      osc.frequency.exponentialRampToValueAtTime(28, startTime + 0.13);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(amp, startTime + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0008, startTime + 0.16);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(startTime);
      osc.stop(startTime + 0.18);
    };

    thump(now, 64, vol);
    thump(now + 0.17, 52, vol * 0.72);
  }

  // =========================================================================
  // REALISTIC NIGHTTIME FOREST & MAZE AMBIENCE (ZERO CARTOON BEEPS)
  // =========================================================================

  _playForestAmbientDetail() {
    const roll = Math.random();
    const pos = this._randomPointAroundPlayer(12, 34, false);
    const now = this.ctx.currentTime;

    if (roll < 0.52) {
      // Soft nocturnal breeze rustling dry pine needles / leaves
      const pan = this._createSpatialNode(pos, 5, 45, 1.1, 0.06);
      const src = this.ctx.createBufferSource();
      src.buffer = this.pinkNoiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400 + Math.random() * 900, now);
      filter.Q.value = 1.6;
      const dur = 1.0 + Math.random() * 1.4;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0005, now);
      g.gain.linearRampToValueAtTime(0.048, now + dur * 0.42);
      g.gain.exponentialRampToValueAtTime(0.0005, now + dur);
      src.connect(filter);
      filter.connect(g);
      g.connect(pan);
      src.start(now, Math.random() * 2.0, dur + 0.05);
    } else {
      // Crisp distant dry twig / branch snap in the dark woods
      const pan = this._createSpatialNode(pos, 4, 38, 1.3, 0.08);
      for (let i = 0; i < 2; i++) {
        const t = now + i * 0.022;
        const src = this.ctx.createBufferSource();
        src.buffer = this.whiteNoiseBuffer;
        const f = this.ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = (i === 0 ? 1950 : 1250) + Math.random() * 500;
        f.Q.value = 3.2;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(i === 0 ? 0.11 : 0.06, t);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 0.045);
        src.connect(f);
        f.connect(g);
        g.connect(pan);
        src.start(t, Math.random() * 2.5, 0.06);
      }
    }
  }

  _playMazeAmbientDetail() {
    const roll = Math.random();
    const pos = this._randomPointAroundPlayer(9, 26, false);
    const pan = this._createSpatialNode(pos, 3.5, 36, 1.2, 0.48);
    const now = this.ctx.currentTime;

    if (roll < 0.45) {
      // Distant stone settling / low muffled structural thump
      const sub = this.ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(62 + Math.random() * 18, now);
      sub.frequency.exponentialRampToValueAtTime(26, now + 0.35);
      const sg = this.ctx.createGain();
      sg.gain.setValueAtTime(0.001, now);
      sg.gain.linearRampToValueAtTime(0.09, now + 0.03);
      sg.gain.exponentialRampToValueAtTime(0.0006, now + 0.42);
      sub.connect(sg);
      sg.connect(pan);
      sub.start(now);
      sub.stop(now + 0.46);
    } else if (roll < 0.78) {
      // Falling pebbles / grit trickle on cold cobblestone
      for (let i = 0; i < 4; i++) {
        const t = now + i * (0.055 + Math.random() * 0.085);
        const src = this.ctx.createBufferSource();
        src.buffer = this.whiteNoiseBuffer;
        const f = this.ctx.createBiquadFilter();
        f.type = 'highpass';
        f.frequency.value = 2400 + Math.random() * 1400;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.042 * (1 - i * 0.18), t);
        g.gain.exponentialRampToValueAtTime(0.0005, t + 0.032);
        src.connect(f);
        f.connect(g);
        g.connect(pan);
        src.start(t, Math.random() * 2.5, 0.04);
      }
    } else {
      // Faint distant iron chain/grate scrape (filtered metallic noise, no synth tone)
      const src = this.ctx.createBufferSource();
      src.buffer = this.whiteNoiseBuffer;
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.setValueAtTime(1600 + Math.random() * 500, now);
      f.frequency.exponentialRampToValueAtTime(980, now + 0.42);
      f.Q.value = 12.0;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0005, now);
      g.gain.linearRampToValueAtTime(0.048, now + 0.10);
      g.gain.exponentialRampToValueAtTime(0.0005, now + 0.48);
      src.connect(f);
      f.connect(g);
      g.connect(pan);
      src.start(now, Math.random() * 2.0, 0.52);
    }
  }

  _playPhantomHorrorCue(insideMaze) {
    const pos = this._randomPointAroundPlayer(5.5, 14, true);
    const pan = this._createSpatialNode(pos, 2.5, 24, 1.35, insideMaze ? 0.52 : 0.14);
    const now = this.ctx.currentTime;
    const roll = Math.random();

    if (roll < 0.40) {
      // Two sudden quiet phantom footsteps behind the player, then dead silence
      for (let i = 0; i < 2; i++) {
        const t = now + i * (0.48 + Math.random() * 0.12);
        const src = this.ctx.createBufferSource();
        src.buffer = this.pinkNoiseBuffer;
        const f = this.ctx.createBiquadFilter();
        f.type = insideMaze ? 'lowpass' : 'bandpass';
        f.frequency.value = insideMaze ? 300 : 920;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.095, t);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 0.11);
        src.connect(f);
        f.connect(g);
        g.connect(pan);
        src.start(t, Math.random() * 2.0, 0.13);
      }
    } else if (roll < 0.75) {
      // Faint disembodied breathy exhale right behind the player's ear
      this._playWhisperSyllables(pan, now, [
        { delay: 0.0, dur: 0.34, f1: 720, f2: 1650, gain: 0.08 },
        { delay: 0.38, dur: 0.42, f1: 580, f2: 1320, gain: 0.065 }
      ]);
    } else {
      // Distant hollow stone/door thud
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(86, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.30);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.13, now);
      g.gain.exponentialRampToValueAtTime(0.0008, now + 0.36);
      osc.connect(g);
      g.connect(pan);
      osc.start(now);
      osc.stop(now + 0.40);
    }
  }

  // =========================================================================
  // PLAYER & ENVIRONMENT INTERACTION SFX
  // =========================================================================

  playFootstep(insideMaze, sprinting) {
    if (!this.started || !this.ctx || !this.pinkNoiseBuffer) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.pinkNoiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = insideMaze ? 'lowpass' : 'bandpass';
    filter.frequency.value = insideMaze ? (230 + Math.random() * 85) : (720 + Math.random() * 260);
    const gain = this.ctx.createGain();
    const vol = (sprinting ? 0.21 : 0.11) * (0.85 + Math.random() * 0.3);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (insideMaze ? 0.13 : 0.10));
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(now, Math.random() * 2.5, 0.15);
  }

  /**
   * Timeline-synchronized 3D spatial door Foley system:
   * 1. playDoorHandleGrab  — subtle hand-on-iron contact when interaction begins
   * 2. playDoorLatchClick  — crisp metallic click exactly when handle rotates & latch releases
   * 3. start/update/stopDoorCreak — real recorded wooden creak (assets/audio/sfxmint-door-creak-42.wav)
   * 4. playDoorStopThud    — heavy solid-oak thud when door hits its open/closed limit
   */
  playDoorHandleGrab(worldPos) {
    if (!this.started) this.init();
    if (!this.ctx || !this.pinkNoiseBuffer) return;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    const now = this.ctx.currentTime;
    const dest = this._createSpatialNode(worldPos, 4.2, 28, 1.15, 0.28);

    const src = this.ctx.createBufferSource();
    src.buffer = this.pinkNoiseBuffer;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 680;
    f.Q.value = 1.6;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0005, now);
    g.gain.linearRampToValueAtTime(0.22, now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0005, now + 0.085);
    src.connect(f);
    f.connect(g);
    g.connect(dest);
    src.start(now, Math.random() * 2.5, 0.095);

    const clink = this.ctx.createBufferSource();
    clink.buffer = this.whiteNoiseBuffer;
    const cf = this.ctx.createBiquadFilter();
    cf.type = 'bandpass';
    cf.frequency.value = 1750;
    cf.Q.value = 6.0;
    const cg = this.ctx.createGain();
    cg.gain.setValueAtTime(0.11, now + 0.012);
    cg.gain.exponentialRampToValueAtTime(0.0005, now + 0.048);
    clink.connect(cf);
    cf.connect(cg);
    cg.connect(dest);
    clink.start(now + 0.012, Math.random() * 2.0, 0.05);
  }

  playDoorLatchClick(worldPos) {
    if (!this.started) this.init();
    if (!this.ctx || !this.whiteNoiseBuffer) return;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    const now = this.ctx.currentTime;
    const dest = this._createSpatialNode(worldPos, 4.5, 30, 1.15, 0.36);

    const clickSrc = this.ctx.createBufferSource();
    clickSrc.buffer = this.whiteNoiseBuffer;
    const cf = this.ctx.createBiquadFilter();
    cf.type = 'bandpass';
    cf.frequency.value = 2500;
    cf.Q.value = 3.2;
    const cg = this.ctx.createGain();
    cg.gain.setValueAtTime(0.38, now);
    cg.gain.exponentialRampToValueAtTime(0.0008, now + 0.032);
    clickSrc.connect(cf);
    cf.connect(cg);
    cg.connect(dest);
    clickSrc.start(now, Math.random() * 2.5, 0.04);

    const bolt = this.ctx.createOscillator();
    bolt.type = 'triangle';
    bolt.frequency.setValueAtTime(380, now);
    bolt.frequency.exponentialRampToValueAtTime(145, now + 0.045);
    const bg = this.ctx.createGain();
    bg.gain.setValueAtTime(0.28, now);
    bg.gain.exponentialRampToValueAtTime(0.0008, now + 0.052);
    bolt.connect(bg);
    bg.connect(dest);
    bolt.start(now);
    bolt.stop(now + 0.058);
  }

  async _loadDoorCreakSample(url) {
    if (this._doorCreakLoading || !this.ctx) return;
    this._doorCreakLoading = true;
    this.doorCreakBuffer = await this._tryDecodeUrl(url);
  }

  startDoorCreak(worldPos) {
    if (!this.started) this.init();
    if (!this.ctx) return null;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    const now = this.ctx.currentTime;
    const dest = this._createSpatialNode(worldPos, 4.8, 36, 1.15, 0.42);

    const master = this.ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.connect(dest);

    if (this.doorCreakBuffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.doorCreakBuffer;
      const idealDur = 0.78;
      const baseRate = this.doorCreakBuffer.duration > 0.1
        ? Math.max(0.75, Math.min(1.55, this.doorCreakBuffer.duration / idealDur))
        : 1.0;
      src.playbackRate.setValueAtTime(baseRate * (0.96 + Math.random() * 0.08), now);
      src.connect(master);
      master.gain.setTargetAtTime(0.95, now, 0.02);
      src.start(now);
      return { isSample: true, master, sampleSrc: src, stopped: false };
    }

    if (!this.pinkNoiseBuffer) return null;

    // Fallback wooden hinge friction if WAV is absent
    const rubSrc = this.ctx.createBufferSource();
    rubSrc.buffer = this.pinkNoiseBuffer;
    rubSrc.loop = true;
    const rubFilter = this.ctx.createBiquadFilter();
    rubFilter.type = 'bandpass';
    rubFilter.frequency.setValueAtTime(320, now);
    rubFilter.Q.value = 5.5;
    const rubGain = this.ctx.createGain();
    rubGain.gain.value = 0.85;
    rubSrc.connect(rubFilter);
    rubFilter.connect(rubGain);
    rubGain.connect(master);
    rubSrc.start(now, Math.random() * 2.0);

    return { isSample: false, master, rubSrc, rubFilter, stopped: false };
  }

  updateDoorCreak(handle, speedNorm, progress) {
    if (!handle || handle.stopped || !this.ctx) return;
    const now = this.ctx.currentTime;
    const clamped = Math.max(0, Math.min(1, speedNorm));

    if (handle.isSample) {
      const targetGain = clamped > 0.02 ? (0.55 + clamped * 0.45) : 0.0001;
      handle.master.gain.setTargetAtTime(targetGain, now, 0.03);
      return;
    }

    const targetGain = clamped > 0.02 ? (0.14 + clamped * 0.42) : 0.0001;
    handle.master.gain.setTargetAtTime(targetGain, now, 0.03);
    handle.rubFilter.frequency.setTargetAtTime(240 + progress * 160 + clamped * 160, now, 0.04);
  }

  stopDoorCreak(handle) {
    if (!handle || handle.stopped || !this.ctx) return;
    handle.stopped = true;
    const now = this.ctx.currentTime;
    handle.master.gain.cancelScheduledValues(now);
    handle.master.gain.setTargetAtTime(0.0001, now, 0.03);
    const stopAt = now + 0.12;
    try {
      if (handle.isSample) handle.sampleSrc.stop(stopAt);
      else handle.rubSrc.stop(stopAt);
    } catch (_) {
      // Already stopped
    }
  }

  playDoorStopThud(worldPos, isClose = false) {
    if (!this.started) this.init();
    if (!this.ctx || !this.pinkNoiseBuffer) return;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    const now = this.ctx.currentTime;
    const dest = this._createSpatialNode(worldPos, 4.5, 36, 1.15, 0.48);

    const sub = this.ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(isClose ? 92 : 76, now);
    sub.frequency.exponentialRampToValueAtTime(28, now + (isClose ? 0.20 : 0.16));
    const sg = this.ctx.createGain();
    sg.gain.setValueAtTime(0.001, now);
    sg.gain.linearRampToValueAtTime(isClose ? 0.55 : 0.42, now + 0.012);
    sg.gain.exponentialRampToValueAtTime(0.0008, now + (isClose ? 0.24 : 0.19));
    sub.connect(sg);
    sg.connect(dest);
    sub.start(now);
    sub.stop(now + 0.26);

    const body = this.ctx.createBufferSource();
    body.buffer = this.pinkNoiseBuffer;
    const bf = this.ctx.createBiquadFilter();
    bf.type = 'lowpass';
    bf.frequency.value = isClose ? 340 : 250;
    const bg = this.ctx.createGain();
    bg.gain.setValueAtTime(isClose ? 0.42 : 0.30, now);
    bg.gain.exponentialRampToValueAtTime(0.0008, now + 0.12);
    body.connect(bf);
    bf.connect(bg);
    bg.connect(dest);
    body.start(now, Math.random() * 2.0, 0.14);

    if (isClose) this.playDoorLatchClick(worldPos);
  }

  playDoor(opening, worldPos = null) {
    if (opening) this.playDoorHandleGrab(worldPos);
    else this.playDoorStopThud(worldPos, true);
  }

  /**
   * Realistic tactile mechanical flashlight switch (dual-transient click, zero square-wave beep)
   */
  playFlashlightClick() {
    if (!this.started || !this.ctx || !this.whiteNoiseBuffer) return;
    const now = this.ctx.currentTime;

    // 1. Tactile button press detent
    const s1 = this.ctx.createBufferSource();
    s1.buffer = this.whiteNoiseBuffer;
    const f1 = this.ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.value = 3400;
    f1.Q.value = 2.8;
    const g1 = this.ctx.createGain();
    g1.gain.setValueAtTime(0.24, now);
    g1.gain.exponentialRampToValueAtTime(0.001, now + 0.012);
    s1.connect(f1);
    f1.connect(g1);
    g1.connect(this.masterGain);
    s1.start(now, Math.random() * 2.5, 0.016);

    // 2. Spring latch snap 9ms later + hollow metal tube housing resonance
    const s2 = this.ctx.createBufferSource();
    s2.buffer = this.whiteNoiseBuffer;
    const f2 = this.ctx.createBiquadFilter();
    f2.type = 'bandpass';
    f2.frequency.value = 1850;
    f2.Q.value = 3.5;
    const g2 = this.ctx.createGain();
    g2.gain.setValueAtTime(0.28, now + 0.009);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.028);
    s2.connect(f2);
    f2.connect(g2);
    g2.connect(this.masterGain);
    s2.start(now + 0.009, Math.random() * 2.5, 0.025);
  }

  playWaterSplash() {
    // Water ambient/splash disabled per pure-silence direction
  }

  /**
   * Realistic deep infrasonic reptilian chest rumble (no raw arcade sawtooth)
   */
  playCrocGrowl(worldPos = null) {
    if (!this.started || !this.ctx) return;
    if (this.sfxBuffers.croc_growl) {
      this._playSpatialBuffer(this.sfxBuffers.croc_growl, worldPos, { gain: 0.85, rateJitter: 0.08 });
      return;
    }
    if (!this.pinkNoiseBuffer) return;
    const now = this.ctx.currentTime;
    const dest = worldPos ? this._createSpatialNode(worldPos, 3.0, 32, 1.25, 0.15) : this.masterGain;

    // Deep infrasonic chest bellow (42 -> 28 Hz)
    const sub = this.ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(46, now);
    sub.frequency.exponentialRampToValueAtTime(28, now + 0.92);
    const sg = this.ctx.createGain();
    sg.gain.setValueAtTime(0.001, now);
    sg.gain.linearRampToValueAtTime(0.42, now + 0.14);
    sg.gain.exponentialRampToValueAtTime(0.001, now + 0.98);
    sub.connect(sg);
    sg.connect(dest);
    sub.start(now);
    sub.stop(now + 1.02);

    // Gritty low-passed reptilian throat vibration
    const grit = this.ctx.createBufferSource();
    grit.buffer = this.pinkNoiseBuffer;
    const gf = this.ctx.createBiquadFilter();
    gf.type = 'bandpass';
    gf.frequency.setValueAtTime(135, now);
    gf.frequency.exponentialRampToValueAtTime(82, now + 0.88);
    gf.Q.value = 3.2;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 17;
    const lfoG = this.ctx.createGain();
    lfoG.gain.value = 0.14;
    const gg = this.ctx.createGain();
    gg.gain.setValueAtTime(0.001, now);
    gg.gain.linearRampToValueAtTime(0.32, now + 0.12);
    gg.gain.exponentialRampToValueAtTime(0.001, now + 0.92);
    lfo.connect(lfoG);
    lfoG.connect(gg.gain);
    grit.connect(gf);
    gf.connect(gg);
    gg.connect(dest);
    grit.start(now, Math.random() * 2.0, 0.95);
    lfo.start(now);
    lfo.stop(now + 0.96);
  }

  /**
   * Brutal realistic jaw-snap & wet bone crunch (zero arcade square wave!)
   */
  playCrocBite() {
    if (!this.started || !this.ctx) return;
    this.playPlayerGasp(1.0);
    if (this.sfxBuffers.croc_bite) {
      this._playSpatialBuffer(this.sfxBuffers.croc_bite, null, { gain: 0.95, rateJitter: 0.06 });
      return;
    }
    if (!this.whiteNoiseBuffer || !this.pinkNoiseBuffer) return;
    this.playCrocGrowl();
    const now = this.ctx.currentTime;

    // 1. Sharp jaw-clamp bone-crack transient
    const crack = this.ctx.createBufferSource();
    crack.buffer = this.whiteNoiseBuffer;
    const cf = this.ctx.createBiquadFilter();
    cf.type = 'bandpass';
    cf.frequency.setValueAtTime(1450, now);
    cf.frequency.exponentialRampToValueAtTime(420, now + 0.12);
    cf.Q.value = 1.8;
    const shaper = this.ctx.createWaveShaper();
    shaper.curve = this.gritCurveHarsh;
    const cg = this.ctx.createGain();
    cg.gain.setValueAtTime(0.52, now);
    cg.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    crack.connect(cf);
    cf.connect(shaper);
    shaper.connect(cg);
    cg.connect(this.masterGain);
    crack.start(now, Math.random() * 2.0, 0.16);

    // 2. Heavy underwater body impact thud
    const thud = this.ctx.createOscillator();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(105, now);
    thud.frequency.exponentialRampToValueAtTime(24, now + 0.22);
    const tg = this.ctx.createGain();
    tg.gain.setValueAtTime(0.62, now);
    tg.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    thud.connect(tg);
    tg.connect(this.masterGain);
    thud.start(now);
    thud.stop(now + 0.27);
  }

  // =========================================================================
  // ORGANIC VOCAL-TRACT HELPER (FORMANT WHISPERS / BREATHS — ZERO ROBOTIC TONES)
  // =========================================================================

  _playWhisperSyllables(dest, startTime, syllables) {
    if (!this.pinkNoiseBuffer) return;
    for (const s of syllables) {
      const t = startTime + s.delay;
      const src = this.ctx.createBufferSource();
      src.buffer = this.pinkNoiseBuffer;

      const f1 = this.ctx.createBiquadFilter();
      f1.type = 'bandpass';
      f1.frequency.setValueAtTime(s.f1, t);
      f1.frequency.linearRampToValueAtTime(s.f1 * 0.86, t + s.dur);
      f1.Q.value = 5.5;

      const f2 = this.ctx.createBiquadFilter();
      f2.type = 'bandpass';
      f2.frequency.setValueAtTime(s.f2, t);
      f2.frequency.linearRampToValueAtTime(s.f2 * 0.90, t + s.dur);
      f2.Q.value = 7.0;

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0005, t);
      g.gain.linearRampToValueAtTime(s.gain, t + s.dur * 0.28);
      g.gain.exponentialRampToValueAtTime(0.0005, t + s.dur);

      src.connect(f1);
      src.connect(f2);
      f1.connect(g);
      f2.connect(g);
      g.connect(dest);
      src.start(t, Math.random() * 2.2, s.dur + 0.04);
    }
  }

  // =========================================================================
  // UNIQUE 3D DIRECTIONAL AUDIO FOR EACH OF THE 4 HORROR CHARACTERS
  // =========================================================================

  /**
   * 1. UNIQUE FOOTSTEPS / MOVEMENT PER MONSTER (3D HRTF spatialized)
   */
  playMonsterStep(monsterType, worldPos, chasing) {
    if (!this.started || !this.ctx || !this.pinkNoiseBuffer) return;
    const now = this.ctx.currentTime;
    const pan = this._createSpatialNode(worldPos, 2.2, 32, 1.35, 0.36);

    if (monsterType === 'crawling_creature') {
      // Rapid bony multi-limb skittering & dry claw-clicks on stone
      const taps = chasing ? 2 : 1;
      for (let i = 0; i < taps; i++) {
        const t = now + i * 0.065;
        const src = this.ctx.createBufferSource();
        src.buffer = this.whiteNoiseBuffer;
        const f = this.ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = (chasing ? 1700 : 1280) + Math.random() * 480;
        f.Q.value = 4.4;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(chasing ? 0.30 : 0.17, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.050);
        src.connect(f);
        f.connect(g);
        g.connect(pan);
        src.start(t, Math.random() * 2.5, 0.06);
      }
      return;
    }

    if (monsterType === 'horror_girl') {
      // Quiet, eerie damp barefoot slap on cold cobblestone
      const src = this.ctx.createBufferSource();
      src.buffer = this.pinkNoiseBuffer;
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = (chasing ? 720 : 540) + Math.random() * 140;
      f.Q.value = 1.6;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(chasing ? 0.22 : 0.11, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.072);
      src.connect(f);
      f.connect(g);
      g.connect(pan);
      src.start(now, Math.random() * 2.5, 0.085);
      return;
    }

    if (monsterType === 'the_butcher') {
      // Heavy booming leather-boot thud + stone grit + metallic cleaver drag
      const sub = this.ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(chasing ? 74 : 62, now);
      sub.frequency.exponentialRampToValueAtTime(26, now + 0.16);
      const sg = this.ctx.createGain();
      sg.gain.setValueAtTime(chasing ? 0.54 : 0.36, now);
      sg.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
      sub.connect(sg);
      sg.connect(pan);
      sub.start(now);
      sub.stop(now + 0.21);

      const src = this.ctx.createBufferSource();
      src.buffer = this.pinkNoiseBuffer;
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 340;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(chasing ? 0.28 : 0.18, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      src.connect(f);
      f.connect(g);
      g.connect(pan);
      src.start(now, Math.random() * 2.5, 0.16);

      if (Math.random() < 0.42) {
        const scrape = this.ctx.createBufferSource();
        scrape.buffer = this.whiteNoiseBuffer;
        const sf = this.ctx.createBiquadFilter();
        sf.type = 'bandpass';
        sf.frequency.setValueAtTime(2350 + Math.random() * 550, now + 0.04);
        sf.frequency.exponentialRampToValueAtTime(1350, now + 0.34);
        sf.Q.value = 10.5;
        const sgg = this.ctx.createGain();
        sgg.gain.setValueAtTime(0.001, now + 0.04);
        sgg.gain.linearRampToValueAtTime(chasing ? 0.16 : 0.10, now + 0.10);
        sgg.gain.exponentialRampToValueAtTime(0.0008, now + 0.36);
        scrape.connect(sf);
        sf.connect(sgg);
        sgg.connect(pan);
        scrape.start(now + 0.04, Math.random() * 2.0, 0.36);
      }
      return;
    }

    if (monsterType === 'the_nurse') {
      // Floating gown fabric air-glide + cold surgical steel bone-saw metallic scrape tick
      const src = this.ctx.createBufferSource();
      src.buffer = this.pinkNoiseBuffer;
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.setValueAtTime(chasing ? 1080 : 720, now);
      f.frequency.exponentialRampToValueAtTime(420, now + 0.24);
      f.Q.value = 2.2;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(chasing ? 0.18 : 0.10, now + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0008, now + 0.26);
      src.connect(f);
      f.connect(g);
      g.connect(pan);
      src.start(now, Math.random() * 2.0, 0.28);

      if (Math.random() < 0.55) {
        // Metallic surgical instrument clink (filtered noise transient, not a pure sine beep)
        const clink = this.ctx.createBufferSource();
        clink.buffer = this.whiteNoiseBuffer;
        const cf = this.ctx.createBiquadFilter();
        cf.type = 'bandpass';
        cf.frequency.value = 3400 + Math.random() * 800;
        cf.Q.value = 16.0;
        const cg = this.ctx.createGain();
        cg.gain.setValueAtTime(chasing ? 0.12 : 0.07, now + 0.05);
        cg.gain.exponentialRampToValueAtTime(0.0005, now + 0.11);
        clink.connect(cf);
        cf.connect(cg);
        cg.connect(pan);
        clink.start(now + 0.05, Math.random() * 2.0, 0.08);
      }
    }
  }

  /**
   * 2. REALISTIC CHARACTER VOCALS PER MONSTER (zero cartoon triangle giggles or sine wails)
   */
  playMonsterVocal(monsterType, worldPos, chasing) {
    if (!this.started || !this.ctx || !this.pinkNoiseBuffer) return;

    const sfxKeyMap = {
      crawling_creature: 'crawling_vocal',
      horror_girl: 'girl_vocal',
      the_butcher: 'butcher_vocal',
      the_nurse: 'nurse_vocal'
    };
    const sample = this.sfxBuffers[sfxKeyMap[monsterType]];
    if (sample) {
      this._playSpatialBuffer(sample, worldPos, {
        gain: chasing ? 0.92 : 0.68,
        rate: chasing ? 1.06 : 0.98,
        rateJitter: 0.06,
        wetAmount: 0.48
      });
      return;
    }

    const now = this.ctx.currentTime;
    const pan = this._createSpatialNode(worldPos, 2.6, 34, 1.28, 0.48);

    if (monsterType === 'crawling_creature') {
      // Wet guttural throat-rattle + phlegmy hiss (waveshaped glottal rumble + bandpass noise)
      const grit = this.ctx.createBufferSource();
      grit.buffer = this.pinkNoiseBuffer;
      const gf = this.ctx.createBiquadFilter();
      gf.type = 'bandpass';
      gf.frequency.setValueAtTime(chasing ? 680 : 380, now);
      gf.frequency.exponentialRampToValueAtTime(chasing ? 940 : 240, now + 0.45);
      gf.Q.value = 3.2;

      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = chasing ? 27 : 18;
      const lfoG = this.ctx.createGain();
      lfoG.gain.value = 0.16;

      const shaper = this.ctx.createWaveShaper();
      shaper.curve = this.gritCurveSoft;

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(chasing ? 0.34 : 0.22, now + 0.14);
      g.gain.exponentialRampToValueAtTime(0.0008, now + 0.92);

      lfo.connect(lfoG);
      lfoG.connect(g.gain);
      grit.connect(gf);
      gf.connect(shaper);
      shaper.connect(g);
      g.connect(pan);
      grit.start(now, Math.random() * 2.0, 0.96);
      lfo.start(now);
      lfo.stop(now + 0.98);

      // Sub-throat growl floor
      const sub = this.ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(chasing ? 84 : 62, now);
      sub.frequency.exponentialRampToValueAtTime(42, now + 0.85);
      const sg = this.ctx.createGain();
      sg.gain.setValueAtTime(0.001, now);
      sg.gain.linearRampToValueAtTime(chasing ? 0.22 : 0.14, now + 0.12);
      sg.gain.exponentialRampToValueAtTime(0.0008, now + 0.88);
      sub.connect(sg);
      sg.connect(pan);
      sub.start(now);
      sub.stop(now + 0.92);
      return;
    }

    if (monsterType === 'horror_girl') {
      // Realistic trembling breathy sob / hollow eerie whisper (NO cartoon triangle-wave giggle!)
      if (!chasing && Math.random() < 0.50) {
        // 3 trembling hushed breathy exhales (eerie muffled sobbing in the dark)
        this._playWhisperSyllables(pan, now, [
          { delay: 0.00, dur: 0.22, f1: 660, f2: 1750, gain: 0.17 },
          { delay: 0.26, dur: 0.24, f1: 580, f2: 1520, gain: 0.15 },
          { delay: 0.56, dur: 0.38, f1: 490, f2: 1280, gain: 0.13 }
        ]);
      } else {
        // Long chilling hollow breath-hiss / haunted exhale
        this._playWhisperSyllables(pan, now, [
          { delay: 0.00, dur: 0.88, f1: chasing ? 840 : 620, f2: chasing ? 2150 : 1580, gain: chasing ? 0.28 : 0.18 }
        ]);
      }
      return;
    }

    if (monsterType === 'the_butcher') {
      // Heavy labored leather-mask breathing (deep muffled inhale + raspy chest exhale)
      const inSrc = this.ctx.createBufferSource();
      inSrc.buffer = this.pinkNoiseBuffer;
      const inF = this.ctx.createBiquadFilter();
      inF.type = 'bandpass';
      inF.frequency.setValueAtTime(340, now);
      inF.frequency.linearRampToValueAtTime(480, now + 0.36);
      inF.Q.value = 2.2;
      const inG = this.ctx.createGain();
      inG.gain.setValueAtTime(0.001, now);
      inG.gain.linearRampToValueAtTime(chasing ? 0.24 : 0.15, now + 0.18);
      inG.gain.exponentialRampToValueAtTime(0.0008, now + 0.38);
      inSrc.connect(inF);
      inF.connect(inG);
      inG.connect(pan);
      inSrc.start(now, Math.random() * 2.0, 0.42);

      // Heavy masked guttural exhale
      const exStart = now + 0.40;
      const exSrc = this.ctx.createBufferSource();
      exSrc.buffer = this.pinkNoiseBuffer;
      const exF = this.ctx.createBiquadFilter();
      exF.type = 'lowpass';
      exF.frequency.setValueAtTime(chasing ? 460 : 320, exStart);
      const exG = this.ctx.createGain();
      exG.gain.setValueAtTime(0.001, exStart);
      exG.gain.linearRampToValueAtTime(chasing ? 0.34 : 0.22, exStart + 0.12);
      exG.gain.exponentialRampToValueAtTime(0.0008, exStart + 0.65);
      exSrc.connect(exF);
      exF.connect(exG);
      exG.connect(pan);
      exSrc.start(exStart, Math.random() * 2.0, 0.68);

      // Deep chest grunt floor
      const sub = this.ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(chasing ? 64 : 52, exStart);
      sub.frequency.exponentialRampToValueAtTime(34, exStart + 0.55);
      const sg = this.ctx.createGain();
      sg.gain.setValueAtTime(0.001, exStart);
      sg.gain.linearRampToValueAtTime(chasing ? 0.26 : 0.16, exStart + 0.10);
      sg.gain.exponentialRampToValueAtTime(0.0008, exStart + 0.58);
      sub.connect(sg);
      sg.connect(pan);
      sub.start(exStart);
      sub.stop(exStart + 0.62);
      return;
    }

    if (monsterType === 'the_nurse') {
      // Strained bandage-muffled wheezing (+ cold serrated steel scrape when chasing, NO mosquito sawtooth)
      const wheeze = this.ctx.createBufferSource();
      wheeze.buffer = this.pinkNoiseBuffer;
      const wf = this.ctx.createBiquadFilter();
      wf.type = 'bandpass';
      wf.frequency.setValueAtTime(chasing ? 1320 : 940, now);
      wf.frequency.exponentialRampToValueAtTime(chasing ? 1780 : 660, now + 0.56);
      wf.Q.value = 7.5;
      const wg = this.ctx.createGain();
      wg.gain.setValueAtTime(0.001, now);
      wg.gain.linearRampToValueAtTime(chasing ? 0.26 : 0.17, now + 0.18);
      wg.gain.exponentialRampToValueAtTime(0.0008, now + 0.72);
      wheeze.connect(wf);
      wf.connect(wg);
      wg.connect(pan);
      wheeze.start(now, Math.random() * 2.0, 0.76);

      if (chasing) {
        // Cold metallic bone-saw scrape friction
        const scrape = this.ctx.createBufferSource();
        scrape.buffer = this.whiteNoiseBuffer;
        const sf = this.ctx.createBiquadFilter();
        sf.type = 'bandpass';
        sf.frequency.setValueAtTime(2600, now + 0.06);
        sf.frequency.exponentialRampToValueAtTime(1650, now + 0.48);
        sf.Q.value = 14.0;
        const sg = this.ctx.createGain();
        sg.gain.setValueAtTime(0.001, now + 0.06);
        sg.gain.linearRampToValueAtTime(0.16, now + 0.14);
        sg.gain.exponentialRampToValueAtTime(0.0008, now + 0.50);
        scrape.connect(sf);
        sf.connect(sg);
        sg.connect(pan);
        scrape.start(now + 0.06, Math.random() * 2.0, 0.48);
      }
    }
  }

  /**
   * 3. REAL 3D SPATIALIZED HORROR CHARACTER VOICE LINES (ZERO ROBOTIC speechSynthesis!)
   * Plays real pre-recorded voice files from assets/audio/voices/<slot>.mp3 (or .wav)
   * through true 3D HRTF spatialization + dark stone-corridor reverb.
   * When custom voice files are not yet present, plays an atmospheric, non-robotic
   * 3D whispered breath / guttural vocal presence cue instead.
   */
  playMonsterVoiceLine(monsterType, worldPos, dist) {
    if (!this.started || !this.ctx) return;
    if (this.time - this.lastVoiceLineTime < 11.0) return;
    if (dist > 22) return;
    this.lastVoiceLineTime = this.time;

    const bank = this.voiceBuffers[monsterType];
    if (bank && bank.length > 0) {
      const clip = bank[Math.floor(Math.random() * bank.length)];
      this._playSpatialBuffer(clip, worldPos, {
        gain: 0.92,
        rate: 1.0,
        rateJitter: 0.03,
        refDistance: 3.4,
        maxDistance: 28,
        rolloff: 1.2,
        wetAmount: 0.52
      });
      return;
    }

    // Non-robotic atmospheric fallback when real voice-actor files haven't been dropped in yet:
    // eerie 3D directional whispered cadence or heavy masked breath from the monster's exact position
    const now = this.ctx.currentTime;
    const pan = this._createSpatialNode(worldPos, 3.0, 28, 1.2, 0.55);

    if (monsterType === 'horror_girl') {
      this._playWhisperSyllables(pan, now, [
        { delay: 0.00, dur: 0.30, f1: 720, f2: 1920, gain: 0.20 },
        { delay: 0.34, dur: 0.26, f1: 640, f2: 1680, gain: 0.17 },
        { delay: 0.66, dur: 0.46, f1: 560, f2: 1450, gain: 0.19 }
      ]);
    } else if (monsterType === 'the_nurse') {
      this._playWhisperSyllables(pan, now, [
        { delay: 0.00, dur: 0.34, f1: 540, f2: 1420, gain: 0.20 },
        { delay: 0.40, dur: 0.44, f1: 480, f2: 1240, gain: 0.18 }
      ]);
    } else {
      this.playMonsterVocal(monsterType, worldPos, false);
    }
  }

  /**
   * 4. REALISTIC HORROR ATTACK SOUNDS PER MONSTER (zero Atari/cartoon oscillators)
   */
  playMonsterAttack(monsterType, worldPos = null) {
    if (!this.started || !this.ctx) return;
    this.playPlayerGasp(1.0);

    const sfxKeyMap = {
      crawling_creature: 'crawling_attack',
      horror_girl: 'girl_attack',
      the_butcher: 'butcher_attack',
      the_nurse: 'nurse_attack'
    };
    const sample = this.sfxBuffers[sfxKeyMap[monsterType]];
    if (sample) {
      this._playSpatialBuffer(sample, worldPos, {
        gain: 0.96,
        rateJitter: 0.05,
        refDistance: 2.0,
        maxDistance: 28,
        wetAmount: 0.38
      });
      return;
    }

    if (!this.whiteNoiseBuffer || !this.pinkNoiseBuffer) return;
    const now = this.ctx.currentTime;
    const dest = worldPos ? this._createSpatialNode(worldPos, 1.8, 26, 1.0, 0.38) : this.masterGain;

    // Shared heavy visceral jump-scare chest thump
    const punch = this.ctx.createOscillator();
    punch.type = 'sine';
    punch.frequency.setValueAtTime(98, now);
    punch.frequency.exponentialRampToValueAtTime(24, now + 0.24);
    const pg = this.ctx.createGain();
    pg.gain.setValueAtTime(0.56, now);
    pg.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    punch.connect(pg);
    pg.connect(dest);
    punch.start(now);
    punch.stop(now + 0.30);

    if (monsterType === 'crawling_creature') {
      // Feral hissed snarl + dry bone-snap crack
      const hiss = this.ctx.createBufferSource();
      hiss.buffer = this.whiteNoiseBuffer;
      const hf = this.ctx.createBiquadFilter();
      hf.type = 'bandpass';
      hf.frequency.setValueAtTime(1650, now);
      hf.frequency.exponentialRampToValueAtTime(480, now + 0.32);
      hf.Q.value = 2.4;
      const shaper = this.ctx.createWaveShaper();
      shaper.curve = this.gritCurveHarsh;
      const hg = this.ctx.createGain();
      hg.gain.setValueAtTime(0.46, now);
      hg.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
      hiss.connect(hf);
      hf.connect(shaper);
      shaper.connect(hg);
      hg.connect(dest);
      hiss.start(now, Math.random() * 2.0, 0.38);
    } else if (monsterType === 'horror_girl') {
      // Distorted vocal-tract air-rush shriek (no square/sawtooth Atari alarm!)
      const shriek = this.ctx.createBufferSource();
      shriek.buffer = this.whiteNoiseBuffer;
      const f1 = this.ctx.createBiquadFilter();
      f1.type = 'bandpass';
      f1.frequency.setValueAtTime(1150, now);
      f1.frequency.exponentialRampToValueAtTime(2150, now + 0.16);
      f1.frequency.exponentialRampToValueAtTime(920, now + 0.48);
      f1.Q.value = 4.5;
      const f2 = this.ctx.createBiquadFilter();
      f2.type = 'bandpass';
      f2.frequency.setValueAtTime(2600, now);
      f2.frequency.exponentialRampToValueAtTime(1550, now + 0.48);
      f2.Q.value = 5.5;
      const shaper = this.ctx.createWaveShaper();
      shaper.curve = this.gritCurveHarsh;
      const sg = this.ctx.createGain();
      sg.gain.setValueAtTime(0.001, now);
      sg.gain.linearRampToValueAtTime(0.44, now + 0.04);
      sg.gain.exponentialRampToValueAtTime(0.001, now + 0.50);
      shriek.connect(f1);
      shriek.connect(f2);
      f1.connect(shaper);
      f2.connect(shaper);
      shaper.connect(sg);
      sg.connect(dest);
      shriek.start(now, Math.random() * 2.0, 0.54);
    } else if (monsterType === 'the_butcher') {
      // Heavy steel cleaver slash + wet impact + cold blade ring
      const slash = this.ctx.createBufferSource();
      slash.buffer = this.whiteNoiseBuffer;
      const sf = this.ctx.createBiquadFilter();
      sf.type = 'bandpass';
      sf.frequency.setValueAtTime(3200, now);
      sf.frequency.exponentialRampToValueAtTime(520, now + 0.24);
      sf.Q.value = 3.6;
      const sgg = this.ctx.createGain();
      sgg.gain.setValueAtTime(0.48, now);
      sgg.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      slash.connect(sf);
      sf.connect(sgg);
      sgg.connect(dest);
      slash.start(now, Math.random() * 2.0, 0.30);
    } else {
      // The Nurse: gritty serrated steel bone-saw rasp + surgical slash (no cartoon sawtooth!)
      const rasp = this.ctx.createBufferSource();
      rasp.buffer = this.whiteNoiseBuffer;
      const rf = this.ctx.createBiquadFilter();
      rf.type = 'bandpass';
      rf.frequency.setValueAtTime(2950, now);
      rf.frequency.exponentialRampToValueAtTime(1120, now + 0.34);
      rf.Q.value = 8.5;
      const shaper = this.ctx.createWaveShaper();
      shaper.curve = this.gritCurveHarsh;
      const rg = this.ctx.createGain();
      rg.gain.setValueAtTime(0.42, now);
      rg.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      rasp.connect(rf);
      rf.connect(shaper);
      shaper.connect(rg);
      rg.connect(dest);
      rasp.start(now, Math.random() * 2.0, 0.40);
    }
  }
}
