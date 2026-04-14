import { getSoundEventConfig } from './soundEvents.js';
import { clamp, computePositionalMix } from './soundMath.js';

const MAX_ACTIVE_VOICES = 24;
const ZERO_GAIN = 0.0001;
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
    this._logger = null;
  }

  setLogger(logger) {
    this._logger = typeof logger === 'function' ? logger : null;
  }

  applySettings(patch) {
    this.settings = { ...this.settings, ...patch };
    if (this.context) {
      this._syncBuses();
      this._syncAmbienceMix();
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

    if (config.positional) {
      mix = computePositionalMix(event, this.viewport, config.audibleRadiusTiles);
      if (!mix.audible) return false;
      gain *= mix.gain;
      pan = mix.pan;
    }

    if (gain <= ZERO_GAIN) return false;

    this._lastPlayedAt.set(event.type, nowMs);
    const played = this._playPreset(config.preset, gain, pan);
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

  _playPreset(preset, gain, pan) {
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

    const addOscillator = (type, startFrequency, endFrequency, level, detune = 0) => {
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(startFrequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, endFrequency), now + duration);
      oscillator.detune.value = detune;
      gainNode.gain.value = level;
      oscillator.connect(gainNode);
      gainNode.connect(voiceGain);
      sources.push(oscillator);
      nodes.push(gainNode);
    };

    switch (preset) {
      case 'attack':
        duration = 0.12;
        addOscillator('square', 760, 170, 0.7, -8);
        addOscillator('triangle', 980, 240, 0.35, 5);
        break;
      case 'death':
        duration = 0.26;
        addOscillator('sine', 260, 70, 0.85, -5);
        addOscillator('triangle', 180, 55, 0.45, 8);
        break;
      case 'eat':
        duration = 0.1;
        addOscillator('sine', 420, 210, 0.8, 0);
        addOscillator('triangle', 300, 150, 0.3, -12);
        break;
      case 'fruit':
        duration = 0.16;
        addOscillator('sine', 720, 1240, 0.65, 0);
        addOscillator('triangle', 1080, 1520, 0.3, 5);
        break;
      case 'uiClick':
      default:
        duration = 0.08;
        addOscillator('triangle', 620, 410, 0.8, 0);
        addOscillator('sine', 860, 620, 0.2, 7);
        break;
    }

    setEnvelope(voiceGain.gain, now, gain, duration);

    for (const source of sources) {
      source.start(now);
      source.stop(now + duration + 0.02);
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