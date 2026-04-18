import React, { useEffect, useMemo, useRef, useState } from 'react';
import useSimStore from '../store/simulationStore';
import { buildSimulationConfigSections } from './simulationConfigViewModel.js';
import { shouldMutePositionalSfx } from '../audio/soundMath.js';
import {
  buildAudioLogExportText,
  formatAudioLogEntryLabel,
  formatAudioLogEntryMeta,
  formatAudioLogEntryDetail,
  formatAudioLogEventTime,
} from '../utils/audioLogExport.js';
import { useModalA11y } from '../hooks/useModalA11y.js';
import { FF_AUDIO_LOG_UI } from '../config/featureFlags.js';

const PANEL_TABS = {
  CONFIG: 'config',
  AUDIO: 'audio',
  LOG: 'log',
};

function SourceBadge({ source }) {
  return (
    <span className={`sim-config-source ${source === 'live' ? 'live' : 'world'}`}>
      {source === 'live' ? 'Live' : 'World'}
    </span>
  );
}

export default function SimulationConfigModal({ open, onClose, onUnlock, onToggleBackground, onToggleModalAutoPause, onAudioLogging }) {
  const {
    gameConfig,
    clock,
    tps,
    climate,
    hungerMultiplier,
    thirstMultiplier,
    pauseOnBackground,
    autoPauseOnModalOpen,
    audioSettings,
    setAudioSettings,
    audioLog,
    clearAudioLog,
    viewport,
  } = useSimStore();
  const modalRef = useRef(null);
  const [activePanel, setActivePanel] = useState(PANEL_TABS.CONFIG);

  useModalA11y({ open, onClose, containerRef: modalRef });

  useEffect(() => {
    if (!open) return;
    setActivePanel(PANEL_TABS.CONFIG);
  }, [open]);

  useEffect(() => {
    if (!FF_AUDIO_LOG_UI && activePanel === PANEL_TABS.LOG) {
      setActivePanel(PANEL_TABS.CONFIG);
    }
  }, [activePanel]);

  // Enable audio logging only while the log tab is visible to avoid
  // unnecessary Zustand updates and re-renders during normal gameplay.
  useEffect(() => {
    if (!onAudioLogging) return;
    const logVisible = FF_AUDIO_LOG_UI && open && activePanel === PANEL_TABS.LOG;
    onAudioLogging(logVisible);
    return () => onAudioLogging(false);
  }, [open, activePanel, onAudioLogging]);

  const sections = useMemo(() => buildSimulationConfigSections({
    gameConfig,
    clock,
    climate,
    tps,
    hungerMultiplier,
    thirstMultiplier,
  }), [gameConfig, clock, climate, tps, hungerMultiplier, thirstMultiplier]);

  const worldSfxMutedByZoom = shouldMutePositionalSfx(viewport);

  const setSlider = (key) => (e) => {
    setAudioSettings({ [key]: Number(e.target.value) / 100 });
  };

  const toggle = (key) => () => {
    setAudioSettings({ [key]: !audioSettings[key] });
  };

  const handleExportLog = () => {
    const exportedAt = new Date();
    const text = buildAudioLogExportText({
      exportedAt,
      audioSettings,
      viewport,
      entries: audioLog,
    });
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `biome-simulator-audio-log-${exportedAt.toISOString().replace(/[:.]/g, '-')}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  return (
    <div className="sim-config-overlay" onClick={onClose}>
      <div className="sim-config-modal" ref={modalRef} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="sim-config-modal-title" tabIndex={-1}>
        <div className="sim-config-header">
          <div>
            <div className="sim-config-eyebrow">Simulation Settings</div>
            <h5 id="sim-config-modal-title">Config and Audio</h5>
          </div>
          <button className="btn btn-sm btn-outline-secondary py-0 px-1" onClick={onClose} aria-label="Close simulation configuration">✕</button>
        </div>

        <div
          className="sim-config-tabs"
          role="tablist"
          aria-label="Configuration sections"
          style={{ gridTemplateColumns: `repeat(${FF_AUDIO_LOG_UI ? 3 : 2}, minmax(0, 1fr))` }}
        >
          <button
            className={`sim-config-tab ${activePanel === PANEL_TABS.CONFIG ? 'active' : ''}`}
            onClick={() => setActivePanel(PANEL_TABS.CONFIG)}
            role="tab"
            aria-selected={activePanel === PANEL_TABS.CONFIG}
          >
            Config
          </button>
          <button
            className={`sim-config-tab ${activePanel === PANEL_TABS.AUDIO ? 'active' : ''}`}
            onClick={() => {
              setActivePanel(PANEL_TABS.AUDIO);
              if (!audioSettings.unlocked) {
                void onUnlock?.();
              }
            }}
            role="tab"
            aria-selected={activePanel === PANEL_TABS.AUDIO}
          >
            Audio
          </button>
          {FF_AUDIO_LOG_UI ? (
            <button
              className={`sim-config-tab ${activePanel === PANEL_TABS.LOG ? 'active' : ''}`}
              onClick={() => setActivePanel(PANEL_TABS.LOG)}
              role="tab"
              aria-selected={activePanel === PANEL_TABS.LOG}
            >
              Sound Log
            </button>
          ) : null}
        </div>

        <div className="sim-config-body">
          {activePanel === PANEL_TABS.CONFIG ? (
            <>
              <section className="sim-config-hero">
                <p className="sim-config-intro">
                  Settings in use by the current world. Live values refresh each tick. To make changes, use the main menu or the Stats &rarr; Settings tab.
                </p>
                <div className="sim-config-chip-list">
                  <span className="sim-config-chip live">Live &mdash; refreshes each tick</span>
                  <span className="sim-config-chip">World &mdash; fixed at world start</span>
                  <span className="sim-config-chip">Read-only &mdash; open menu to edit</span>
                </div>
              </section>

              <section className="sim-config-section sim-config-behavior-section">
                <div className="sim-config-section-header">
                  <h6>Runtime behavior</h6>
                  <p>Choose how simulation time behaves when the tab is hidden or major panels are open.</p>
                </div>
                <div className="sim-config-background-row">
                  <div className="sim-config-row-copy">
                    <div className="sim-config-row-label">Background execution</div>
                    <div className="sim-config-row-hint">
                      {pauseOnBackground
                        ? 'Simulation pauses automatically while the tab is hidden.'
                        : 'Simulation keeps running while the tab is hidden.'}
                    </div>
                  </div>
                  <button
                    className={`audio-pill ${!pauseOnBackground ? 'active' : ''}`}
                    onClick={onToggleBackground}
                    title={pauseOnBackground ? 'Enable background execution' : 'Pause on hidden tab'}
                  >
                    {!pauseOnBackground ? 'Running in background' : 'Pause on background'}
                  </button>
                </div>
                <div className="sim-config-background-row">
                  <div className="sim-config-row-copy">
                    <div className="sim-config-row-label">Auto-pause on panels</div>
                    <div className="sim-config-row-hint">
                      {autoPauseOnModalOpen
                        ? 'Pauses automatically when Guide, Config, Report, or Entities is open.'
                        : 'Panels stay open without changing simulation playback.'}
                    </div>
                  </div>
                  <button
                    className={`audio-pill ${autoPauseOnModalOpen ? 'active' : ''}`}
                    onClick={onToggleModalAutoPause}
                    title={autoPauseOnModalOpen ? 'Disable panel auto-pause' : 'Enable panel auto-pause'}
                  >
                    {autoPauseOnModalOpen ? 'Auto-pause enabled' : 'Auto-pause disabled'}
                  </button>
                </div>
              </section>

              <div className="sim-config-grid">
                {sections.map(section => (
                  <section key={section.id} className="sim-config-section">
                    <div className="sim-config-section-header">
                      <h6>{section.title}</h6>
                      <p>{section.description}</p>
                    </div>

                    <div className="sim-config-rows">
                      {section.rows.map(row => (
                        <div key={row.id} className="sim-config-row">
                          <div className="sim-config-row-copy">
                            <div className="sim-config-row-label">{row.label}</div>
                            <div className="sim-config-row-hint">{row.hint}</div>
                          </div>
                          <div className="sim-config-row-meta">
                            <div className="sim-config-row-value">{row.value}</div>
                            <SourceBadge source={row.source} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>

              <p className="sim-config-footer">
                Edit hunger and thirst multipliers in Stats &rarr; Settings. Map and population settings are in ☰ Menu &rarr; New Game.
              </p>
            </>
          ) : activePanel === PANEL_TABS.AUDIO ? (
            <div className="sim-config-audio-shell">
              <div className="audio-body">
                <div className="audio-tab-panel">
                  <div className={`audio-status ${audioSettings.unlocked ? 'ready' : 'locked'}`}>
                    <strong>{audioSettings.unlocked ? 'Audio active' : 'Audio waiting for interaction'}</strong>
                    <p>
                      {audioSettings.unlocked
                        ? 'Events closer to the camera sound louder, and left/right activity pans in stereo.'
                        : 'Browsers require a click or key press before audio can start. Opening this panel already counts in most cases.'}
                    </p>
                    {worldSfxMutedByZoom ? (
                      <p className="audio-warning">Camera very far away: positional world SFX are temporarily muted until you zoom back in.</p>
                    ) : null}
                    {!audioSettings.unlocked ? (
                      <button className="btn btn-sim btn-sm" onClick={onUnlock}>Enable Audio</button>
                    ) : null}
                  </div>

                  <div className="audio-toggle-row">
                    <button className={`audio-pill ${audioSettings.muted ? 'active' : ''}`} onClick={toggle('muted')}>
                      {audioSettings.muted ? 'Unmute' : 'Mute All'}
                    </button>
                    <button className={`audio-pill ${audioSettings.sfxEnabled ? 'active' : ''}`} onClick={toggle('sfxEnabled')}>
                      SFX {audioSettings.sfxEnabled ? 'On' : 'Off'}
                    </button>
                    <button className={`audio-pill ${audioSettings.ambienceEnabled ? 'active' : ''}`} onClick={toggle('ambienceEnabled')}>
                      Ambience {audioSettings.ambienceEnabled ? 'On' : 'Off'}
                    </button>
                  </div>

                  <div className="audio-field">
                    <label>
                      <span>Master Volume</span>
                      <span>{Math.round(audioSettings.masterVolume * 100)}%</span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={Math.round(audioSettings.masterVolume * 100)}
                      onChange={setSlider('masterVolume')}
                    />
                  </div>

                  <div className="audio-field">
                    <label>
                      <span>SFX Volume</span>
                      <span>{Math.round(audioSettings.sfxVolume * 100)}%</span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={Math.round(audioSettings.sfxVolume * 100)}
                      onChange={setSlider('sfxVolume')}
                      disabled={!audioSettings.sfxEnabled}
                    />
                  </div>

                  <div className="audio-field">
                    <label>
                      <span>Ambience Volume</span>
                      <span>{Math.round(audioSettings.ambienceVolume * 100)}%</span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={Math.round(audioSettings.ambienceVolume * 100)}
                      onChange={setSlider('ambienceVolume')}
                      disabled={!audioSettings.ambienceEnabled}
                    />
                  </div>

                  <p className="audio-help">
                    Camera-relative SFX are limited to a nearby horizon, so dense areas stay readable without turning every off-screen event into noise.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="audio-body">
              <div className="audio-tab-panel audio-tab-panel-log">
                <div className="audio-log-panel">
                  <div className="audio-log-header">
                    <div>
                      <strong>Recent sound log</strong>
                      <span>Simple timeline of emitted sounds.</span>
                    </div>
                    <div className="audio-log-actions">
                      <button className="btn btn-sm btn-outline-secondary" onClick={handleExportLog} disabled={audioLog.length === 0}>
                        Export
                      </button>
                      <button className="btn btn-sm btn-outline-secondary" onClick={clearAudioLog} disabled={audioLog.length === 0}>
                        Clear
                      </button>
                    </div>
                  </div>

                  {audioLog.length === 0 ? (
                    <div className="audio-log-empty">No sounds emitted yet.</div>
                  ) : (
                    <div className="audio-log-list">
                      {audioLog.map((entry) => (
                        <div key={`${entry.at}-${entry.type}-${entry.tick}`} className="audio-log-item">
                          <div className="audio-log-top">
                            <span className="audio-log-type">{formatAudioLogEntryLabel(entry)}</span>
                            <span className="audio-log-time">{formatAudioLogEventTime(entry.at)}</span>
                          </div>
                          <div className="audio-log-meta">{formatAudioLogEntryMeta(entry, ' · ')}</div>
                          <div className="audio-log-detail">{formatAudioLogEntryDetail(entry, ' · ')}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}