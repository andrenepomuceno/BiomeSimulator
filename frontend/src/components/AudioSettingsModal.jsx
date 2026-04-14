import React from 'react';
import useSimStore from '../store/simulationStore';
import { shouldMutePositionalSfx } from '../audio/soundMath.js';

export default function AudioSettingsModal({ open, onClose, onUnlock }) {
  const { audioSettings, setAudioSettings, audioLog, clearAudioLog, viewport } = useSimStore();

  if (!open) return null;

  const worldSfxMutedByZoom = shouldMutePositionalSfx(viewport);

  const formatEntryLabel = (entry) => {
    if (entry.type === 'uiClick') return 'UI click';
    if (entry.type === 'ambience') return `Ambience ${entry.mode}`;
    return entry.type.charAt(0).toUpperCase() + entry.type.slice(1);
  };

  const formatEntryMeta = (entry) => {
    if (entry.type === 'ambience') {
      return `tick ${entry.tick} · gain ${entry.gain ?? 0}`;
    }

    const parts = [`tick ${entry.tick}`];
    if (entry.gain != null) parts.push(`gain ${entry.gain}`);
    if (entry.pan != null) parts.push(`pan ${entry.pan}`);
    if (entry.distance != null) parts.push(`dist ${entry.distance}`);
    if (entry.x != null && entry.y != null) parts.push(`(${entry.x}, ${entry.y})`);
    return parts.join(' · ');
  };

  const setSlider = (key) => (e) => {
    setAudioSettings({ [key]: Number(e.target.value) / 100 });
  };

  const toggle = (key) => () => {
    setAudioSettings({ [key]: !audioSettings[key] });
  };

  const handleExportLog = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      audioSettings: {
        muted: audioSettings.muted,
        masterVolume: audioSettings.masterVolume,
        sfxVolume: audioSettings.sfxVolume,
        ambienceVolume: audioSettings.ambienceVolume,
        sfxEnabled: audioSettings.sfxEnabled,
        ambienceEnabled: audioSettings.ambienceEnabled,
      },
      viewport,
      entries: audioLog,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `ecogame-audio-log-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="audio-overlay" onClick={onClose}>
      <div className="audio-modal" onClick={e => e.stopPropagation()}>
        <div className="audio-header">
          <div>
            <div className="audio-eyebrow">Camera Audio</div>
            <h5>World sound follows the camera</h5>
          </div>
          <button className="btn btn-sm btn-outline-secondary py-0 px-1" onClick={onClose} aria-label="Close audio settings">✕</button>
        </div>

        <div className="audio-body">
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
            <input type="range" min={0} max={100} step={1}
              value={Math.round(audioSettings.masterVolume * 100)}
              onChange={setSlider('masterVolume')} />
          </div>

          <div className="audio-field">
            <label>
              <span>SFX Volume</span>
              <span>{Math.round(audioSettings.sfxVolume * 100)}%</span>
            </label>
            <input type="range" min={0} max={100} step={1}
              value={Math.round(audioSettings.sfxVolume * 100)}
              onChange={setSlider('sfxVolume')}
              disabled={!audioSettings.sfxEnabled} />
          </div>

          <div className="audio-field">
            <label>
              <span>Ambience Volume</span>
              <span>{Math.round(audioSettings.ambienceVolume * 100)}%</span>
            </label>
            <input type="range" min={0} max={100} step={1}
              value={Math.round(audioSettings.ambienceVolume * 100)}
              onChange={setSlider('ambienceVolume')}
              disabled={!audioSettings.ambienceEnabled} />
          </div>

          <p className="audio-help">
            Camera-relative SFX are limited to a nearby horizon, so dense areas stay readable without turning every off-screen event into noise.
          </p>

          <div className="audio-log-panel">
            <div className="audio-log-header">
              <div>
                <strong>Recent sound log</strong>
                <span>Latest emitted sounds, newest first.</span>
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
                      <span className="audio-log-type">{formatEntryLabel(entry)}</span>
                      <span className="audio-log-time">{new Date(entry.at).toLocaleTimeString()}</span>
                    </div>
                    <div className="audio-log-meta">{formatEntryMeta(entry)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}