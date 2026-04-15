/**
 * GameMenu — Modal for New Game, Save, and Load.
 */
import React, { useRef, useState } from 'react';
import useSimStore from '../store/simulationStore';
import ANIMAL_SPECIES, {
  ALL_ANIMAL_IDS,
  CARNIVORE_IDS,
  HERBIVORE_IDS,
  OMNIVORE_IDS,
  buildProportionalAnimalCounts,
  getEffectiveAnimalPopulationCap,
  normalizeAnimalCountsToBudget,
} from '../engine/animalSpecies';
import PLANT_SPECIES, { ALL_PLANT_IDS, buildInitialPlantCounts, buildPlantMaxCounts } from '../engine/plantSpecies';
import { useModalA11y } from '../hooks/useModalA11y.js';

const NUMBER_FORMATTER = new Intl.NumberFormat('en-US');
const DEFAULT_PLANT_COUNTS = buildInitialPlantCounts();
const PLANT_MAX_COUNTS = buildPlantMaxCounts();
const DEFAULT_MAX_ANIMAL_POPULATION = 10000;
const DEFAULT_POPULATION_FRACTION = 0.1;

const MAP_PRESETS = [
  {
    id: 'compact',
    label: 'Compact',
    description: 'Fast setup for a smaller world.',
    values: { map_width: 300, map_height: 300, sea_level: 0.42, island_count: 4, island_size_factor: 0.34 },
  },
  {
    id: 'balanced',
    label: 'Balanced',
    description: 'Default sandbox with room to grow.',
    values: { map_width: 500, map_height: 500, sea_level: 0.38, island_count: 5, island_size_factor: 0.3 },
  },
  {
    id: 'frontier',
    label: 'Frontier',
    description: 'Larger map with broader habitats.',
    values: { map_width: 1000, map_height: 1000, sea_level: 0.35, island_count: 8, island_size_factor: 0.28 },
  },
];

const FAUNA_GROUPS = [
  { id: 'HERBIVORE', label: 'Herbivores', icon: '🌿', speciesIds: HERBIVORE_IDS, defaultOpen: true },
  { id: 'CARNIVORE', label: 'Carnivores', icon: '🥩', speciesIds: CARNIVORE_IDS, defaultOpen: false },
  { id: 'OMNIVORE', label: 'Omnivores', icon: '🍽️', speciesIds: OMNIVORE_IDS, defaultOpen: false },
];

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

const TABS = ['new', 'save', 'load'];

function formatNumber(value) {
  return NUMBER_FORMATTER.format(Math.round(value || 0));
}

function sumValues(values = {}) {
  return Object.values(values).reduce((sum, value) => sum + (value || 0), 0);
}

function getDisplayedAnimalBudget(globalBudget) {
  if (globalBudget > 0) return globalBudget;
  return ALL_ANIMAL_IDS.reduce((sum, speciesId) => sum + getEffectiveAnimalPopulationCap(speciesId, 0), 0);
}

function buildDefaultParams() {
  const n0 = Math.round(DEFAULT_POPULATION_FRACTION * DEFAULT_MAX_ANIMAL_POPULATION);
  return {
    map_width: 500,
    map_height: 500,
    sea_level: 0.38,
    island_count: 5,
    island_size_factor: 0.3,
    seed: '',
    initial_population_fraction: DEFAULT_POPULATION_FRACTION,
    initial_animal_counts: buildProportionalAnimalCounts(n0, DEFAULT_MAX_ANIMAL_POPULATION),
    initial_plant_density: 0.1,
    initial_plant_counts: { ...DEFAULT_PLANT_COUNTS },
    max_animal_population: DEFAULT_MAX_ANIMAL_POPULATION,
  };
}

