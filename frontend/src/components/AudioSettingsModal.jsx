import React from 'react';
import useSimStore from '../store/simulationStore';

export default function AudioSettingsModal({ open, onClose, onUnlock }) {
  const { audioSettings, setAudioSettings } = useSimStore();

  if (!open) return null;

  const setSlider = (key) => (e) => {
    setAudioSettings({ [key]: Number(e.target.value) / 100 });
  };

  const toggle = (key) => () => {
    setAudioSettings({ [key]: !audioSettings[key] });
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
        </div>
      </div>
    </div>
  );
}