/**
 * Toolbar — Play/Pause/Step/Reset, speed slider, day/night indicator, tool selector.
 */
import React from 'react';
import useSimStore from '../store/simulationStore';
import { formatTimeOfDay } from '../utils/time';
import logoUrl from '../assets/logo.svg';

const TOOLS = [
  { id: 'SELECT', label: 'Select', icon: 'bi-cursor-fill', shortcut: '1' },
  { id: 'PAINT_TERRAIN', label: 'Paint', icon: 'bi-brush-fill', shortcut: '2' },
  { id: 'PLACE_ENTITY', label: 'Place', icon: 'bi-plus-circle-fill', shortcut: '3' },
  { id: 'ERASE', label: 'Erase', icon: 'bi-eraser-fill', shortcut: '4' },
];

const SELECT_FILTERS = [
  { key: 'animals', label: 'Animals', icon: 'bi-bug-fill' },
  { key: 'plants', label: 'Plants', icon: 'bi-flower1' },
  { key: 'terrain', label: 'Terrain', icon: 'bi-grid-3x3-gap-fill' },
  { key: 'items', label: 'Items', icon: 'bi-box-seam-fill' },
];

export default function Toolbar({ appVersion, isDev, activeDrawer, isCompactLayout, rendererMode, onStart, onPause, onResume, onStep, onReset, onSpeedChange, onRendererModeChange, onMenuToggle, onGuideToggle, onConfigToggle, onReportToggle, onEntitiesToggle, onDebugToggle, onLeftSidebarToggle, onRightSidebarToggle }) {
  const { paused, running, tps, clock, climate, tool, setTool, selectionTargets, setSelectionTarget } = useSimStore();

  return (
    <div className="toolbar">
      <div className="toolbar-logo">
        <img src={logoUrl} alt="BiomeSimulator" className="toolbar-logo-image" />
        <span className="toolbar-logo-text">BiomeSimulator</span>
      </div>

      <div className="toolbar-divider" aria-hidden="true" />

      <div className="toolbar-group toolbar-group-primary">
        <button className="btn btn-sim btn-sm" onClick={onMenuToggle} title="Menu (Esc)">
          <i className="bi bi-list toolbar-icon" aria-hidden="true" />
          <span>Menu</span>
        </button>

        {!running || paused ? (
          <button className="btn btn-sim btn-sm" onClick={running ? onResume : onStart} title={running ? 'Resume (Space)' : 'Start (Space)'}>
            <i className={`bi ${running ? 'bi-play-fill' : 'bi-play-circle-fill'} toolbar-icon`} aria-hidden="true" />
            <span>{running ? 'Resume' : 'Start'}</span>
          </button>
        ) : (
          <button className="btn btn-sim btn-sm active" onClick={onPause} title="Pause (Space)">
            <i className="bi bi-pause-fill toolbar-icon" aria-hidden="true" />
            <span>Pause</span>
          </button>
        )}
        <button className="btn btn-sim btn-sm" onClick={onStep} disabled={!paused && running} title="Step (N)">
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
          <span>{formatTimeOfDay(clock.tick_in_day, clock.ticks_per_day)} · Day {clock.day} · Tick {clock.tick} · {climate?.seasonName ?? 'Spring'} · {(climate?.temperature ?? 15).toFixed(0)}°C</span>
        </div>
      </div>

      <div className="toolbar-divider" aria-hidden="true" />

      <div className="toolbar-group toolbar-group-tools">
        {TOOLS.map(t => (
          <button
            key={t.id}
            className={`tool-btn ${tool === t.id ? 'active' : ''}`}
            onClick={() => setTool(t.id)}
            title={`${t.label} (${t.shortcut})`}
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

      <div className="toolbar-group speed-control" title="Adjust simulation speed ([ / ])">
        <span>Speed:</span>
        <input
          type="range"
          min={1}
          max={60}
          value={tps}
          title="Adjust simulation speed ([ / ])"
          onChange={(e) => onSpeedChange(Number(e.target.value))}
        />
        <span>{tps} tps</span>
      </div>

      <div className="toolbar-divider" aria-hidden="true" />

      <div className="toolbar-group" title="Renderer backend">
        <span>Renderer:</span>
        <select
          className="form-select form-select-sm"
          value={rendererMode || 'pixi'}
          onChange={(e) => onRendererModeChange?.(e.target.value)}
          aria-label="Renderer backend"
        >
          <option value="pixi">Pixi</option>
          <option value="three">Three</option>
        </select>
      </div>

      {isCompactLayout && (
        <>
          <div className="toolbar-divider" aria-hidden="true" />
          <div className="toolbar-group toolbar-group-drawers">
            <button className={`btn btn-sim btn-sm ${activeDrawer === 'left' ? 'active' : ''}`} onClick={onLeftSidebarToggle} title="Open overview panel">
              <i className="bi bi-compass-fill toolbar-icon" aria-hidden="true" />
              <span>Overview</span>
            </button>
            <button className={`btn btn-sim btn-sm ${activeDrawer === 'right' ? 'active' : ''}`} onClick={onRightSidebarToggle} title="Open inspector panel">
              <i className="bi bi-layout-text-sidebar-reverse toolbar-icon" aria-hidden="true" />
              <span>Inspect</span>
            </button>
          </div>
        </>
      )}

      <div className="toolbar-divider" aria-hidden="true" />

      <div className="toolbar-group toolbar-group-panels">
        <button className="btn btn-sim btn-sm" onClick={onReportToggle} title="Simulation Report (R)">
          <i className="bi bi-graph-up-arrow toolbar-icon" aria-hidden="true" />
          <span>Report</span>
        </button>
        <button className="btn btn-sim btn-sm" onClick={onConfigToggle} title="Simulation Configuration (C)">
          <i className="bi bi-sliders toolbar-icon" aria-hidden="true" />
          <span>Config</span>
        </button>
        <button className="btn btn-sim btn-sm" onClick={onGuideToggle} title="In-Game Guide (G)">
          <i className="bi bi-question-circle-fill toolbar-icon" aria-hidden="true" />
          <span>Guide</span>
        </button>
        <button className="btn btn-sim btn-sm" onClick={onEntitiesToggle} title="Entity Summary (E)">
          <i className="bi bi-card-list toolbar-icon" aria-hidden="true" />
          <span>Entities</span>
        </button>
        {isDev && (
          <button className="btn btn-debug btn-sm" onClick={onDebugToggle} title="Dev Debug Dashboard">
            <i className="bi bi-bug-fill toolbar-icon" aria-hidden="true" />
            <span>Debug</span>
          </button>
        )}
        <span className="toolbar-version" title="Application version">
          v{appVersion}
        </span>
      </div>
    </div>
  );
}
