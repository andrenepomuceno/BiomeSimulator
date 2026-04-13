/**
 * GameMenu — Modal for New Game, Save, and Load.
 */
import React, { useState, useRef } from 'react';
import useSimStore from '../store/simulationStore';
import ANIMAL_SPECIES, { buildInitialAnimalCounts } from '../engine/animalSpecies';
import PLANT_SPECIES, { ALL_PLANT_IDS, buildInitialPlantCounts, buildPlantMaxCounts } from '../engine/plantSpecies';

const DEFAULT_ANIMAL_COUNTS = buildInitialAnimalCounts();
const DEFAULT_PLANT_COUNTS = buildInitialPlantCounts();
const PLANT_MAX_COUNTS = buildPlantMaxCounts();

const FAUNA_PRESETS = {
  balanced: { herbivore: 1.0, carnivore: 1.0, omnivore: 1.0 },
  predators: { herbivore: 0.7, carnivore: 1.35, omnivore: 1.2 },
  herbivores: { herbivore: 1.35, carnivore: 0.65, omnivore: 0.95 },
};

const FLORA_PRESETS = {
  balanced: 1.0,
  predators: 0.85,
  herbivores: 1.2,
};

function scaleCountsToBudget(counts, budget) {
  if (!budget || budget <= 0) return counts;
  const total = Object.values(counts).reduce((sum, n) => sum + (n || 0), 0);
  if (total <= budget) return counts;

  const scaled = {};
  const fractions = [];
  let assigned = 0;
  for (const [key, value] of Object.entries(counts)) {
    const raw = (value * budget) / total;
    const floor = Math.floor(raw);
    scaled[key] = floor;
    fractions.push([key, raw - floor]);
    assigned += floor;
  }

  fractions.sort((a, b) => b[1] - a[1]);
  for (let i = 0; i < budget - assigned && i < fractions.length; i++) {
    const [key] = fractions[i];
    scaled[key] += 1;
  }

  return scaled;
}

function randomizeAnimalCounts(maxAnimalPopulation) {
  const counts = {};
  for (const [key, sp] of Object.entries(ANIMAL_SPECIES)) {
    const max = Math.max(1, Math.round(sp.max_population || sp.initial_count || 100));
    const lo = Math.max(0, Math.round(max * 0.18));
    const hi = Math.max(lo, Math.round(max * 0.7));
    counts[key] = lo + Math.floor(Math.random() * (hi - lo + 1));
  }
  return scaleCountsToBudget(counts, maxAnimalPopulation);
}

function randomizePlantCounts() {
  const counts = {};
  for (const id of ALL_PLANT_IDS) {
    const max = Math.max(20, Math.round(PLANT_MAX_COUNTS[id] || 120));
    const lo = Math.max(5, Math.round(max * 0.15));
    const hi = Math.max(lo, Math.round(max * 0.7));
    counts[id] = lo + Math.floor(Math.random() * (hi - lo + 1));
  }
  return counts;
}

function applyPresetToAnimals(presetKey, maxAnimalPopulation) {
  const preset = FAUNA_PRESETS[presetKey] || FAUNA_PRESETS.balanced;
  const counts = {};
  for (const [key, sp] of Object.entries(ANIMAL_SPECIES)) {
    const multiplier = sp.diet === 'HERBIVORE'
      ? preset.herbivore
      : sp.diet === 'CARNIVORE'
        ? preset.carnivore
        : preset.omnivore;
    const target = Math.round((sp.initial_count || 0) * multiplier);
    counts[key] = Math.min(sp.max_population || target, Math.max(0, target));
  }
  return scaleCountsToBudget(counts, maxAnimalPopulation);
}

function applyPresetToPlants(presetKey) {
  const multiplier = FLORA_PRESETS[presetKey] || 1;
  const counts = {};
  for (const [id, value] of Object.entries(DEFAULT_PLANT_COUNTS)) {
    const max = PLANT_MAX_COUNTS[id] || Math.max(50, value * 4);
    counts[id] = Math.min(max, Math.max(0, Math.round(value * multiplier)));
  }
  return counts;
}

