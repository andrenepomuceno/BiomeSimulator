/**
 * GameMenu — Modal for New Game, Save, and Load.
 */
import React, { useRef, useState } from 'react';
import useSimStore from '../store/simulationStore';
import {
  buildProportionalAnimalCounts,
  normalizeAnimalCountsToBudget,
} from '../engine/animalSpecies';
import { useModalA11y } from '../hooks/useModalA11y.js';
import GameMenuFaunaTab from './menu/GameMenuFaunaTab.jsx';
import GameMenuFloraTab from './menu/GameMenuFloraTab.jsx';
import GameMenuMapTab from './menu/GameMenuMapTab.jsx';
import {
  buildDefaultParams,
  formatNumber,
  getDisplayedAnimalBudget,
  sumValues,
  TABS,
} from './menu/gameMenuConstants.js';

const MAX_RANDOM_SEED = 2147483646;

function buildRandomSeed() {
  return 1 + Math.floor(Math.random() * MAX_RANDOM_SEED);
}

function resolveSeedValue(rawSeed) {
  const normalized = `${rawSeed}`.trim();
  if (normalized === '') return buildRandomSeed();

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return buildRandomSeed();

  return Math.floor(parsed);
}

export default function GameMenu({ open, onClose, onNewGame, onSave, onLoad }) {
  const hasWorld = useSimStore((state) => !!state.terrainData || !!state.worldReady || state.animals.length > 0);
  const modalRef = useRef(null);
  const fileInputRef = useRef(null);
  const [tab, setTab] = useState('new');
  const [newTab, setNewTab] = useState('map');
  const [isMapSizeLinked, setIsMapSizeLinked] = useState(true);
  const [params, setParams] = useState(() => buildDefaultParams());
  const [pendingNewGameParams, setPendingNewGameParams] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [loadFileName, setLoadFileName] = useState('');
  const [faunaProfileLabel, setFaunaProfileLabel] = useState('Balanced baseline');
  const [floraProfileLabel, setFloraProfileLabel] = useState('Balanced growth');

  useModalA11y({ open, onClose, containerRef: modalRef });

  if (!open) return null;

  const totalAnimals = sumValues(params.initial_animal_counts);
  const totalPlants = sumValues(params.initial_plant_counts);
  const displayedAnimalBudget = getDisplayedAnimalBudget(params.max_animal_population);
  const budgetUsage = displayedAnimalBudget > 0 ? Math.min(1, totalAnimals / displayedAnimalBudget) : 0;
  const seedLabel = `${params.seed}`.trim() === '' ? 'Random seed' : `Seed ${params.seed}`;

  const applyAnimalCounts = (nextCounts, profileLabel, normalizeOptions = undefined) => {
    setParams((current) => ({
      ...current,
      initial_animal_counts: normalizeAnimalCountsToBudget(nextCounts, current.max_animal_population, normalizeOptions),
    }));
    if (profileLabel) setFaunaProfileLabel(profileLabel);
  };

  const handleBudgetChange = (nextBudget) => {
    setParams((current) => {
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
    setParams((current) => {
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
    setParams((current) => ({
      ...current,
      initial_animal_counts: normalizeAnimalCountsToBudget(
        { ...current.initial_animal_counts, [speciesId]: nextValue },
        current.max_animal_population,
        { lockedSpecies: [speciesId] },
      ),
    }));
    setFaunaProfileLabel('Custom mix');
  };

  const setParam = (key, value) => setParams((current) => ({ ...current, [key]: value }));

  const buildNewGamePayload = (nextParams = params) => {
    const payload = {
      ...nextParams,
      initial_animal_counts: normalizeAnimalCountsToBudget(nextParams.initial_animal_counts, nextParams.max_animal_population),
      initial_plant_counts: { ...nextParams.initial_plant_counts },
      seed: resolveSeedValue(nextParams.seed),
    };

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
    setIsMapSizeLinked(true);
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
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `biome-simulator-save-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setSaving(false);
    });
  };

  const handleFileSelect = (event) => {
    setLoadError('');
    const file = event.target.files[0];
    setLoadFileName(file?.name || '');
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      try {
        const data = JSON.parse(loadEvent.target.result);
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
      <div className="game-menu-modal" ref={modalRef} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="game-menu-title" tabIndex={-1}>
        <div className="game-menu-header">
          <h5 id="game-menu-title">BiomeSimulator</h5>
          <button className="btn btn-sm btn-outline-secondary py-0 px-1" onClick={onClose} aria-label="Close menu">✕</button>
        </div>

        <div className="game-menu-tabs">
          {TABS.map((currentTab) => (
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
                <GameMenuMapTab
                  params={params}
                  setParams={setParams}
                  setParam={setParam}
                  isMapSizeLinked={isMapSizeLinked}
                  setIsMapSizeLinked={setIsMapSizeLinked}
                />
              )}
              {newTab === 'fauna' && (
                <GameMenuFaunaTab
                  params={params}
                  faunaProfileLabel={faunaProfileLabel}
                  totalAnimals={totalAnimals}
                  displayedAnimalBudget={displayedAnimalBudget}
                  budgetUsage={budgetUsage}
                  applyAnimalCounts={applyAnimalCounts}
                  handleBudgetChange={handleBudgetChange}
                  handleFractionChange={handleFractionChange}
                  handleAnimalSliderChange={handleAnimalSliderChange}
                  setFaunaProfileLabel={setFaunaProfileLabel}
                />
              )}
              {newTab === 'flora' && (
                <GameMenuFloraTab
                  params={params}
                  floraProfileLabel={floraProfileLabel}
                  setParam={setParam}
                  setParams={setParams}
                  setFloraProfileLabel={setFloraProfileLabel}
                />
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
                  setIsMapSizeLinked(true);
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
