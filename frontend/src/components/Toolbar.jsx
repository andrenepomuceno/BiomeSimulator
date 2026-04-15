/**
 * Toolbar — Play/Pause/Step/Reset, speed slider, day/night indicator, tool selector.
 */
import React from 'react';
import useSimStore from '../store/simulationStore';
import { formatTimeOfDay } from '../utils/time';

const TOOLS = [
  { id: 'SELECT', label: 'Select', icon: 'bi-cursor-fill' },
  { id: 'PAINT_TERRAIN', label: 'Paint', icon: 'bi-brush-fill' },
  { id: 'PLACE_ENTITY', label: 'Place', icon: 'bi-plus-circle-fill' },
  { id: 'ERASE', label: 'Erase', icon: 'bi-eraser-fill' },
];

const SELECT_FILTERS = [
  { key: 'animals', label: 'Animals', icon: 'bi-bug-fill' },
  { key: 'plants', label: 'Plants', icon: 'bi-flower1' },
  { key: 'terrain', label: 'Terrain', icon: 'bi-grid-3x3-gap-fill' },
];

export default function Toolbar({ appVersion, onStart, onPause, onResume, onStep, onReset, onSpeedChange, onMenuToggle, onGuideToggle, onConfigToggle, onAudioToggle, onReportToggle, onEntitiesToggle, onToggleBackground }) {
  const { paused, running, tps, clock, tool, setTool, audioSettings, pauseOnBackground, selectionTargets, setSelectionTarget } = useSimStore();
  const audioIcon = audioSettings.muted
    ? 'bi-volume-mute-fill'
    : audioSettings.unlocked
      ? 'bi-volume-up-fill'
      : 'bi-volume-down-fill';

  return (
    <div className="toolbar">
      <div className="toolbar-group toolbar-group-primary">
        <button className="btn btn-sim btn-sm" onClick={onMenuToggle} title="Menu (Esc)">
          <i className="bi bi-list toolbar-icon" aria-hidden="true" />
          <span>Menu</span>
        </button>

        {!running || paused ? (
          <button className="btn btn-sim btn-sm" onClick={running ? onResume : onStart}>
            <i className={`bi ${running ? 'bi-play-fill' : 'bi-play-circle-fill'} toolbar-icon`} aria-hidden="true" />
            <span>{running ? 'Resume' : 'Start'}</span>
          </button>
        ) : (
          <button className="btn btn-sim btn-sm active" onClick={onPause}>
            <i className="bi bi-pause-fill toolbar-icon" aria-hidden="true" />
            <span>Pause</span>
          </button>
        )}
        <button className="btn btn-sim btn-sm" onClick={onStep} disabled={!paused && running}>
          <i className="bi bi-skip-forward-fill toolbar-icon" aria-hidden="true" />
          <span>Step</span>
        </button>
        <button className="btn btn-sim btn-sm" onClick={onReset}>
          <i className="bi bi-arrow-counterclockwise toolbar-icon" aria-hidden="true" />
          <span>Reset</span>
        </button>
      </div>

      <div className="toolbar-divider" aria-hidden="true" />

      <div className="toolbar-group toolbar-group-clock">
        <div className={`day-indicator ${clock.is_night ? 'night' : 'day'}`}>
          <i className={`bi ${clock.is_night ? 'bi-moon-stars-fill' : 'bi-sun-fill'} toolbar-icon`} aria-hidden="true" />
          <span>{formatTimeOfDay(clock.tick_in_day, clock.ticks_per_day)} · Day {clock.day} · Tick {clock.tick}</span>
        </div>
      </div>

      <div className="toolbar-divider" aria-hidden="true" />

      <div className="toolbar-group toolbar-group-tools">
        {TOOLS.map(t => (
          <button
            key={t.id}
            className={`tool-btn ${tool === t.id ? 'active' : ''}`}
            onClick={() => setTool(t.id)}
            title={t.label}
          >
            <i className={`bi ${t.icon} toolbar-icon`} aria-hidden="true" />
            <span>{t.label}</span>
          </button>
        ))}

        {tool === 'SELECT' && (
          <div className="select-filters" aria-label="Selectable targets">
            <span className="select-filters-title">Targets</span>
            {SELECT_FILTERS.map(f => (
              <label key={f.key} className="select-filter-label">
                <input
                  type="checkbox"
                  checked={selectionTargets[f.key]}
                  onChange={(e) => setSelectionTarget(f.key, e.target.checked)}
                />
                <i className={`bi ${f.icon}`} aria-hidden="true" />
                <span>{f.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="toolbar-divider toolbar-divider-spacer" aria-hidden="true" />

      <div className="toolbar-group speed-control">
        <span>Speed:</span>
        <input
          type="range"
          min={1}
          max={60}
          value={tps}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
        />
        <span>{tps} tps</span>
      </div>

      <div className="toolbar-divider" aria-hidden="true" />

      <div className="toolbar-group toolbar-group-panels">
        <button className="btn btn-sim btn-sm" onClick={onReportToggle} title="Simulation Report">
          <i className="bi bi-graph-up-arrow toolbar-icon" aria-hidden="true" />
          <span>Report</span>
        </button>
        <button className="btn btn-sim btn-sm" onClick={onConfigToggle} title="Simulation Configuration">
          <i className="bi bi-sliders toolbar-icon" aria-hidden="true" />
          <span>Config</span>
        </button>
        <button className="btn btn-sim btn-sm" onClick={onGuideToggle} title="In-Game Guide">
          <i className="bi bi-question-circle-fill toolbar-icon" aria-hidden="true" />
          <span>Guide</span>
        </button>
        <button className={`btn btn-sim btn-sm ${audioSettings.muted ? 'audio-btn-muted' : ''}`} onClick={onAudioToggle} title="Audio Settings">
          <i className={`bi ${audioIcon} toolbar-icon`} aria-hidden="true" />
          <span>Audio</span>
        </button>
        <button className="btn btn-sim btn-sm" onClick={onEntitiesToggle} title="Entity Summary">
          <i className="bi bi-card-list toolbar-icon" aria-hidden="true" />
          <span>Entities</span>
        </button>
        <button
          className={`btn btn-sim btn-sm ${!pauseOnBackground ? 'active' : ''}`}
          onClick={onToggleBackground}
          title={pauseOnBackground ? 'Simulation pauses when tab is hidden' : 'Simulation runs in background'}
        >
          <i className={`bi ${pauseOnBackground ? 'bi-pause-circle-fill' : 'bi-play-circle-fill'} toolbar-icon`} aria-hidden="true" />
          <span>Background</span>
        </button>
        <span className="toolbar-version" title="Application version">
          v{appVersion}
        </span>
      </div>
    </div>
  );
}