const defaultParams = {
  map_width: 500,
  map_height: 500,
  sea_level: 0.38,
  island_count: 5,
  island_size_factor: 0.3,
  seed: '',
  initial_animal_counts: DEFAULT_ANIMAL_COUNTS,
  initial_plant_density: 0.1,
  initial_plant_counts: DEFAULT_PLANT_COUNTS,
  max_animal_population: 10000,
};

const TABS = ['new', 'save', 'load'];

export default function GameMenu({ open, onClose, onNewGame, onSave, onLoad }) {
  const [tab, setTab] = useState('new');
  const [newTab, setNewTab] = useState('map');
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
              {/* Sub-tabs for new game sections */}
              <div className="gm-subtabs">
                {[['map', '🗺️ Map'], ['fauna', '🐾 Fauna'], ['flora', '🌿 Flora']].map(([k, label]) => (
                  <button
                    key={k}
                    className={`gm-subtab ${newTab === k ? 'active' : ''}`}
                    onClick={() => setNewTab(k)}
                  >{label}</button>
                ))}
              </div>

              {/* MAP SUB-TAB */}
              {newTab === 'map' && (
                <div>
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
                </div>
              )}

              {/* FAUNA SUB-TAB */}
              {newTab === 'fauna' && (
                <div>
                  <div className="gm-field">
                    <label>🌐 Max Animal Population: {params.max_animal_population === 0 ? 'Default (per-species)' : params.max_animal_population}</label>
                    <input type="range" min={0} max={50000} step={500}
                      value={params.max_animal_population}
                      onChange={e => set('max_animal_population', +e.target.value)} />
                    <div style={{ fontSize: '0.7rem', color: '#777', marginTop: 2 }}>
                      Budget distributed proportionally per species. 0 = use each species' default cap.
                    </div>
                  </div>

                  <div className="d-flex align-items-center flex-wrap mb-2 mt-3" style={{ gap: 4 }}>
                    <span style={{ fontSize: '0.75rem', color: '#999' }}>Set initial population for each species</span>
                    <div className="btn-group btn-group-sm ms-auto" role="group" aria-label="Fauna presets">
                      <button
                        className="btn btn-outline-secondary py-0 px-1"
                        title="Balanced fauna"
                        onClick={() => setParams(p => ({
                          ...p,
                          initial_animal_counts: applyPresetToAnimals('balanced', p.max_animal_population),
                        }))}
                      >Balanced</button>
                      <button
                        className="btn btn-outline-secondary py-0 px-1"
                        title="Predator-heavy fauna"
                        onClick={() => setParams(p => ({
                          ...p,
                          initial_animal_counts: applyPresetToAnimals('predators', p.max_animal_population),
                        }))}
                      >Predators</button>
                      <button
                        className="btn btn-outline-secondary py-0 px-1"
                        title="Herbivore-heavy fauna"
                        onClick={() => setParams(p => ({
                          ...p,
                          initial_animal_counts: applyPresetToAnimals('herbivores', p.max_animal_population),
                        }))}
                      >Herbivores</button>
                    </div>
                    <button
                      className="btn btn-sm btn-outline-secondary ms-1 py-0 px-1"
                      title="Randomize all animal counts"
                      onClick={() => {
                        setParams(p => ({
                          ...p,
                          initial_animal_counts: randomizeAnimalCounts(p.max_animal_population),
                        }));
                      }}
                    >🎲</button>
                    <button
                      className="btn btn-sm btn-outline-secondary ms-1 py-0 px-1"
                      title="Reset to defaults"
                      onClick={() => setParams(p => ({ ...p, initial_animal_counts: buildInitialAnimalCounts() }))}
                    >↺</button>
                  </div>

                  {['HERBIVORE', 'CARNIVORE', 'OMNIVORE'].map(diet => {
                    const species = Object.entries(ANIMAL_SPECIES).filter(([, sp]) => sp.diet === diet);
                    if (!species.length) return null;
                    return (
                      <div key={diet}>
                        <h6 className="mt-2">{diet === 'HERBIVORE' ? '🌿 Herbivores' : diet === 'CARNIVORE' ? '🥩 Carnivores' : '🍽️ Omnivores'}</h6>
                        {species.map(([key, sp]) => (
                          <div className="gm-field" key={key}>
                            <label>{sp.emoji} {sp.name}: {params.initial_animal_counts[key]} / {sp.max_population}</label>
                            <input type="range" min={0} max={sp.max_population || 100}
                              value={params.initial_animal_counts[key]}
                              onChange={e => setParams(p => ({ ...p, initial_animal_counts: { ...p.initial_animal_counts, [key]: +e.target.value } }))} />
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* FLORA SUB-TAB */}
              {newTab === 'flora' && (
                <div>
                  <div className="gm-field">
                    <label>🌿 Plant Density: {(params.initial_plant_density * 100).toFixed(0)}%</label>
                    <input type="range" min={0} max={0.5} step={0.01}
                      value={params.initial_plant_density}
                      onChange={e => set('initial_plant_density', +e.target.value)} />
                  </div>
                  <div className="d-flex align-items-center flex-wrap mb-2 mt-2" style={{ gap: 4 }}>
                    <span style={{ fontSize: '0.75rem', color: '#999' }}>Set initial seed targets by plant species</span>
                    <div className="btn-group btn-group-sm ms-auto" role="group" aria-label="Flora presets">
                      <button
                        className="btn btn-outline-secondary py-0 px-1"
                        title="Balanced flora"
                        onClick={() => setParams(p => ({ ...p, initial_plant_counts: applyPresetToPlants('balanced') }))}
                      >Balanced</button>
                      <button
                        className="btn btn-outline-secondary py-0 px-1"
                        title="Lower flora pressure"
                        onClick={() => setParams(p => ({ ...p, initial_plant_counts: applyPresetToPlants('predators') }))}
                      >Sparse</button>
                      <button
                        className="btn btn-outline-secondary py-0 px-1"
                        title="Higher flora pressure"
                        onClick={() => setParams(p => ({ ...p, initial_plant_counts: applyPresetToPlants('herbivores') }))}
                      >Rich</button>
                    </div>
                    <button
                      className="btn btn-sm btn-outline-secondary ms-1 py-0 px-1"
                      title="Randomize all plant counts"
                      onClick={() => setParams(p => ({ ...p, initial_plant_counts: randomizePlantCounts() }))}
                    >🎲</button>
                    <button
                      className="btn btn-sm btn-outline-secondary ms-1 py-0 px-1"
                      title="Reset plant defaults"
                      onClick={() => setParams(p => ({ ...p, initial_plant_counts: buildInitialPlantCounts() }))}
                    >↺</button>
                  </div>
                  {ALL_PLANT_IDS.map(id => {
                    const sp = PLANT_SPECIES[id];
                    if (!sp) return null;
                    const max = PLANT_MAX_COUNTS[id] || Math.max(80, (DEFAULT_PLANT_COUNTS[id] || 20) * 4);
                    return (
                      <div className="gm-field" key={id}>
                        <label>{sp.fruitEmoji || sp.emoji?.adult || '🌿'} {sp.name}: {params.initial_plant_counts[id] ?? 0} / {max}</label>
                        <input
                          type="range"
                          min={0}
                          max={max}
                          value={params.initial_plant_counts[id] ?? 0}
                          onChange={e => setParams(p => ({
                            ...p,
                            initial_plant_counts: {
                              ...p.initial_plant_counts,
                              [id]: +e.target.value,
                            },
                          }))}
                        />
                      </div>
                    );
                  })}
                  <p style={{ fontSize: '0.75rem', color: '#999', marginTop: 8 }}>
                    Controls the percentage of eligible land tiles that will be seeded with plants on world generation.
                    Species sliders define target seed counts and are normalized to the map capacity from density.
                  </p>
                </div>
              )}

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
