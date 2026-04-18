import {
  getSoundEventConfig,
  SOUND_EVENTS,
  SPECIES_AUDIO_SCALE,
  SPECIES_SOUND_GROUP,
  SOUND_GROUP_PARAMS,
  AMBIENCE_SAMPLES,
  AUDIO_PIPELINE_DEFAULTS,
} from './soundEvents.js';
import { clamp, computePositionalMix } from './soundMath.js';

const MAX_ACTIVE_VOICES = 24;
const MAX_SFX_PER_TICK = 4;
const MAX_VOCAL_PER_TICK = 1;
const ZERO_GAIN = 0.0001;
const PLAYBACK_RATE_MIN = 0.9;
const PLAYBACK_RATE_MAX = 1.1;
const PITCH_JITTER = 0.05;
const BUS_RAMP_SECONDS = 0.05;
const AMBIENCE_FADE_SECONDS = 1.2;
const PROCEDURAL_VARIANT_COUNT = 3;
const SFX_BUS_BOOST = 2.8;
const AMBIENCE_BUS_BOOST = 1.8;
const MASTER_BUS_BOOST = 1.4;
const OUTPUT_MAKEUP_GAIN = 1.7;

function hashString(value) {
  if (!value) return 0;
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function rampParam(param, value, time, duration = BUS_RAMP_SECONDS) {
  if (!param) return;
  param.cancelScheduledValues(time);
  param.setValueAtTime(param.value, time);
  param.linearRampToValueAtTime(value, time + duration);
}

function setEnvelope(param, now, peak, duration) {
  const safePeak = Math.max(ZERO_GAIN, peak);
  param.cancelScheduledValues(now);
  param.setValueAtTime(ZERO_GAIN, now);
  param.linearRampToValueAtTime(safePeak, now + 0.008);
  param.exponentialRampToValueAtTime(Math.max(ZERO_GAIN, safePeak * 0.45), now + duration * 0.55);
  param.exponentialRampToValueAtTime(ZERO_GAIN, now + duration);
}

function safeDisconnect(node) {
  if (!node || typeof node.disconnect !== 'function') return;
  try {
    node.disconnect();
  } catch {
    // Node may already be disconnected during cleanup.
  }
}

export class SoundManager {
  constructor() {
    this.context = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.ambienceGain = null;
    this.outputCompressor = null;
    this.outputMakeupGain = null;

    this.viewport = null;
    this.settings = {
      muted: false,
      masterVolume: 0.72,
      sfxVolume: 0.88,
      ambienceVolume: 0.48,
      sfxEnabled: true,
      ambienceEnabled: true,
      unlocked: false,
    };

    this._activeVoices = 0;
    this._lastPlayedAt = new Map();
    this._cleanupTimers = new Set();
    this._noiseBuffer = null;
    this._ambienceMode = 'day';

    // Per-tick event budget tracking
    this._currentTick = -1;
    this._tickEventCount = 0;
    this._tickVocalCount = 0;
    this._tickBestPriority = Infinity;
    this._dayLayer = null;
    this._nightLayer = null;
    this._ambienceSampleLayers = null;   // { birds, insects, crickets, wind } loaded AudioBufferSourceNodes
    this._ecoMood = null;                // { biodiversity, population, trend } from computeEcoMood
    this._logger = null;
    this._ringBuffer = [];
    this._ringBufferLimit = 300;

    this._pipelineOptions = {
      proceduralOnly: AUDIO_PIPELINE_DEFAULTS.proceduralOnly,
      sampleFallbackEnabled: AUDIO_PIPELINE_DEFAULTS.sampleFallbackEnabled,
    };
    this._proceduralCache = new Map();
    this._proceduralCacheWarmed = false;

    /** @type {Map<string, AudioBuffer>} URL → decoded AudioBuffer cache */
    this._sampleBuffers = new Map();
    /** @type {Map<string, 'loading'|'ready'|'error'>} */
    this._sampleLoadState = new Map();
  }

  setLogger(logger, { flush = false, onFlush = null } = {}) {
    this._logger = typeof logger === 'function' ? logger : null;
    if (flush && this._ringBuffer.length > 0) {
      const pending = this._ringBuffer.slice();
      this._ringBuffer = [];
      if (onFlush) {
        onFlush(pending);
      } else if (this._logger) {
        for (const entry of pending) this._logger(entry);
      }
    }
  }

  applySettings(patch) {
    this.settings = { ...this.settings, ...patch };
    if (this.context) {
      this._syncBuses();
      this._syncAmbienceMix();
      this._syncAmbienceSampleLayers();
    }
  }

  setViewport(viewport) {
    if (!viewport) {
      this.viewport = null;
      return;
    }
    this.viewport = { ...viewport };
  }

  syncClock(clock) {
    if (!clock) return;
    const nextMode = clock.is_night ? 'night' : 'day';
    const modeChanged = nextMode !== this._ambienceMode;
    this._ambienceMode = nextMode;
    if (this.context) {
      this._syncAmbienceMix();
      this._syncAmbienceSampleLayers();
    }
    if (modeChanged && this.settings.unlocked && this.settings.ambienceEnabled && !this.settings.muted) {
      this._emitLog({
        type: 'ambience',
        category: 'ambience',
        mode: this._ambienceMode,
        gain: this.settings.ambienceVolume,
      });
    }
  }

  async unlock() {
    const context = this._ensureContext();
    if (!context) return false;

    if (context.state !== 'running') {
      try {
        await context.resume();
      } catch {
        return false;
      }
    }

    this.settings.unlocked = context.state === 'running';
    this._ensureAmbienceLayers();
    this._syncBuses();
    this._syncAmbienceMix();
    return this.settings.unlocked;
  }

  async preloadSamples() {
    if (!this._pipelineOptions.sampleFallbackEnabled) return;

    const context = this._ensureContext();
    if (!context) return;

    const urls = [];
    for (const cfg of Object.values(SOUND_EVENTS)) {
      if (cfg?.enabled === false) continue;
      if (Array.isArray(cfg.samples)) {
        for (const url of cfg.samples) urls.push(url);
      }
    }
    for (const url of AMBIENCE_SAMPLES) urls.push(url);

    await Promise.allSettled(urls.map((url) => this._loadSample(url)));
    this._ensureAmbienceSampleLayers();
  }

  async preGenerateProceduralCache() {
    const context = this._ensureContext();
    if (!context || !this.settings.unlocked || this._proceduralCacheWarmed) return;

    const groupNames = [null, ...Object.keys(SOUND_GROUP_PARAMS)];
    const jobs = [];

    for (const config of Object.values(SOUND_EVENTS)) {
      if (!config || config.enabled === false || !config.preset) continue;
      const preset = config.preset;
      const targets = config.positional ? groupNames : [null];
      for (const groupName of targets) {
        for (let variant = 0; variant < PROCEDURAL_VARIANT_COUNT; variant++) {
          jobs.push({ preset, groupName, variant });
        }
      }
    }

    const pending = jobs.filter((j) => !this._proceduralCache.has(this._cacheKey(j.preset, j.groupName, j.variant)));
    const BATCH_SIZE = 6;
    for (let i = 0; i < pending.length; i += BATCH_SIZE) {
      const batch = pending.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((j) => this._renderProceduralBuffer(j.preset, j.groupName, j.variant)),
      );
      results.forEach((result, idx) => {
        if (result.status === 'fulfilled' && result.value) {
          const j = batch[idx];
          this._proceduralCache.set(this._cacheKey(j.preset, j.groupName, j.variant), result.value);
        }
      });
    }
    this._proceduralCacheWarmed = true;
  }

  _cacheKey(preset, groupName, variant) {
    return `${preset}::${groupName || 'none'}::${variant}`;
  }

  _pickVariant(eventType, species, tick) {
    const seed = `${eventType || ''}|${species || ''}|${Number.isFinite(tick) ? tick : -1}`;
    return hashString(seed) % PROCEDURAL_VARIANT_COUNT;
  }

  _getCachedProceduralBuffer(preset, groupName, variant) {
    const exact = this._proceduralCache.get(this._cacheKey(preset, groupName, variant));
    if (exact) return exact;
    return this._proceduralCache.get(this._cacheKey(preset, null, variant)) || null;
  }

  async _renderProceduralBuffer(preset, groupName, variant) {
    if (typeof window === 'undefined') return null;
    const OfflineCtor = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OfflineCtor || !this.context) return null;

    const sampleRate = this.context.sampleRate;
    const length = Math.ceil(sampleRate * 1.25);
    const offline = new OfflineCtor(1, length, sampleRate);
    const gainNode = offline.createGain();
    gainNode.gain.value = ZERO_GAIN;
    gainNode.connect(offline.destination);

    const group = groupName ? SOUND_GROUP_PARAMS[groupName] : null;
    const pm = group ? group.pitchMul : 1;
    const gm = group ? group.gainMul : 1;
    const tt = group ? group.toneType : 'triangle';
    const variantShift = 1 + (variant - 1) * 0.04;
    const now = 0;

    const addOsc = (type, startHz, endHz, level, dur, detune = 0) => {
      const osc = offline.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(startHz * pm * variantShift, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, endHz * pm * variantShift), now + dur);
      osc.detune.value = detune + (variant - 1) * 5;
      const g = offline.createGain();
      g.gain.value = level;
      osc.connect(g);
      g.connect(gainNode);
      osc.start(now);
      osc.stop(now + dur + 0.02);
    };

    const addNoise = (filterType, freq, q, level, dur) => {
      const source = offline.createBufferSource();
      source.buffer = this._getNoiseBuffer();
      const filter = offline.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.value = freq;
      filter.Q.value = q;
      const g = offline.createGain();
      g.gain.setValueAtTime(ZERO_GAIN, now);
      g.gain.linearRampToValueAtTime(Math.max(ZERO_GAIN, level), now + 0.004);
      g.gain.exponentialRampToValueAtTime(ZERO_GAIN, now + dur);
      source.connect(filter);
      filter.connect(g);
      g.connect(gainNode);
      source.start(now);
      source.stop(now + dur + 0.03);
    };

    let duration = 0.1;
    switch (preset) {
      case 'attack':
        duration = 0.16;
        addNoise(group ? (group.noiseBand || 'bandpass') : 'bandpass', group ? (group.noiseFreq || 2600) : 2600, 2.2, 0.32, 0.07);
        addNoise('highpass', 5000, 1.5, 0.14, 0.03);
        addOsc(tt, 720, 250, 0.42, 0.08, -4);
        addOsc('sawtooth', 500, 210, 0.2, 0.09, 2);
        addOsc('triangle', 230, 108, 0.18, 0.11, 6);
        break;
      case 'attackVocal':
        duration = 0.2;
        if (groupName === 'bird') {
          addOsc('sine', 1650, 1180, 0.35, 0.08, 3);
          addOsc('triangle', 2200, 1500, 0.22, 0.07, -2);
          addNoise('bandpass', 3800, 2.2, 0.08, 0.05);
        } else {
          addNoise('bandpass', 820, 1.1, 0.18, 0.09);
          addOsc(tt, 210, 120, 0.38, 0.14, -5);
          addOsc('sawtooth', 320, 180, 0.16, 0.12, 4);
        }
        break;
      case 'death':
        duration = 0.38;
        addNoise(group ? (group.noiseBand || 'lowpass') : 'lowpass', group ? (group.noiseFreq || 540) : 540, 0.85, 0.24, 0.2);
        addNoise('bandpass', 1800, 1.1, 0.1, 0.11);
        addOsc(tt, 200, 52, 0.55, 0.36, -6);
        addOsc('sine', 82, 40, 0.26, 0.32, -8);
        addOsc('square', 280, 110, 0.1, 0.2, 9);
        break;
      case 'eat':
        duration = 0.11;
        addNoise(group ? (group.noiseBand || 'highpass') : 'highpass', group ? (group.noiseFreq || 3400) : 3400, 2.1, 0.22, 0.04);
        addNoise('bandpass', 1600, 1.8, 0.08, 0.05);
        addOsc('square', 560, 300, 0.28, 0.07, 6);
        addOsc('triangle', 350, 240, 0.16, 0.09, 1);
        addOsc('sine', 300, 205, 0.18, 0.11, -2);
        break;
      case 'drink':
        duration = 0.16;
        addNoise(group ? (group.noiseBand || 'lowpass') : 'lowpass', group ? (group.noiseFreq || 640) : 640, 0.95, 0.2, 0.1);
        addNoise('bandpass', 1200, 1.2, 0.08, 0.06);
        addOsc('triangle', 130, 70, 0.2, 0.1, -5);
        addOsc('triangle', 280, 170, 0.14, 0.12, 2);
        addOsc('sine', 520, 280, 0.07, 0.09, 8);
        break;
      case 'idleVocal':
        duration = 0.18;
        if (groupName === 'bird') {
          addOsc('sine', 1900, 2300, 0.24, 0.1, 5);
          addOsc('triangle', 1400, 1800, 0.14, 0.12, -4);
          addNoise('highpass', 5200, 1.4, 0.05, 0.04);
        } else {
          addNoise('lowpass', 540, 0.8, 0.08, 0.08);
          addOsc(tt, 180, 140, 0.2, 0.14, -3);
          addOsc('sine', 120, 92, 0.12, 0.16, 2);
        }
        break;
      case 'mate':
        duration = 0.23;
        addNoise('bandpass', 2600, 1.2, 0.05, 0.09);
        addOsc(tt, 360, 920, 0.42, 0.23, 4);
        addOsc('sine', 640, 1280, 0.2, 0.16, 11);
        addOsc('triangle', 220, 330, 0.13, 0.19, -8);
        break;
      case 'fruit':
        duration = 0.2;
        addOsc('sine', 760, 1220, 0.42, 0.2);
        addOsc('triangle', 1140, 1480, 0.2, 0.16, 5);
        break;
      case 'extinctionWarning':
        duration = 0.45;
        addOsc('sine', 260, 74, 0.7, 0.45);
        addOsc('triangle', 520, 160, 0.2, 0.34);
        break;
      case 'populationBoom':
        duration = 0.38;
        addOsc('triangle', 340, 680, 0.52, 0.38);
        addOsc('sine', 510, 980, 0.26, 0.3);
        break;
      case 'ecosystemCollapse':
        duration = 0.62;
        addOsc('sawtooth', 120, 86, 0.45, 0.62, -2);
        addOsc('triangle', 96, 62, 0.35, 0.56, 2);
        break;
      case 'pause':
        duration = 0.22;
        addOsc('triangle', 780, 320, 0.52, 0.2, -2);
        addOsc('sine', 450, 220, 0.26, 0.22);
        break;
      case 'resume':
        duration = 0.24;
        addOsc('triangle', 280, 760, 0.5, 0.22, 3);
        addOsc('sine', 420, 940, 0.23, 0.18, 6);
        break;
      case 'uiClick':
      default:
        duration = 0.09;
        addOsc('triangle', 640, 430, 0.6, 0.09, 6);
        addOsc('sine', 920, 660, 0.2, 0.09);
        break;
    }

    setEnvelope(gainNode.gain, now, 0.55 * gm, duration);
    const rendered = await offline.startRendering();
    return rendered || null;
  }

  async _loadSample(url) {
    if (this._sampleLoadState.has(url)) return this._sampleBuffers.get(url) || null;

    const context = this._ensureContext();
    if (!context) return null;

    this._sampleLoadState.set(url, 'loading');
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const arrayBuf = await response.arrayBuffer();
      const audioBuffer = await context.decodeAudioData(arrayBuf);
      this._sampleBuffers.set(url, audioBuffer);
      this._sampleLoadState.set(url, 'ready');
      return audioBuffer;
    } catch {
      this._sampleLoadState.set(url, 'error');
      return null;
    }
  }

  play(eventOrType, overrides = {}) {
    const event = typeof eventOrType === 'string'
      ? { type: eventOrType, ...overrides }
      : eventOrType;

    if (!event?.type) return false;

    const context = this._ensureContext();
    if (!context || !this.settings.unlocked || this.settings.muted || !this.settings.sfxEnabled) {
      return false;
    }

    const config = getSoundEventConfig(event.type);
    if (!config || config.enabled === false) return false;

    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const lastPlayed = this._lastPlayedAt.get(event.type) || 0;
    if (nowMs - lastPlayed < config.cooldownMs) {
      return false;
    }

    if (this._activeVoices >= MAX_ACTIVE_VOICES) {
      return false;
    }

    const priority = config.priority ?? 3;
    const isVocal = event.type === 'attackVocal' || event.type === 'idleVocal';

    // Per-tick event budget: cap positional SFX per simulation tick
    const tick = Number.isFinite(event.tick) ? event.tick : -1;
    if (config.positional && tick >= 0) {
      if (tick !== this._currentTick) {
        this._currentTick = tick;
        this._tickEventCount = 0;
        this._tickVocalCount = 0;
        this._tickBestPriority = Infinity;
      }
      if (isVocal && this._tickVocalCount >= MAX_VOCAL_PER_TICK) {
        return false;
      }
      if (isVocal && this._tickEventCount >= MAX_SFX_PER_TICK - 1) {
        return false;
      }
      if (this._tickEventCount >= MAX_SFX_PER_TICK && priority >= this._tickBestPriority) {
        return false;
      }
    }

    let gain = config.baseGain * (event.gainMultiplier || 1);
    let pan = 0;
    let mix = null;

    // Species-based pitch/gain variation
    let speciesScale = null;
    if (event.species && SPECIES_AUDIO_SCALE[event.species] !== undefined) {
      speciesScale = SPECIES_AUDIO_SCALE[event.species];
    }

    if (config.positional) {
      mix = computePositionalMix(event, this.viewport, config.audibleRadiusTiles);
      if (!mix.audible) return false;
      gain *= mix.gain;
      pan = mix.pan;

      // Distance-based probability culling
      if (mix.gain < 0.25) {
        // Far: 30% chance for low-priority, 60% for high-priority
        const chance = priority <= 2 ? 0.6 : 0.3;
        if (Math.random() > chance) return false;
      } else if (mix.gain < 0.6) {
        // Mid: 70% chance
        if (Math.random() > 0.7) return false;
      }

      // Near-event gain boost for high-priority events
      if (mix.gain > 0.7 && priority <= 2) {
        gain *= 1.15;
      }
    }

    if (gain <= ZERO_GAIN) return false;

    this._lastPlayedAt.set(event.type, nowMs);

    // Update per-tick budget
    if (config.positional && tick >= 0) {
      this._tickEventCount += 1;
      if (isVocal) this._tickVocalCount += 1;
      if (priority < this._tickBestPriority) {
        this._tickBestPriority = priority;
      }
    }

    const played = this._playPreset(
      config.preset,
      gain,
      pan,
      speciesScale,
      event.species || null,
      event.type,
      Number.isFinite(event.tick) ? event.tick : -1,
    );
    if (played) {
      const soundGroup = event.species ? (SPECIES_SOUND_GROUP[event.species] || null) : null;
      this._emitLog({
        type: event.type,
        category: config.category,
        preset: config.preset,
        priority,
        gain,
        pan,
        species: event.species || null,
        soundGroup,
        x: Number.isFinite(event.x) ? event.x : null,
        y: Number.isFinite(event.y) ? event.y : null,
        distance: mix ? mix.distance : null,
        distanceGain: mix ? mix.gain : null,
        audibleRadius: mix ? mix.audibleRadius : null,
        nearBoosted: config.positional && mix && mix.gain > 0.7 && priority <= 2,
      });
    }
    return played;
  }

  setEcoMood(mood) {
    this._ecoMood = mood || null;
    this._syncAmbienceSampleLayers();
  }

  _ensureAmbienceSampleLayers() {
    if (!this.context || this._ambienceSampleLayers) return;
    const context = this.context;

    const makeLayer = (url) => {
      const buffer = this._sampleBuffers.get(url);
      if (!buffer) return null;
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const gainNode = context.createGain();
      gainNode.gain.value = ZERO_GAIN;
      source.connect(gainNode);
      gainNode.connect(this.ambienceGain);
      source.start();
      return { source, gainNode };
    };

    this._ambienceSampleLayers = {
      birds: makeLayer('/audio/ambience-birds.wav'),
      insects: makeLayer('/audio/ambience-insects.wav'),
      crickets: makeLayer('/audio/ambience-crickets.wav'),
      wind: makeLayer('/audio/ambience-wind.wav'),
    };
    this._syncAmbienceSampleLayers();
  }

  _syncAmbienceSampleLayers() {
    if (!this.context || !this._ambienceSampleLayers) return;
    const now = this.context.currentTime;
    const enabled = this.settings.unlocked && this.settings.ambienceEnabled && !this.settings.muted;

    const isNight = this._ambienceMode === 'night';
    const mood = this._ecoMood;

    // Default mix targets for each nature layer
    let birdsTarget = enabled ? (isNight ? 0.05 : 0.45) : 0;
    let insectsTarget = enabled ? (isNight ? 0.2 : 0.35) : 0;
    let cricketsTarget = enabled ? (isNight ? 0.5 : 0.08) : 0;
    let windTarget = enabled ? 0.25 : 0;

    // Eco mood adjustments: low biodiversity → fewer birds, high → lusher
    if (mood && enabled) {
      birdsTarget *= clamp(mood.biodiversity * 1.5, 0.2, 1.5);
      insectsTarget *= clamp(mood.biodiversity * 1.3, 0.3, 1.4);
      // Declining population → more wind, less life
      if (mood.trend === 'declining') {
        windTarget *= 1.4;
        birdsTarget *= 0.6;
      } else if (mood.trend === 'booming') {
        birdsTarget *= 1.3;
        windTarget *= 0.7;
      }
    }

    const fade = AMBIENCE_FADE_SECONDS * 2; // Slower fade for nature layers
    const layers = this._ambienceSampleLayers;
    if (layers.birds) rampParam(layers.birds.gainNode.gain, birdsTarget, now, fade);
    if (layers.insects) rampParam(layers.insects.gainNode.gain, insectsTarget, now, fade);
    if (layers.crickets) rampParam(layers.crickets.gainNode.gain, cricketsTarget, now, fade);
    if (layers.wind) rampParam(layers.wind.gainNode.gain, windTarget, now, fade);
  }

  destroy() {
    for (const timerId of this._cleanupTimers) {
      clearTimeout(timerId);
    }
    this._cleanupTimers.clear();

    if (this._dayLayer) {
      for (const dispose of this._dayLayer.disposers) dispose();
      safeDisconnect(this._dayLayer.gainNode);
      this._dayLayer = null;
    }

    if (this._nightLayer) {
      for (const dispose of this._nightLayer.disposers) dispose();
      safeDisconnect(this._nightLayer.gainNode);
      this._nightLayer = null;
    }

    if (this._ambienceSampleLayers) {
      for (const layer of Object.values(this._ambienceSampleLayers)) {
        if (!layer) continue;
        try { layer.source.stop(); } catch { /* ignore */ }
        safeDisconnect(layer.source);
        safeDisconnect(layer.gainNode);
      }
      this._ambienceSampleLayers = null;
    }

    safeDisconnect(this.masterGain);
    safeDisconnect(this.sfxGain);
    safeDisconnect(this.ambienceGain);
    safeDisconnect(this.outputCompressor);
    safeDisconnect(this.outputMakeupGain);

    if (this.context && this.context.state !== 'closed') {
      try {
        this.context.close();
      } catch {
        // Ignore close failures during teardown.
      }
    }

    this.context = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.ambienceGain = null;
    this.outputCompressor = null;
    this.outputMakeupGain = null;
    this._noiseBuffer = null;
    this._sampleBuffers.clear();
    this._sampleLoadState.clear();
    this._activeVoices = 0;
    this._logger = null;
    this._ringBuffer = [];
  }

  _emitLog(entry) {
    if (!this._logger && this._ringBuffer.length >= this._ringBufferLimit) return;
    const formatted = {
      ...entry,
      at: Date.now(),
      atPrecise: typeof performance !== 'undefined' ? performance.now() : null,
      gain: Number.isFinite(entry.gain) ? Number(entry.gain.toFixed(3)) : null,
      pan: Number.isFinite(entry.pan) ? Number(entry.pan.toFixed(3)) : null,
      x: Number.isFinite(entry.x) ? Number(entry.x.toFixed(1)) : null,
      y: Number.isFinite(entry.y) ? Number(entry.y.toFixed(1)) : null,
      distance: Number.isFinite(entry.distance) ? Number(entry.distance.toFixed(2)) : null,
      distanceGain: Number.isFinite(entry.distanceGain) ? Number(entry.distanceGain.toFixed(3)) : null,
      audibleRadius: Number.isFinite(entry.audibleRadius) ? Number(entry.audibleRadius.toFixed(2)) : null,
    };
    // Maintain a ring buffer so recent history is available on demand.
    if (this._ringBuffer.length < this._ringBufferLimit) {
      this._ringBuffer.push(formatted);
    } else {
      this._ringBuffer.shift();
      this._ringBuffer.push(formatted);
    }
    if (this._logger) this._logger(formatted);
  }

  _ensureContext() {
    if (this.context) return this.context;
    if (typeof window === 'undefined') return null;

    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return null;

    const context = new AudioContextCtor();
    this.context = context;

    this.masterGain = context.createGain();
    this.sfxGain = context.createGain();
    this.ambienceGain = context.createGain();
    this.outputCompressor = context.createDynamicsCompressor();
    this.outputMakeupGain = context.createGain();

    // Keep transients present while preventing hard clipping at boosted levels.
    this.outputCompressor.threshold.value = -16;
    this.outputCompressor.knee.value = 24;
    this.outputCompressor.ratio.value = 3.2;
    this.outputCompressor.attack.value = 0.004;
    this.outputCompressor.release.value = 0.12;
    this.outputMakeupGain.gain.value = OUTPUT_MAKEUP_GAIN;

    this.sfxGain.connect(this.masterGain);
    this.ambienceGain.connect(this.masterGain);
    this.masterGain.connect(this.outputCompressor);
    this.outputCompressor.connect(this.outputMakeupGain);
    this.outputMakeupGain.connect(context.destination);

    this._syncBuses();
    return context;
  }

  _syncBuses() {
    if (!this.context || !this.masterGain || !this.sfxGain || !this.ambienceGain) return;

    const now = this.context.currentTime;
    const masterLevel = clamp(this.settings.masterVolume, 0, 1);
    const sfxLevel = clamp(this.settings.sfxVolume, 0, 1);
    const ambienceLevel = clamp(this.settings.ambienceVolume, 0, 1);

    const masterTarget = this.settings.muted ? 0 : Math.pow(masterLevel, 0.95) * MASTER_BUS_BOOST;
    const sfxTarget = this.settings.sfxEnabled ? Math.pow(sfxLevel, 0.9) * SFX_BUS_BOOST : 0;
    const ambienceTarget = this.settings.ambienceEnabled ? Math.pow(ambienceLevel, 0.92) * AMBIENCE_BUS_BOOST : 0;

    rampParam(this.masterGain.gain, masterTarget, now);
    rampParam(this.sfxGain.gain, sfxTarget, now);
    rampParam(this.ambienceGain.gain, ambienceTarget, now);
  }

  _ensureAmbienceLayers() {
    if (!this.context || this._dayLayer || this._nightLayer) return;
    this._dayLayer = this._createAmbienceLayer('day');
    this._nightLayer = this._createAmbienceLayer('night');
  }

  _createAmbienceLayer(mode) {
    const layerGain = this.context.createGain();
    layerGain.gain.value = ZERO_GAIN;
    layerGain.connect(this.ambienceGain);

    const disposers = [];
    const addOscillator = (type, frequency, gainValue, detune = 0) => {
      const oscillator = this.context.createOscillator();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      oscillator.detune.value = detune;
      const gainNode = this.context.createGain();
      gainNode.gain.value = gainValue;
      oscillator.connect(gainNode);
      gainNode.connect(layerGain);
      oscillator.start();
      disposers.push(() => {
        try {
          oscillator.stop();
        } catch {
          // Ignore repeated stop during teardown.
        }
        safeDisconnect(oscillator);
        safeDisconnect(gainNode);
      });
    };

    const addNoise = (filterType, frequency, qValue, gainValue) => {
      const source = this.context.createBufferSource();
      source.buffer = this._getNoiseBuffer();
      source.loop = true;
      const filter = this.context.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.value = frequency;
      filter.Q.value = qValue;
      const gainNode = this.context.createGain();
      gainNode.gain.value = gainValue;
      source.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(layerGain);
      source.start();
      disposers.push(() => {
        try {
          source.stop();
        } catch {
          // Ignore repeated stop during teardown.
        }
        safeDisconnect(source);
        safeDisconnect(filter);
        safeDisconnect(gainNode);
      });
    };

    if (mode === 'day') {
      addOscillator('triangle', 392, 0.015, -4);
      addOscillator('sine', 587.33, 0.009, 3);
      addNoise('bandpass', 1500, 0.35, 0.014);
    } else {
      addOscillator('sine', 110, 0.02, 0);
      addOscillator('triangle', 164.81, 0.01, -7);
      addNoise('lowpass', 280, 0.2, 0.012);
    }

    return { gainNode: layerGain, disposers };
  }

  _syncAmbienceMix() {
    if (!this.context || !this._dayLayer || !this._nightLayer) return;

    const now = this.context.currentTime;
    const enabled = this.settings.unlocked && this.settings.ambienceEnabled && !this.settings.muted;
    const dayTarget = enabled ? (this._ambienceMode === 'night' ? 0.08 : 1) : 0;
    const nightTarget = enabled ? (this._ambienceMode === 'night' ? 1 : 0.06) : 0;

    rampParam(this._dayLayer.gainNode.gain, dayTarget, now, AMBIENCE_FADE_SECONDS);
    rampParam(this._nightLayer.gainNode.gain, nightTarget, now, AMBIENCE_FADE_SECONDS);
  }

  _getNoiseBuffer() {
    if (this._noiseBuffer) return this._noiseBuffer;

    const sampleRate = this.context.sampleRate;
    const buffer = this.context.createBuffer(1, sampleRate * 2, sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < channel.length; i++) {
      channel[i] = (Math.random() * 2 - 1) * 0.6;
    }
    this._noiseBuffer = buffer;
    return buffer;
  }

  /**
   * Short filtered-noise transient (scratch, thud, click textures).
   * Returns created AudioNodes so the caller can register them for cleanup.
   */
  _addNoiseBurst(destination, filterType, freq, Q, level, dur, now) {
    const context = this.context;
    const source = context.createBufferSource();
    source.buffer = this._getNoiseBuffer();
    const filter = context.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = freq;
    filter.Q.value = Q;
    const gainNode = context.createGain();
    gainNode.gain.setValueAtTime(ZERO_GAIN, now);
    gainNode.gain.linearRampToValueAtTime(Math.max(ZERO_GAIN, level), now + 0.004);
    gainNode.gain.exponentialRampToValueAtTime(ZERO_GAIN, now + dur);
    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(destination);
    source.start(now);
    source.stop(now + dur + 0.02);
    return { sources: [source], nodes: [filter, gainNode] };
  }

  /**
   * Low-frequency impact with steep pitch drop and two-stage envelope.
   */
  _addImpact(destination, freq, level, dur, now) {
    const context = this.context;
    const osc = context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * 0.15), now + dur);
    const gainNode = context.createGain();
    gainNode.gain.setValueAtTime(ZERO_GAIN, now);
    gainNode.gain.linearRampToValueAtTime(Math.max(ZERO_GAIN, level), now + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(Math.max(ZERO_GAIN, level * 0.3), now + dur * 0.4);
    gainNode.gain.exponentialRampToValueAtTime(ZERO_GAIN, now + dur);
    osc.connect(gainNode);
    gainNode.connect(destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
    return { sources: [osc], nodes: [gainNode] };
  }

  _getSampleBuffer(preset) {
    const config = Object.values(SOUND_EVENTS).find((c) => c.preset === preset);
    if (!config?.samples?.length) return null;
    const urls = config.samples.filter((u) => this._sampleLoadState.get(u) === 'ready');
    if (urls.length === 0) return null;
    const url = urls[Math.floor(Math.random() * urls.length)];
    return this._sampleBuffers.get(url) || null;
  }

  _playSample(buffer, gain, pan, speciesScale = null) {
    const context = this.context;
    const now = context.currentTime;
    // Species scale shifts pitch: tiny creatures → higher pitch, large → lower pitch
    let rate = PLAYBACK_RATE_MIN + Math.random() * (PLAYBACK_RATE_MAX - PLAYBACK_RATE_MIN);
    if (speciesScale !== null) {
      // scale 0 (tiny) → +15% pitch, scale 1 (huge) → -12% pitch
      const speciesShift = 1.15 - 0.27 * speciesScale;
      rate *= speciesShift;
    }
    // Random pitch jitter ±5% for variety
    rate *= (1 - PITCH_JITTER) + Math.random() * (PITCH_JITTER * 2);
    const duration = buffer.duration / rate;

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate;

    const voiceGain = context.createGain();
    voiceGain.gain.setValueAtTime(ZERO_GAIN, now);
    voiceGain.gain.linearRampToValueAtTime(Math.max(ZERO_GAIN, gain), now + 0.004);
    voiceGain.gain.setValueAtTime(Math.max(ZERO_GAIN, gain), now + duration * 0.65);
    voiceGain.gain.exponentialRampToValueAtTime(ZERO_GAIN, now + duration);

    const panner = typeof context.createStereoPanner === 'function'
      ? context.createStereoPanner()
      : null;

    if (panner) {
      panner.pan.value = clamp(pan, -1, 1);
      voiceGain.connect(panner);
      panner.connect(this.sfxGain);
    } else {
      voiceGain.connect(this.sfxGain);
    }

    source.connect(voiceGain);
    source.start(now);
    source.stop(now + duration + 0.02);

    this._activeVoices += 1;
    const nodes = [voiceGain, panner].filter(Boolean);
    const cleanupTimer = setTimeout(() => {
      this._cleanupTimers.delete(cleanupTimer);
      safeDisconnect(source);
      for (const node of nodes) safeDisconnect(node);
      this._activeVoices = Math.max(0, this._activeVoices - 1);
    }, Math.ceil((duration + 0.12) * 1000));
    this._cleanupTimers.add(cleanupTimer);

    return true;
  }

  _playPreset(preset, gain, pan, speciesScale = null, species = null, eventType = null, tick = -1) {
    const groupName = species ? SPECIES_SOUND_GROUP[species] : null;
    const variant = this._pickVariant(eventType || preset, species, tick);

    // Procedural-first: play from pre-generated procedural cache when available.
    const cachedProcedural = this._getCachedProceduralBuffer(preset, groupName, variant);
    if (cachedProcedural) {
      return this._playSample(cachedProcedural, gain, pan, speciesScale);
    }

    // Optional sample fallback path for future assets A/B testing.
    const sampleCfg = getSoundEventConfig(eventType || '');
    const allowSampleFallback = this._pipelineOptions.sampleFallbackEnabled
      && !this._pipelineOptions.proceduralOnly
      && sampleCfg?.sampleFallbackEnabled === true;
    if (allowSampleFallback) {
      const sampleBuf = this._getSampleBuffer(preset);
      if (sampleBuf) {
        return this._playSample(sampleBuf, gain, pan, speciesScale);
      }
    }

    const context = this.context;
    const now = context.currentTime;
    let duration = 0.12;

    // Resolve species group modifiers (default to smallMammal-like neutral)
    const gp = groupName ? SOUND_GROUP_PARAMS[groupName] : null;
    const pm = gp ? gp.pitchMul : 1;       // pitch multiplier
    const gm = gp ? gp.gainMul : 1;        // gain multiplier
    const nb = gp ? gp.noiseBand : null;    // noise filter type override
    const nf = gp ? gp.noiseFreq : 0;       // noise frequency override
    const tt = gp ? gp.toneType : null;     // oscillator type override
    const variantDetune = (variant - 1) * 6;
    const variantPitch = 1 + (variant - 1) * 0.05;

    const effectiveGain = gain * gm;

    const voiceGain = context.createGain();
    voiceGain.gain.value = ZERO_GAIN;

    const panner = typeof context.createStereoPanner === 'function'
      ? context.createStereoPanner()
      : null;

    if (panner) {
      panner.pan.value = clamp(pan, -1, 1);
      voiceGain.connect(panner);
      panner.connect(this.sfxGain);
    } else {
      voiceGain.connect(this.sfxGain);
    }

    const sources = [];
    const nodes = [voiceGain, panner].filter(Boolean);

    const addOscillator = (type, startFrequency, endFrequency, level, dur, detune = 0) => {
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(startFrequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, endFrequency), now + dur);
      oscillator.detune.value = detune;
      gainNode.gain.value = level;
      oscillator.connect(gainNode);
      gainNode.connect(voiceGain);
      sources.push(oscillator);
      nodes.push(gainNode);
    };

    const collectBurst = (burst) => {
      sources.push(...burst.sources);
      nodes.push(...burst.nodes);
    };

    // Helper: apply group pitch multiplier to a frequency
    const pf = (freq) => freq * pm * variantPitch;

    switch (preset) {
      case 'attack':
        // Rich strike with bite transient, resonant body, and short metallic sheen.
        duration = 0.16;
        collectBurst(this._addNoiseBurst(voiceGain, nb || 'bandpass', nf || 2600, 2.3, 0.52, 0.07, now));
        collectBurst(this._addNoiseBurst(voiceGain, 'highpass', 5000, 1.6, 0.2, 0.03, now));
        addOscillator(tt || 'square', pf(720), pf(250), 0.38, 0.08, variantDetune - 4);
        addOscillator('sawtooth', pf(500), pf(210), 0.2, 0.09, variantDetune + 2);
        addOscillator('triangle', pf(230), pf(108), 0.18, 0.11, variantDetune + 6);
        break;
      case 'attackVocal':
        duration = 0.2;
        if (groupName === 'bird') {
          addOscillator('sine', pf(1650), pf(1180), 0.28, 0.08, variantDetune + 3);
          addOscillator('triangle', pf(2200), pf(1500), 0.2, 0.07, variantDetune - 2);
          collectBurst(this._addNoiseBurst(voiceGain, 'bandpass', 3800, 2.1, 0.12, 0.05, now));
        } else {
          collectBurst(this._addNoiseBurst(voiceGain, nb || 'bandpass', nf || 820, 1.1, 0.18, 0.09, now));
          addOscillator(tt || 'sawtooth', pf(210), pf(120), 0.32, 0.14, variantDetune - 5);
          addOscillator('sawtooth', pf(320), pf(180), 0.15, 0.12, variantDetune + 4);
        }
        break;
      case 'death':
        // Heavier collapse with sub drop, noisy debris, and dissonant overtone.
        duration = 0.38;
        collectBurst(this._addImpact(voiceGain, pf(200), 0.8, 0.36, now));
        collectBurst(this._addNoiseBurst(voiceGain, nb || 'lowpass', nf || 540, 0.85, 0.36, 0.2, now));
        collectBurst(this._addNoiseBurst(voiceGain, 'bandpass', 1800, 1.1, 0.16, 0.11, now));
        addOscillator(tt || 'triangle', pf(150), pf(46), 0.24, 0.34, -10 + variantDetune);
        addOscillator('sine', pf(78), pf(40), 0.16, 0.32, variantDetune - 3);
        addOscillator('square', pf(280), pf(110), 0.09, 0.2, variantDetune + 9);
        break;
      case 'eat':
        // Bite with crunchy transient plus short cavity resonance.
        duration = 0.11;
        collectBurst(this._addNoiseBurst(voiceGain, nb || 'highpass', nf || 3400, 2.4, 0.43, 0.04, now));
        collectBurst(this._addNoiseBurst(voiceGain, 'bandpass', 1600, 1.8, 0.14, 0.05, now));
        addOscillator(tt || 'square', pf(560), pf(300), 0.26, 0.07, variantDetune + 6);
        addOscillator('triangle', pf(350), pf(240), 0.16, 0.09, variantDetune + 1);
        addOscillator('sine', pf(300), pf(205), 0.18, 0.11, variantDetune - 2);
        break;
      case 'fruit':
        // Organic sparkle: not species-dependent (plant event)
        duration = 0.22;
        addOscillator('sine', 740 * variantPitch, 1160 * variantPitch, 0.48, 0.2, 4 + variantDetune);
        addOscillator('triangle', 1040 * variantPitch, 1520 * variantPitch, 0.22, 0.2, variantDetune + 8);
        collectBurst(this._addNoiseBurst(voiceGain, 'bandpass', 4800, 3.1, 0.14, 0.07, now));
        break;
      case 'mate':
        // Expressive call with melodic glide and gentle breathy texture.
        duration = 0.23;
        addOscillator(tt || 'sine', pf(360), pf(920), 0.5, 0.23, 4 + variantDetune);
        addOscillator('sine', pf(640), pf(1280), 0.2, 0.16, 11 + variantDetune);
        addOscillator('triangle', pf(220), pf(330), 0.13, 0.19, variantDetune - 8);
        collectBurst(this._addNoiseBurst(voiceGain, 'bandpass', 2600, 1.2, 0.08, 0.09, now));
        break;
      case 'drink':
        // Wet gulp with splash texture and short throat resonance.
        duration = 0.16;
        collectBurst(this._addNoiseBurst(voiceGain, nb || 'lowpass', nf || 640, 0.95, 0.42, 0.1, now));
        collectBurst(this._addNoiseBurst(voiceGain, 'bandpass', 1200, 1.2, 0.16, 0.06, now));
        addOscillator(tt || 'sine', pf(130), pf(70), 0.2, 0.1, variantDetune - 5);
        addOscillator('triangle', pf(280), pf(170), 0.14, 0.12, variantDetune + 2);
        addOscillator('sine', pf(520), pf(280), 0.07, 0.09, variantDetune + 8);
        break;
      case 'idleVocal':
        duration = 0.18;
        if (groupName === 'bird') {
          addOscillator('sine', pf(1900), pf(2300), 0.2, 0.1, variantDetune + 5);
          addOscillator('triangle', pf(1400), pf(1800), 0.14, 0.12, variantDetune - 4);
          collectBurst(this._addNoiseBurst(voiceGain, 'highpass', 5200, 1.4, 0.05, 0.04, now));
        } else {
          collectBurst(this._addNoiseBurst(voiceGain, nb || 'lowpass', nf || 540, 0.8, 0.08, 0.08, now));
          addOscillator(tt || 'triangle', pf(180), pf(140), 0.2, 0.14, variantDetune - 3);
          addOscillator('sine', pf(120), pf(92), 0.12, 0.16, variantDetune + 2);
        }
        break;
      case 'flee':
        duration = 0.09;
        collectBurst(this._addNoiseBurst(voiceGain, nb || 'bandpass', nf || 1800, 1.5, 0.5, 0.05, now));
        addOscillator(tt || 'sawtooth', pf(450), pf(280), 0.22, 0.04, variantDetune);
        break;
      case 'extinctionWarning':
        // Ominous descending tone (ecosystem event, no species variation)
        duration = 0.45;
        addOscillator('sine', 260, 78, 0.68, 0.45);
        addOscillator('triangle', 520, 160, 0.2, 0.34, variantDetune);
        addOscillator('sine', 62, 42, 0.22, 0.39, variantDetune - 3);
        break;
      case 'populationBoom':
        // Ascending chord
        duration = 0.38;
        addOscillator('triangle', 360, 700, 0.46, 0.38, variantDetune);
        addOscillator('sine', 560, 980, 0.26, 0.32, variantDetune + 5);
        addOscillator('sine', 840, 1320, 0.16, 0.26, variantDetune - 4);
        break;
      case 'ecosystemCollapse':
        // Dissonant drone
        duration = 0.62;
        addOscillator('sawtooth', 120, 86, 0.45, 0.62, variantDetune - 3);
        addOscillator('triangle', 96, 62, 0.35, 0.56, variantDetune + 2);
        addOscillator('sine', 170, 110, 0.17, 0.5, variantDetune + 8);
        collectBurst(this._addNoiseBurst(voiceGain, 'lowpass', 210, 0.5, 0.26, 0.44, now));
        break;
      case 'pause':
        duration = 0.22;
        addOscillator('triangle', 780, 320, 0.52, 0.2, variantDetune - 2);
        addOscillator('sine', 450, 220, 0.25, 0.22, variantDetune + 4);
        break;
      case 'resume':
        duration = 0.24;
        addOscillator('triangle', 280, 760, 0.5, 0.22, variantDetune + 3);
        addOscillator('sine', 420, 940, 0.22, 0.18, variantDetune + 8);
        break;
      case 'uiClick':
      default:
        duration = 0.09;
        addOscillator('triangle', 640, 430, 0.68, 0.09, 4 + variantDetune);
        addOscillator('sine', 920, 660, 0.2, 0.09, 10 + variantDetune);
        break;
    }

    setEnvelope(voiceGain.gain, now, effectiveGain, duration);

    for (const source of sources) {
      try { source.start(now); } catch { /* already started by helper */ }
      try { source.stop(now + duration + 0.02); } catch { /* already scheduled */ }
    }

    this._activeVoices += 1;
    const cleanupTimer = setTimeout(() => {
      this._cleanupTimers.delete(cleanupTimer);
      for (const source of sources) safeDisconnect(source);
      for (const node of nodes) safeDisconnect(node);
      this._activeVoices = Math.max(0, this._activeVoices - 1);
    }, Math.ceil((duration + 0.12) * 1000));
    this._cleanupTimers.add(cleanupTimer);

    return true;
  }
}