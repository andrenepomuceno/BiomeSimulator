/**
 * GameMenu — Modal for New Game, Save, and Load.
 */
import React, { useState, useRef } from 'react';
import useSimStore from '../store/simulationStore';
import ANIMAL_SPECIES, { buildInitialAnimalCounts } from '../engine/animalSpecies';

const SLIDER_MAX = { HERBIVORE: 500, CARNIVORE: 500 };

const defaultParams = {
  map_width: 500,
  map_height: 500,
  sea_level: 0.38,
  island_count: 5,
  island_size_factor: 0.3,
  seed: '',
  initial_animal_counts: buildInitialAnimalCounts(),
  initial_plant_density: 0.1,
};

const TABS = ['new', 'save', 'load'];

export default function GameMenu({ open, onClose, onNewGame, onSave, onLoad }) {
  const [tab, setTab] = useState('new');
  const [params, setParams] = useState(defaultParams);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const fileInputRef = useRef(null);

  if (!open) return null;

  const set = (key, value) => setParams(p => ({ ...p, [key]: value }));

  const handleNewGame = () => {
    const p = { ...params };
    if (p.seed === '') delete p.seed;
    else p.seed = Number(p.seed);
    onNewGame(p);
    onClose();
  };

  const handleSave = () => {
    setSaving(true);
    onSave((data) => {
      const json = JSON.stringify(data);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ecogame-save-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSaving(false);
    });
  };

  const handleFileSelect = (e) => {
    setLoadError('');
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.terrain || !data.animals || !data.width) {
          setLoadError('Invalid save file.');
          return;
        }
        onLoad(data);
        onClose();
      } catch {
        setLoadError('Failed to parse save file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="game-menu-overlay" onClick={onClose}>
      <div className="game-menu-modal" onClick={e => e.stopPropagation()}>
        <div className="game-menu-header">
          <h5>🌍 Ecosystem Simulator</h5>
          <button className="btn btn-sm btn-outline-secondary py-0 px-1" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="game-menu-tabs">
          {TABS.map(t => (
            <button
              key={t}
              className={`game-menu-tab ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'new' ? '🆕 New Game' : t === 'save' ? '💾 Save' : '📂 Load'}
            </button>
          ))}
        </div>

        <div className="game-menu-body">
          {/* NEW GAME TAB */}
          {tab === 'new' && (
            <div>
              <h6>🗺️ Map Settings</h6>

              <div className="gm-field">
                <label>Map Size: {params.map_width} × {params.map_height}</label>
                <input type="range" min={100} max={2000} step={100}
                  value={params.map_width}
                  onChange={e => { set('map_width', +e.target.value); set('map_height', +e.target.value); }} />
              </div>

              <div className="gm-field">
                <label>Sea Level: {params.sea_level.toFixed(2)}</label>
                <input type="range" min={0.1} max={0.7} step={0.02}
                  value={params.sea_level}
                  onChange={e => set('sea_level', +e.target.value)} />
              </div>

              <div className="gm-field">
                <label>Islands: {params.island_count}</label>
                <input type="range" min={1} max={20}
                  value={params.island_count}
                  onChange={e => set('island_count', +e.target.value)} />
              </div>

              <div className="gm-field">
                <label>Island Size: {params.island_size_factor.toFixed(2)}</label>
                <input type="range" min={0.1} max={0.8} step={0.05}
                  value={params.island_size_factor}
                  onChange={e => set('island_size_factor', +e.target.value)} />
              </div>

              <div className="gm-field">
                <label>Seed (empty = random)</label>
                <input type="text" className="form-control form-control-sm" placeholder="Random"
                  value={params.seed}
                  onChange={e => set('seed', e.target.value)} />
              </div>

              <div className="d-flex align-items-center mt-3 mb-1">
                <h6 className="mb-0">🐾 Population</h6>
                <button
                  className="btn btn-sm btn-outline-secondary ms-2 py-0 px-1"
                  title="Randomize all animal counts"
                  onClick={() => {
                    const counts = {};
                    for (const [k, sp] of Object.entries(ANIMAL_SPECIES)) {
                      const base = sp.initial_count;
                      const lo = Math.round(base * 0.2);
                      const hi = Math.round(base * 2.5);
                      const max = SLIDER_MAX[sp.diet] || 100;
                      counts[k] = Math.min(max, lo + Math.floor(Math.random() * (hi - lo + 1)));
                    }
                    setParams(p => ({ ...p, initial_animal_counts: counts }));
                  }}
                >🎲</button>
              </div>

              {Object.entries(ANIMAL_SPECIES).map(([key, sp]) => (
                <div className="gm-field" key={key}>
                  <label>{sp.emoji} {sp.name}: {params.initial_animal_counts[key]}</label>
                  <input type="range" min={0} max={SLIDER_MAX[sp.diet] || 100}
                    value={params.initial_animal_counts[key]}
                    onChange={e => setParams(p => ({ ...p, initial_animal_counts: { ...p.initial_animal_counts, [key]: +e.target.value } }))} />
                </div>
              ))}

              <div className="gm-field">
                <label>🌿 Plant Density: {(params.initial_plant_density * 100).toFixed(0)}%</label>
                <input type="range" min={0} max={0.5} step={0.01}
                  value={params.initial_plant_density}
                  onChange={e => set('initial_plant_density', +e.target.value)} />
              </div>

              <button className="btn btn-sim w-100 mt-3" onClick={handleNewGame}>
                🚀 Start New Simulation
              </button>
            </div>
          )}

          {/* SAVE TAB */}
          {tab === 'save' && (
            <div className="text-center" style={{ padding: '30px 0' }}>
              <p className="mb-3">Save the current simulation state to a file.</p>
              <button className="btn btn-sim" onClick={handleSave} disabled={saving}>
                {saving ? '⏳ Saving...' : '💾 Download Save File'}
              </button>
            </div>
          )}

          {/* LOAD TAB */}
          {tab === 'load' && (
            <div className="text-center" style={{ padding: '30px 0' }}>
              <p className="mb-3">Load a previously saved simulation from a JSON file.</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
              <button className="btn btn-sim" onClick={() => fileInputRef.current?.click()}>
                📂 Choose Save File
              </button>
              {loadError && <div className="text-danger mt-2" style={{ fontSize: '0.8rem' }}>{loadError}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
