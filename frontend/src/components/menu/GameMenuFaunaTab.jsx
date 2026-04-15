import React, { useState } from 'react';
import ANIMAL_SPECIES, {
  CARNIVORE_IDS,
  HERBIVORE_IDS,
  OMNIVORE_IDS,
  getEffectiveAnimalPopulationCap,
} from '../../engine/animalSpecies';
import { applyPresetToAnimals, formatNumber, randomizeAnimalCounts } from './gameMenuConstants.js';

const FAUNA_GROUPS = [
  { id: 'HERBIVORE', label: 'Herbivores', icon: '🌿', speciesIds: HERBIVORE_IDS, defaultOpen: true },
  { id: 'CARNIVORE', label: 'Carnivores', icon: '🥩', speciesIds: CARNIVORE_IDS, defaultOpen: false },
  { id: 'OMNIVORE', label: 'Omnivores', icon: '🍽️', speciesIds: OMNIVORE_IDS, defaultOpen: false },
];

function CollapsibleSection({ title, icon, meta, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="gm-section-shell">
      <button type="button" className="gm-section-toggle" onClick={() => setOpen((current) => !current)}>
        <span className="gm-section-title">{icon} {title}</span>
        <span className="gm-section-meta">{meta} {open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="gm-section-body">{children}</div>}
    </div>
  );
}

export default function GameMenuFaunaTab({
  params,
  faunaProfileLabel,
  totalAnimals,
  displayedAnimalBudget,
  budgetUsage,
  applyAnimalCounts,
  handleBudgetChange,
  handleFractionChange,
  handleAnimalSliderChange,
  setFaunaProfileLabel,
}) {
  return (
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
          <input type="range" min={0} max={50000} step={500} value={params.max_animal_population} onChange={(event) => handleBudgetChange(+event.target.value)} />
        </div>

        <div className="gm-field" style={{ marginBottom: 0 }}>
          <label>Initial Population %</label>
          <div className="gm-field-value">{(params.initial_population_fraction * 100).toFixed(0)}% — {formatNumber(Math.round(params.initial_population_fraction * params.max_animal_population))} animals</div>
          <input type="range" min={0.01} max={1} step={0.01} value={params.initial_population_fraction} onChange={(event) => handleFractionChange(+event.target.value)} />
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

      {FAUNA_GROUPS.map((group) => {
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
            {group.speciesIds.map((speciesId) => {
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
                    onChange={(event) => handleAnimalSliderChange(speciesId, +event.target.value)}
                  />
                </div>
              );
            })}
          </CollapsibleSection>
        );
      })}
    </div>
  );
}
