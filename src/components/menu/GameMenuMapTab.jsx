import React from 'react';
import { MAP_PRESETS } from './gameMenuConstants.js';

const MAX_RANDOM_SEED = 2147483646;

function buildRandomSeed() {
  return 1 + Math.floor(Math.random() * MAX_RANDOM_SEED);
}

function isPresetActive(params, preset) {
  const keys = Object.keys(preset.values || {});
  return keys.every((key) => params[key] === preset.values[key]);
}

export default function GameMenuMapTab({ params, setParams, setParam, isMapSizeLinked, setIsMapSizeLinked }) {
  return (
    <div className="gm-stack">
      <div className="gm-panel">
        <h6>Map Presets</h6>
        <div className="gm-chip-list">
          {MAP_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`gm-chip-button ${isPresetActive(params, preset) ? 'active' : ''}`}
              onClick={() => setParams((current) => ({ ...current, ...preset.values }))}
            >
              <span className="gm-chip-title">{preset.label}</span>
              <span className="gm-chip-description">{preset.description}</span>
              <span className="gm-chip-meta">
                {preset.values.map_width} x {preset.values.map_height} · Sea {preset.values.sea_level.toFixed(2)} · Islands {preset.values.island_count} · Rivers {preset.values.river_count} · Width {preset.values.river_width}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="gm-panel gm-field-grid">
        <div className="gm-field">
          <div className="gm-inline-toggle">
            <label>Map Width</label>
            <label className="gm-toggle-checkbox">
              <input
                type="checkbox"
                checked={isMapSizeLinked}
                onChange={(event) => {
                  const next = event.target.checked;
                  setIsMapSizeLinked(next);
                  if (next && params.map_width !== params.map_height) {
                    setParam('map_height', params.map_width);
                  }
                }}
              />
              Link Width/Height
            </label>
          </div>
          <div className="gm-field-value">{params.map_width} tiles</div>
          <input
            type="range"
            min={100}
            max={2000}
            step={100}
            value={params.map_width}
            onChange={(event) => {
              const value = +event.target.value;
              setParams((current) => ({
                ...current,
                map_width: value,
                map_height: isMapSizeLinked ? value : current.map_height,
              }));
            }}
          />
        </div>

        <div className="gm-field">
          <label>Map Height</label>
          <div className="gm-field-value">{params.map_height} tiles</div>
          <input
            type="range"
            min={100}
            max={2000}
            step={100}
            value={params.map_height}
            onChange={(event) => {
              const value = +event.target.value;
              setParams((current) => ({
                ...current,
                map_height: value,
                map_width: isMapSizeLinked ? value : current.map_width,
              }));
            }}
          />
        </div>

        <div className="gm-field">
          <label>Sea Level</label>
          <div className="gm-field-value">{params.sea_level.toFixed(2)}</div>
          <input type="range" min={0.1} max={0.7} step={0.02} value={params.sea_level} onChange={(event) => setParam('sea_level', +event.target.value)} />
        </div>

        <div className="gm-field">
          <label>Island Count</label>
          <div className="gm-field-value">{params.island_count}</div>
          <input type="range" min={1} max={20} value={params.island_count} onChange={(event) => setParam('island_count', +event.target.value)} />
        </div>

        <div className="gm-field">
          <label>Island Size</label>
          <div className="gm-field-value">{params.island_size_factor.toFixed(2)}</div>
          <input type="range" min={0.1} max={0.8} step={0.05} value={params.island_size_factor} onChange={(event) => setParam('island_size_factor', +event.target.value)} />
        </div>

        <div className="gm-field">
          <label>Min Land Ratio</label>
          <div className="gm-field-value">{(params.min_land_ratio ?? 0).toFixed(2)}</div>
          <input
            type="range"
            min={0}
            max={0.9}
            step={0.05}
            value={params.min_land_ratio ?? 0}
            onChange={(event) => setParam('min_land_ratio', +event.target.value)}
          />
        </div>

        <div className="gm-field">
          <label>Rivers</label>
          <div className="gm-field-value">{params.river_count ?? 0}</div>
          <input
            type="range"
            min={0}
            max={20}
            step={1}
            value={params.river_count ?? 0}
            onChange={(event) => setParam('river_count', +event.target.value)}
          />
        </div>

        <div className="gm-field">
          <label>River Width</label>
          <div className="gm-field-value">{params.river_width ?? 2}</div>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={params.river_width ?? 2}
            onChange={(event) => setParam('river_width', +event.target.value)}
          />
        </div>
      </div>

      <div className="gm-panel">
        <div className="gm-field" style={{ marginBottom: 0 }}>
          <label>Seed</label>
          <input
            type="number"
            className="form-control form-control-sm"
            placeholder="Leave empty for a random seed"
            value={params.seed}
            onChange={(event) => setParam('seed', event.target.value)}
          />
          <div className="gm-seed-actions">
            <button
              type="button"
              className="btn btn-outline-secondary py-0 px-2"
              onClick={() => setParam('seed', buildRandomSeed())}
            >
              Randomize Fixed Seed
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary py-0 px-2"
              onClick={() => setParam('seed', '')}
            >
              Random Every Run
            </button>
          </div>
          <div className="gm-field-hint">
            Empty seed generates a different world each run. A filled seed makes map generation reproducible.
          </div>
        </div>
      </div>
    </div>
  );
}
