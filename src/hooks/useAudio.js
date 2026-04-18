import { useCallback, useEffect, useRef } from 'react';
import { SoundManager } from '../audio/soundManager.js';
import { computeEcoMood, detectMacroEvents } from '../audio/soundMath.js';
import useSimStore from '../store/simulationStore.js';
import { FF_AUDIO_LOG_UI } from '../config/featureFlags.js';

const ECO_MOOD_INTERVAL_MS = 2000;

export function useAudio() {
  const managerRef = useRef(null);
  const prevStatsRef = useRef(null);
  const lastMoodCheckRef = useRef(0);

  const ensureManager = () => {
    if (!managerRef.current) {
      managerRef.current = new SoundManager();
    }
    return managerRef.current;
  };

  useEffect(() => {
    const manager = ensureManager();
    let previousAudioSettings = useSimStore.getState().audioSettings;
    manager.applySettings(previousAudioSettings);

    const unsubscribe = useSimStore.subscribe((state) => {
      if (state.audioSettings !== previousAudioSettings) {
        previousAudioSettings = state.audioSettings;
        manager.applySettings(previousAudioSettings);
      }
    });

    // Throttled stats subscription for eco mood + macro events
    let prevStats = prevStatsRef.current;
    const unsubscribeStats = useSimStore.subscribe((state) => {
      const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (nowMs - lastMoodCheckRef.current < ECO_MOOD_INTERVAL_MS) return;
      lastMoodCheckRef.current = nowMs;

      const stats = state.stats;
      if (!stats) return;

      const mood = computeEcoMood(stats, prevStats);
      manager.setEcoMood(mood);

      const macroEvents = detectMacroEvents(prevStats, stats);
      for (const eventType of macroEvents) {
        manager.play(eventType);
      }

      prevStats = { ...stats };
      prevStatsRef.current = prevStats;
    });

    return () => {
      unsubscribe();
      unsubscribeStats();
      manager.setLogger(null);
      manager.destroy();
      if (managerRef.current === manager) {
        managerRef.current = null;
      }
    };
  }, []);

  const prepareAudioAssets = useCallback(async (onStep) => {
    const manager = ensureManager();
    const report = typeof onStep === 'function' ? onStep : () => {};
    const store = useSimStore.getState();

    if (!store.audioSettings.unlocked) {
      report('Preparando cache de áudio procedural', 'Áudio bloqueado pelo navegador; etapa será concluída após unlock.');
      return false;
    }

    report('Preparando cache de áudio procedural', 'Gerando variações procedurais de efeitos sonoros.');
    await manager.preGenerateProceduralCache();

    report('Carregando/preparando samples de áudio', 'Pré-carregando fallback de samples e camadas de ambiente.');
    await manager.preloadSamples();

    return true;
  }, []);

  const unlockAudio = useCallback(async () => {
    const manager = ensureManager();

    const unlocked = await manager.unlock();
    const store = useSimStore.getState();
    if (store.audioSettings.unlocked !== unlocked) {
      store.setAudioSettings({ unlocked });
    }
    if (unlocked) {
      await prepareAudioAssets();
    }
    return unlocked;
  }, [prepareAudioAssets]);

  const updateListenerViewport = useCallback((viewport) => {
    ensureManager().setViewport(viewport);
  }, []);

  const playUiClick = useCallback(() => {
    ensureManager().play('uiClick');
  }, []);

  const playWorldEffect = useCallback((event) => {
    ensureManager().play(event);
  }, []);

  const syncAmbience = useCallback((clock) => {
    ensureManager().syncClock(clock);
  }, []);

  const setAudioLogging = useCallback((enabled) => {
    if (!FF_AUDIO_LOG_UI) {
      ensureManager().setLogger(null);
      return;
    }
    const manager = ensureManager();
    if (enabled) {
      manager.setLogger(
        (entry) => {
          const store = useSimStore.getState();
          store.pushAudioLog({ ...entry, tick: store.clock.tick });
        },
        {
          flush: true,
          onFlush: (entries) => {
            if (!entries.length) return;
            const store = useSimStore.getState();
            const tick = store.clock.tick;
            store.pushAudioLogBatch(entries.map((e) => ({ ...e, tick })));
          },
        },
      );
    } else {
      manager.setLogger(null);
    }
  }, []);

  return {
    unlockAudio,
    prepareAudioAssets,
    updateListenerViewport,
    playUiClick,
    playWorldEffect,
    syncAmbience,
    setAudioLogging,
  };
}