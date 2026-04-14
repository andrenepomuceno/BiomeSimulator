import { getSoundEventConfig, SOUND_EVENTS, SPECIES_AUDIO_SCALE, AMBIENCE_SAMPLES } from './soundEvents.js';
import { clamp, computePositionalMix, shouldMutePositionalSfx } from './soundMath.js';

const MAX_ACTIVE_VOICES = 24;
const ZERO_GAIN = 0.0001;
const PLAYBACK_RATE_MIN = 0.9;
const PLAYBACK_RATE_MAX = 1.1;
const BUS_RAMP_SECONDS = 0.05;
const AMBIENCE_FADE_SECONDS = 1.2;

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

    this.viewport = null;
    this.settings = {
      muted: false,
      masterVolume: 0.55,
      sfxVolume: 0.72,
      ambienceVolume: 0.32,
      sfxEnabled: true,
      ambienceEnabled: true,
      unlocked: false,
    };

    this._activeVoices = 0;
    this._lastPlayedAt = new Map();
    this._cleanupTimers = new Set();
    this._noiseBuffer = null;
    this._ambienceMode = 'day';
    this._dayLayer = null;
    this._nightLayer = null;
    this._ambienceSampleLayers = null;   // { birds, insects, crickets, wind } loaded AudioBufferSourceNodes
    this._ecoMood = null;                // { biodiversity, population, trend } from computeEcoMood
    this._logger = null;

    /** @type {Map<string, AudioBuffer>} URL → decoded AudioBuffer cache */
    this._sampleBuffers = new Map();
    /** @type {Map<string, 'loading'|'ready'|'error'>} */
    this._sampleLoadState = new Map();
  }

  setLogger(logger) {
    this._logger = typeof logger === 'function' ? logger : null;
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
    const context = this._ensureContext();
    if (!context) return;

    const urls = [];
    for (const cfg of Object.values(SOUND_EVENTS)) {
      if (Array.isArray(cfg.samples)) {
        for (const url of cfg.samples) urls.push(url);
      }
    }
    for (const url of AMBIENCE_SAMPLES) urls.push(url);

    await Promise.allSettled(urls.map((url) => this._loadSample(url)));
    this._ensureAmbienceSampleLayers();
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
    if (!config) return false;

    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const lastPlayed = this._lastPlayedAt.get(event.type) || 0;
    if (nowMs - lastPlayed < config.cooldownMs) {
      return false;
    }

    if (this._activeVoices >= MAX_ACTIVE_VOICES) {
      return false;
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
      if (shouldMutePositionalSfx(this.viewport)) {
        return false;
      }
      mix = computePositionalMix(event, this.viewport, config.audibleRadiusTiles);
      if (!mix.audible) return false;
      gain *= mix.gain;
      pan = mix.pan;
    }

    if (gain <= ZERO_GAIN) return false;

    this._lastPlayedAt.set(event.type, nowMs);
    const played = this._playPreset(config.preset, gain, pan, speciesScale);
    if (played) {
      this._emitLog({
        type: event.type,
        category: config.category,
        preset: config.preset,
        gain,
        pan,
        x: Number.isFinite(event.x) ? event.x : null,
        y: Number.isFinite(event.y) ? event.y : null,
        distance: mix ? mix.distance : null,
        audibleRadius: mix ? mix.audibleRadius : null,
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
    this._noiseBuffer = null;
    this._sampleBuffers.clear();
    this._sampleLoadState.clear();
    this._activeVoices = 0;
    this._logger = null;
  }

  _emitLog(entry) {
    if (!this._logger) return;
    this._logger({
      ...entry,
      at: Date.now(),
      gain: Number.isFinite(entry.gain) ? Number(entry.gain.toFixed(3)) : null,
      pan: Number.isFinite(entry.pan) ? Number(entry.pan.toFixed(3)) : null,
      x: Number.isFinite(entry.x) ? Number(entry.x.toFixed(1)) : null,
      y: Number.isFinite(entry.y) ? Number(entry.y.toFixed(1)) : null,
      distance: Number.isFinite(entry.distance) ? Number(entry.distance.toFixed(2)) : null,
      audibleRadius: Number.isFinite(entry.audibleRadius) ? Number(entry.audibleRadius.toFixed(2)) : null,
    });
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

    this.sfxGain.connect(this.masterGain);
    this.ambienceGain.connect(this.masterGain);
    this.masterGain.connect(context.destination);

    this._syncBuses();
    return context;
  }

  _syncBuses() {
    if (!this.context || !this.masterGain || !this.sfxGain || !this.ambienceGain) return;

    const now = this.context.currentTime;
    const masterTarget = this.settings.muted ? 0 : clamp(this.settings.masterVolume, 0, 1);
    const sfxTarget = this.settings.sfxEnabled ? clamp(this.settings.sfxVolume, 0, 1) : 0;
    const ambienceTarget = this.settings.ambienceEnabled ? clamp(this.settings.ambienceVolume, 0, 1) : 0;

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

  _playPreset(preset, gain, pan, speciesScale = null) {
    // Try sample-based playback first; fall back to procedural synthesis
    const sampleBuf = this._getSampleBuffer(preset);
    if (sampleBuf) {
      return this._playSample(sampleBuf, gain, pan, speciesScale);
    }

    const context = this.context;
    const now = context.currentTime;
    let duration = 0.12;

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

    switch (preset) {
      case 'attack':
        // Scratch/cut: filtered noise burst + short square transient
        duration = 0.11;
        collectBurst(this._addNoiseBurst(voiceGain, 'bandpass', 2200, 1.8, 0.6, 0.07, now));
        addOscillator('square', 520, 180, 0.35, 0.05);
        break;
      case 'death':
        // Fall/thud: steep pitch-drop impact + muffled noise + sub layer
        duration = 0.30;
        collectBurst(this._addImpact(voiceGain, 180, 0.7, 0.30, now));
        collectBurst(this._addNoiseBurst(voiceGain, 'lowpass', 400, 0.6, 0.35, 0.12, now));
        addOscillator('triangle', 120, 40, 0.2, 0.30, -10);
        break;
      case 'eat':
        // Bite/peck: sharp dry noise snap + minimal tonal body
        duration = 0.07;
        collectBurst(this._addNoiseBurst(voiceGain, 'highpass', 3000, 2.0, 0.5, 0.04, now));
        addOscillator('sine', 380, 250, 0.4, 0.07);
        break;
      case 'fruit':
        // Organic sparkle: ascending tones + short bright noise
        duration = 0.18;
        addOscillator('sine', 680, 1100, 0.5, 0.18, 3);
        addOscillator('triangle', 1020, 1400, 0.2, 0.18);
        collectBurst(this._addNoiseBurst(voiceGain, 'bandpass', 4500, 3.0, 0.15, 0.06, now));
        break;
      case 'mate':
        // Soft chirp
        duration = 0.15;
        addOscillator('sine', 400, 800, 0.6, 0.15, 3);
        addOscillator('sine', 800, 1200, 0.2, 0.12);
        break;
      case 'drink':
        // Splash
        duration = 0.10;
        collectBurst(this._addNoiseBurst(voiceGain, 'lowpass', 500, 0.8, 0.5, 0.08, now));
        addOscillator('sine', 80, 60, 0.25, 0.06);
        break;
      case 'flee':
        // Urgent rustle
        duration = 0.09;
        collectBurst(this._addNoiseBurst(voiceGain, 'bandpass', 1800, 1.5, 0.55, 0.06, now));
        addOscillator('sawtooth', 500, 300, 0.3, 0.04);
        break;
      case 'extinctionWarning':
        // Ominous descending tone
        duration = 0.40;
        addOscillator('sine', 250, 80, 0.7, 0.40);
        addOscillator('sine', 60, 45, 0.3, 0.35);
        break;
      case 'populationBoom':
        // Ascending chord
        duration = 0.35;
        addOscillator('sine', 400, 600, 0.5, 0.35);
        addOscillator('sine', 600, 900, 0.3, 0.30);
        addOscillator('sine', 800, 1200, 0.15, 0.25);
        break;
      case 'ecosystemCollapse':
        // Dissonant drone
        duration = 0.60;
        addOscillator('sine', 90, 85, 0.6, 0.60);
        addOscillator('sine', 95, 90, 0.5, 0.55);
        addOscillator('sine', 135, 125, 0.35, 0.50);
        collectBurst(this._addNoiseBurst(voiceGain, 'lowpass', 150, 0.4, 0.25, 0.40, now));
        break;
      case 'uiClick':
      default:
        duration = 0.08;
        addOscillator('triangle', 620, 410, 0.8, 0.08);
        addOscillator('sine', 860, 620, 0.2, 0.08, 7);
        break;
    }

    setEnvelope(voiceGain.gain, now, gain, duration);

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