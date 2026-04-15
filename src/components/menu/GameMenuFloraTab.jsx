import React from 'react';
import PLANT_SPECIES, { ALL_PLANT_IDS } from '../../engine/plantSpecies';
import {
  applyPresetToPlants,
  DEFAULT_PLANT_COUNTS,
  formatNumber,
  PLANT_MAX_COUNTS,
  randomizePlantCounts,
} from './gameMenuConstants.js';

export default function GameMenuFloraTab({ params, floraProfileLabel, setParam, setParams, setFloraProfileLabel }) {
  return (
    <div className="gm-stack">
      <div className="gm-panel">
        <div className="gm-panel-header gm-panel-header-inline gm-panel-header-tight">
          <h6>Flora</h6>
          <span className="gm-status-pill">{floraProfileLabel}</span>
        </div>

        <div className="gm-field" style={{ marginBottom: 0 }}>
          <label>Plant Density</label>
          <div className="gm-field-value">{(params.initial_plant_density * 100).toFixed(0)}%</div>
          <input type="range" min={0} max={0.5} step={0.01} value={params.initial_plant_density} onChange={(event) => setParam('initial_plant_density', +event.target.value)} />
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
        {ALL_PLANT_IDS.map((id) => {
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
                onChange={(event) => {
                  const nextValue = +event.target.value;
                  setParams((current) => ({
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
  );
}
