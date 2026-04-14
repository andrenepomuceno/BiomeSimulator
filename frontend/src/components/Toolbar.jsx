/**
 * Toolbar — Play/Pause/Step/Reset, speed slider, day/night indicator, tool selector.
 */
import React from 'react';
import useSimStore from '../store/simulationStore';
import { formatTimeOfDay } from '../utils/time';

const TOOLS = [
  { id: 'SELECT', label: '🔍 Select' },
  { id: 'PAINT_TERRAIN', label: '🎨 Paint' },
  { id: 'PLACE_ENTITY', label: '🐾 Place' },
  { id: 'ERASE', label: '🗑️ Erase' },
];

export default function Toolbar({ onStart, onPause, onResume, onStep, onReset, onSpeedChange, onMenuToggle, onGuideToggle, onConfigToggle, onAudioToggle, onReportToggle, onEntitiesToggle }) {
  const { paused, running, tps, clock, tool, setTool, audioSettings } = useSimStore();
  const audioLabel = audioSettings.muted
    ? '🔇 Audio'
    : audioSettings.unlocked
      ? '🔊 Audio'
      : '🔈 Audio';

  return (
    <div className="toolbar">
      {/* Menu button */}
      <button className="btn btn-sim btn-sm" onClick={onMenuToggle} title="Menu (Esc)">
        ☰
      </button>

      <div style={{ width: 1, height: 24, background: '#1a1a4e', margin: '0 4px' }} />

      {/* Sim controls */}
      {!running || paused ? (
        <button className="btn btn-sim btn-sm" onClick={running ? onResume : onStart}>
          ▶ {running ? 'Resume' : 'Start'}
        </button>
      ) : (
        <button className="btn btn-sim btn-sm active" onClick={onPause}>
          ⏸ Pause
        </button>
      )}
      <button className="btn btn-sim btn-sm" onClick={onStep} disabled={!paused && running}>
        ⏭ Step
      </button>
      <button className="btn btn-sim btn-sm" onClick={onReset}>
        🔄 Reset
      </button>

      {/* Day/Night indicator */}
      <div className={`day-indicator ${clock.is_night ? 'night' : 'day'}`}>
        {clock.is_night ? '🌙' : '☀️'} {formatTimeOfDay(clock.tick_in_day, clock.ticks_per_day)} · Day {clock.day} · Tick {clock.tick}
      </div>

      {/* Tool selector */}
      <div style={{ display: 'flex', gap: 4, marginLeft: 16 }}>
        {TOOLS.map(t => (
          <button
            key={t.id}
            className={`tool-btn ${tool === t.id ? 'active' : ''}`}
            onClick={() => setTool(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Speed control */}
      <div className="speed-control">
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

      <button className="btn btn-sim btn-sm" onClick={onReportToggle} title="Simulation Report">
        📈 Report
      </button>
      <button className="btn btn-sim btn-sm" onClick={onConfigToggle} title="Simulation Configuration">
        ⚙ Config
      </button>
      <button className="btn btn-sim btn-sm" onClick={onGuideToggle} title="In-Game Guide">
        ❓ Guide
      </button>
      <button className={`btn btn-sim btn-sm ${audioSettings.muted ? 'audio-btn-muted' : ''}`} onClick={onAudioToggle} title="Audio Settings">
        {audioLabel}
      </button>
      <button className="btn btn-sim btn-sm" onClick={onEntitiesToggle} title="Entity Summary">
        📋 Entities
      </button>
    </div>
  );
}