function randomizeAnimalCounts(maxAnimalPopulation, fraction) {
  const n0 = Math.round(fraction * maxAnimalPopulation);
  const lo = Math.round(0.9 * n0);
  const hi = Math.round(1.1 * n0);
  const randomTotal = lo + Math.floor(Math.random() * (hi - lo + 1));
  return buildProportionalAnimalCounts(randomTotal, maxAnimalPopulation);
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

function applyPresetToAnimals(presetKey, maxAnimalPopulation, fraction) {
  const preset = FAUNA_PRESETS[presetKey] || FAUNA_PRESETS.balanced;
  const n0 = Math.round(fraction * maxAnimalPopulation);
  const base = buildProportionalAnimalCounts(n0, maxAnimalPopulation);
  const counts = {};
  for (const [key, sp] of Object.entries(ANIMAL_SPECIES)) {
    const multiplier = sp.diet === 'HERBIVORE'
      ? preset.herbivore
      : sp.diet === 'CARNIVORE'
        ? preset.carnivore
        : preset.omnivore;
    const effectiveCap = getEffectiveAnimalPopulationCap(key, maxAnimalPopulation);
    const target = Math.round((base[key] || 0) * multiplier);
    counts[key] = Math.min(effectiveCap || target, Math.max(0, target));
  }
  return normalizeAnimalCountsToBudget(counts, maxAnimalPopulation);
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

function CollapsibleSection({ title, icon, meta, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="gm-section-shell">
      <button type="button" className="gm-section-toggle" onClick={() => setOpen(current => !current)}>
        <span className="gm-section-title">{icon} {title}</span>
        <span className="gm-section-meta">{meta} {open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="gm-section-body">{children}</div>}
    </div>
  );
}

export default function GameMenu({ open, onClose, onNewGame, onSave, onLoad }) {
  const hasWorld = useSimStore(state => !!state.terrainData || !!state.worldReady || state.animals.length > 0);
  const modalRef = useRef(null);
  const [tab, setTab] = useState('new');
  const [newTab, setNewTab] = useState('map');
  const [params, setParams] = useState(() => buildDefaultParams());
  const [pendingNewGameParams, setPendingNewGameParams] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [loadFileName, setLoadFileName] = useState('');
  const [faunaProfileLabel, setFaunaProfileLabel] = useState('Balanced baseline');
  const [floraProfileLabel, setFloraProfileLabel] = useState('Balanced growth');
  const fileInputRef = useRef(null);

  useModalA11y({ open, onClose, containerRef: modalRef });

  if (!open) return null;

  const totalAnimals = sumValues(params.initial_animal_counts);
  const totalPlants = sumValues(params.initial_plant_counts);
  const displayedAnimalBudget = getDisplayedAnimalBudget(params.max_animal_population);
  const budgetUsage = displayedAnimalBudget > 0 ? Math.min(1, totalAnimals / displayedAnimalBudget) : 0;
  const seedLabel = `${params.seed}`.trim() === '' ? 'Random seed' : `Seed ${params.seed}`;

  const applyAnimalCounts = (nextCounts, profileLabel, normalizeOptions = undefined) => {
    setParams(current => ({
      ...current,
      initial_animal_counts: normalizeAnimalCountsToBudget(nextCounts, current.max_animal_population, normalizeOptions),
    }));
    if (profileLabel) setFaunaProfileLabel(profileLabel);
  };

  const handleBudgetChange = (nextBudget) => {
    setParams(current => {
      const n0 = Math.round(current.initial_population_fraction * nextBudget);
      return {
        ...current,
        max_animal_population: nextBudget,
        initial_animal_counts: buildProportionalAnimalCounts(n0, nextBudget),
      };
    });
    setFaunaProfileLabel('Balanced baseline');
  };

  const handleFractionChange = (nextFraction) => {
    setParams(current => {
      const n0 = Math.round(nextFraction * current.max_animal_population);
      return {
        ...current,
        initial_population_fraction: nextFraction,
        initial_animal_counts: buildProportionalAnimalCounts(n0, current.max_animal_population),
      };
    });
    setFaunaProfileLabel('Balanced baseline');
  };

  const handleAnimalSliderChange = (speciesId, nextValue) => {
    setParams(current => ({
      ...current,
      initial_animal_counts: normalizeAnimalCountsToBudget(
        { ...current.initial_animal_counts, [speciesId]: nextValue },
        current.max_animal_population,
        { lockedSpecies: [speciesId] },
      ),
    }));
    setFaunaProfileLabel('Custom mix');
  };

  const setParam = (key, value) => setParams(current => ({ ...current, [key]: value }));

  const buildNewGamePayload = (nextParams = params) => {
    const payload = {
      ...nextParams,
      initial_animal_counts: normalizeAnimalCountsToBudget(nextParams.initial_animal_counts, nextParams.max_animal_population),
      initial_plant_counts: { ...nextParams.initial_plant_counts },
    };

    if (`${payload.seed}`.trim() === '') {
      delete payload.seed;
    } else {
      payload.seed = Number(payload.seed);
    }

    return payload;
  };

  const commitNewGame = (nextParams = params) => {
    const payload = buildNewGamePayload(nextParams);

    setPendingNewGameParams(null);
    onNewGame(payload);
    onClose();
  };

  const requestStartNewGame = (nextParams = params) => {
    if (hasWorld) {
      setPendingNewGameParams(buildNewGamePayload(nextParams));
      return;
    }

    commitNewGame(nextParams);
  };

  const handleQuickStart = () => {
    const nextParams = buildDefaultParams();
    setParams(nextParams);
    setFaunaProfileLabel('Balanced baseline');
    setFloraProfileLabel('Balanced growth');
    requestStartNewGame(nextParams);
  };

  const handleSave = () => {
    if (!hasWorld) return;
    setSaving(true);
    onSave((data) => {
      const json = JSON.stringify(data);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `biome-simulator-save-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSaving(false);
    });
  };

  const handleFileSelect = (e) => {
    setLoadError('');
    const file = e.target.files[0];
    setLoadFileName(file?.name || '');
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.terrain || !data.animals || !data.width) {
          setLoadError('Invalid save file. Expected world terrain, width, and animals.');
          return;
        }
        onLoad(data);
        onClose();
      } catch {
        setLoadError('Failed to parse save file. Choose a valid BiomeSimulator JSON export.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="game-menu-overlay" onClick={onClose}>
      <div className="game-menu-modal" ref={modalRef} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="game-menu-title" tabIndex={-1}>
        <div className="game-menu-header">
          <h5 id="game-menu-title">BiomeSimulator</h5>
          <button className="btn btn-sm btn-outline-secondary py-0 px-1" onClick={onClose} aria-label="Close menu">✕</button>
        </div>

        <div className="game-menu-tabs">
          {TABS.map(currentTab => (
            <button
              key={currentTab}
              className={`game-menu-tab ${tab === currentTab ? 'active' : ''}`}
              onClick={() => setTab(currentTab)}
            >
              {currentTab === 'new' ? 'New Game' : currentTab === 'save' ? 'Save' : 'Load'}
            </button>
          ))}
        </div>

        <div className="game-menu-body">
          {tab === 'new' && (
            <div className="gm-stack">
              <div className="gm-compact-summary">
                <span>Map {formatNumber(params.map_width)} x {formatNumber(params.map_height)}</span>
                <span>Fauna {formatNumber(totalAnimals)} / {formatNumber(displayedAnimalBudget)} ({(params.initial_population_fraction * 100).toFixed(0)}%)</span>
                <span>Flora {formatNumber(totalPlants)}</span>
                <span>{seedLabel}</span>
              </div>

              <div className="gm-subtabs">
                {[['map', 'Map'], ['fauna', 'Fauna'], ['flora', 'Flora']].map(([key, label]) => (
                  <button
                    key={key}
                    className={`gm-subtab ${newTab === key ? 'active' : ''}`}
                    onClick={() => setNewTab(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {newTab === 'map' && (
                <div className="gm-stack">
                  <div className="gm-panel">
                    <h6>Map Presets</h6>
                    <div className="gm-chip-list">
                      {MAP_PRESETS.map(preset => (
                        <button
                          key={preset.id}
                          type="button"
                          className="gm-chip-button"
                          onClick={() => setParams(current => ({ ...current, ...preset.values }))}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="gm-panel gm-field-grid">
                    <div className="gm-field">
                      <label>Map Size</label>
                      <div className="gm-field-value">{params.map_width} x {params.map_height}</div>
                      <input
                        type="range"
                        min={100}
                        max={2000}
                        step={100}
                        value={params.map_width}
                        onChange={e => {
                          const value = +e.target.value;
                          setParams(current => ({ ...current, map_width: value, map_height: value }));
                        }}
                      />
                    </div>

                    <div className="gm-field">
                      <label>Sea Level</label>
                      <div className="gm-field-value">{params.sea_level.toFixed(2)}</div>
                      <input type="range" min={0.1} max={0.7} step={0.02} value={params.sea_level} onChange={e => setParam('sea_level', +e.target.value)} />
                    </div>

                    <div className="gm-field">
                      <label>Island Count</label>
                      <div className="gm-field-value">{params.island_count}</div>
                      <input type="range" min={1} max={20} value={params.island_count} onChange={e => setParam('island_count', +e.target.value)} />
                    </div>

                    <div className="gm-field">
                      <label>Island Size</label>
                      <div className="gm-field-value">{params.island_size_factor.toFixed(2)}</div>
                      <input type="range" min={0.1} max={0.8} step={0.05} value={params.island_size_factor} onChange={e => setParam('island_size_factor', +e.target.value)} />
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
                        onChange={e => setParam('seed', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {newTab === 'fauna' && (
                <div className="gm-stack">
                  <div className="gm-panel">
                    <div className="gm-panel-header gm-panel-header-inline gm-panel-header-tight">
                      <h6>Fauna</h6>
                      <span className="gm-status-pill">{faunaProfileLabel}</span>
                    </div>

                    <div className="gm-budget-row">
                      <div>
                        <div className="gm-budget-label">Initial animals</div>
                        <div className="gm-budget-value">{formatNumber(totalAnimals)} / {formatNumber(displayedAnimalBudget)}</div>
                      </div>
                      <div>
                        <div className="gm-budget-label">Initial population</div>
                        <div className="gm-budget-value">{(params.initial_population_fraction * 100).toFixed(0)}% of max</div>
                      </div>
                    </div>

                    <div className="gm-progress-track">
                      <div className="gm-progress-fill" style={{ width: `${budgetUsage * 100}%` }} />
                    </div>

                    <div className="gm-field">
                      <label>Maximum Animal Population (Nmax)</label>
                      <div className="gm-field-value">{params.max_animal_population > 0 ? formatNumber(params.max_animal_population) : 'Per-species defaults'}</div>
                      <input type="range" min={0} max={50000} step={500} value={params.max_animal_population} onChange={e => handleBudgetChange(+e.target.value)} />
                    </div>

                    <div className="gm-field" style={{ marginBottom: 0 }}>
                      <label>Initial Population %</label>
                      <div className="gm-field-value">{(params.initial_population_fraction * 100).toFixed(0)}% — {formatNumber(Math.round(params.initial_population_fraction * params.max_animal_population))} animals</div>
                      <input type="range" min={0.01} max={1} step={0.01} value={params.initial_population_fraction} onChange={e => handleFractionChange(+e.target.value)} />
                    </div>
                  </div>

                  <div className="gm-panel">
                    <div className="gm-panel-header gm-panel-header-inline gm-panel-header-tight">
                      <h6>Profiles</h6>
                      <div className="gm-actions-inline">
                        <button type="button" className="btn btn-outline-secondary py-0 px-2" onClick={() => applyAnimalCounts(applyPresetToAnimals('balanced', params.max_animal_population, params.initial_population_fraction), 'Balanced baseline')}>Balanced</button>
                        <button type="button" className="btn btn-outline-secondary py-0 px-2" onClick={() => applyAnimalCounts(applyPresetToAnimals('predators', params.max_animal_population, params.initial_population_fraction), 'Predator pressure')}>Predators</button>
                        <button type="button" className="btn btn-outline-secondary py-0 px-2" onClick={() => applyAnimalCounts(applyPresetToAnimals('herbivores', params.max_animal_population, params.initial_population_fraction), 'Herbivore bloom')}>Herbivores</button>
                        <button type="button" className="btn btn-outline-secondary py-0 px-2" onClick={() => applyAnimalCounts(randomizeAnimalCounts(params.max_animal_population, params.initial_population_fraction), 'Randomized ecosystem')}>Randomize</button>
                        <button type="button" className="btn btn-outline-secondary py-0 px-2" onClick={() => { handleFractionChange(params.initial_population_fraction); setFaunaProfileLabel('Balanced baseline'); }}>Reset</button>
                      </div>
                    </div>
                  </div>

                  {FAUNA_GROUPS.map(group => {
                    const groupTotal = group.speciesIds.reduce((sum, speciesId) => sum + (params.initial_animal_counts[speciesId] || 0), 0);
                    const groupCap = group.speciesIds.reduce((sum, speciesId) => sum + getEffectiveAnimalPopulationCap(speciesId, params.max_animal_population), 0);
                    return (
                      <CollapsibleSection
                        key={group.id}
                        title={group.label}
                        icon={group.icon}
                        meta={`${formatNumber(groupTotal)} / ${formatNumber(groupCap)}`}
                        defaultOpen={group.defaultOpen}
                      >
                        {group.speciesIds.map(speciesId => {
                          const species = ANIMAL_SPECIES[speciesId];
                          const effectiveCap = getEffectiveAnimalPopulationCap(speciesId, params.max_animal_population);
                          return (
                            <div className="gm-field" key={speciesId}>
                              <label>{species.emoji} {species.name}</label>
                              <div className="gm-field-value">{formatNumber(params.initial_animal_counts[speciesId])} / {formatNumber(effectiveCap)}</div>
                              <input
                                type="range"
                                min={0}
                                max={Math.max(1, effectiveCap)}
                                value={params.initial_animal_counts[speciesId] || 0}
                                onChange={e => handleAnimalSliderChange(speciesId, +e.target.value)}
                              />
                            </div>
                          );
                        })}
                      </CollapsibleSection>
                    );
                  })}
                </div>
              )}

              {newTab === 'flora' && (
                <div className="gm-stack">
                  <div className="gm-panel">
                    <div className="gm-panel-header gm-panel-header-inline gm-panel-header-tight">
                      <h6>Flora</h6>
                      <span className="gm-status-pill">{floraProfileLabel}</span>
                    </div>

                    <div className="gm-field" style={{ marginBottom: 0 }}>
                      <label>Plant Density</label>
                      <div className="gm-field-value">{(params.initial_plant_density * 100).toFixed(0)}%</div>
                      <input type="range" min={0} max={0.5} step={0.01} value={params.initial_plant_density} onChange={e => setParam('initial_plant_density', +e.target.value)} />
                    </div>
                  </div>

                  <div className="gm-panel">
                    <div className="gm-panel-header gm-panel-header-inline gm-panel-header-tight">
                      <h6>Profiles</h6>
                      <div className="gm-actions-inline">
                        <button type="button" className="btn btn-outline-secondary py-0 px-2" onClick={() => { setParam('initial_plant_counts', applyPresetToPlants('balanced')); setFloraProfileLabel('Balanced growth'); }}>Balanced</button>
                        <button type="button" className="btn btn-outline-secondary py-0 px-2" onClick={() => { setParam('initial_plant_counts', applyPresetToPlants('predators')); setFloraProfileLabel('Sparse coverage'); }}>Sparse</button>
                        <button type="button" className="btn btn-outline-secondary py-0 px-2" onClick={() => { setParam('initial_plant_counts', applyPresetToPlants('herbivores')); setFloraProfileLabel('Rich coverage'); }}>Rich</button>
                        <button type="button" className="btn btn-outline-secondary py-0 px-2" onClick={() => { setParam('initial_plant_counts', randomizePlantCounts()); setFloraProfileLabel('Randomized growth'); }}>Randomize</button>
                        <button type="button" className="btn btn-outline-secondary py-0 px-2" onClick={() => { setParam('initial_plant_counts', { ...DEFAULT_PLANT_COUNTS }); setFloraProfileLabel('Balanced growth'); }}>Reset</button>
                      </div>
                    </div>
                  </div>

                  <div className="gm-panel">
                    {ALL_PLANT_IDS.map(id => {
                      const species = PLANT_SPECIES[id];
                      if (!species) return null;
                      const max = PLANT_MAX_COUNTS[id] || Math.max(80, (DEFAULT_PLANT_COUNTS[id] || 20) * 4);
                      return (
                        <div className="gm-field" key={id}>
                          <label>{species.fruitEmoji || species.emoji?.adult || 'plant'} {species.name}</label>
                          <div className="gm-field-value">{formatNumber(params.initial_plant_counts[id] ?? 0)} / {formatNumber(max)}</div>
                          <input
                            type="range"
                            min={0}
                            max={max}
                            value={params.initial_plant_counts[id] ?? 0}
                            onChange={e => {
                              const nextValue = +e.target.value;
                              setParams(current => ({
                                ...current,
                                initial_plant_counts: {
                                  ...current.initial_plant_counts,
                                  [id]: nextValue,
                                },
                              }));
                              setFloraProfileLabel('Custom growth');
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'save' && (
            <div className="gm-stack">
              <div className="gm-panel">
                <h6>Save File</h6>
                {hasWorld && <div className="gm-footer-note">Save the current simulation to JSON.</div>}
                {!hasWorld && <div className="gm-inline-note gm-inline-note-warning">There is no generated world to save yet.</div>}
              </div>
            </div>
          )}

          {tab === 'load' && (
            <div className="gm-stack">
              <div className="gm-panel">
                <h6>Choose Save File</h6>
                <div className="gm-footer-note">{loadFileName || 'No file selected'}</div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
                {loadError && <div className="gm-inline-note gm-inline-note-error">{loadError}</div>}
              </div>
            </div>
          )}
        </div>

        <div className="game-menu-footer">
          {tab === 'new' && (
            <>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => {
                  const nextParams = buildDefaultParams();
                  setParams(nextParams);
                  setFaunaProfileLabel('Balanced baseline');
                  setFloraProfileLabel('Balanced growth');
                  setNewTab('map');
                }}
              >
                Reset Defaults
              </button>
              <div className="gm-footer-actions">
                <button type="button" className="btn btn-outline-secondary" onClick={handleQuickStart}>Quick Start</button>
                <button type="button" className="btn btn-sim" onClick={() => requestStartNewGame()}>Start New Simulation</button>
              </div>
            </>
          )}

          {tab === 'save' && (
            <>
              <div className="gm-footer-note">{hasWorld ? 'Ready to save.' : 'No world loaded.'}</div>
              <button type="button" className="btn btn-sim" onClick={handleSave} disabled={!hasWorld || saving}>
                {saving ? 'Saving...' : 'Download Save File'}
              </button>
            </>
          )}

          {tab === 'load' && (
            <>
              <div className="gm-footer-note">Load a JSON save.</div>
              <button type="button" className="btn btn-sim" onClick={() => fileInputRef.current?.click()}>
                Choose Save File
              </button>
            </>
          )}
        </div>

        {pendingNewGameParams && (
          <div className="gm-confirm-backdrop" role="presentation">
            <div className="gm-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="gm-confirm-title">
              <div className="gm-confirm-kicker">Unsaved simulation</div>
              <h6 id="gm-confirm-title">Discard the current world?</h6>
              <p className="gm-confirm-copy">
                Starting a new simulation will replace the current terrain, plants, animals, and any unsaved progress.
              </p>
              <div className="gm-confirm-actions">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setPendingNewGameParams(null)}>
                  Keep Current World
                </button>
                <button type="button" className="btn btn-danger" onClick={() => commitNewGame(pendingNewGameParams)}>
                  Discard and Continue
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
