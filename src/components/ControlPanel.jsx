/**
 * ControlPanel — Map generation params, population settings, sim config.
 */
import React, { useState } from 'react';

const defaultParams = {
  map_width: 1000,
  map_height: 1000,
  sea_level: 0.38,
  island_count: 5,
  island_size_factor: 0.3,
  min_land_ratio: 0.5,
  seed: '',
  initial_herbivore_count: 50,
  initial_carnivore_count: 15,
  initial_plant_density: 0.15,
};

export default function ControlPanel({ onRegenerate }) {
  const [params, setParams] = useState(defaultParams);

  const set = (key, value) => setParams(p => ({ ...p, [key]: value }));

  const handleRegenerate = () => {
    const p = { ...params };
    if (p.seed === '') delete p.seed;
    else p.seed = Number(p.seed);
    onRegenerate(p);
  };

  return (
    <div className="sidebar-section">
      <h6>Map Generation</h6>

      <div className="mb-2">
        <label className="form-label small mb-0">Size: {params.map_width} × {params.map_height}</label>
        <input type="range" className="form-range form-range-sm" min={100} max={2000} step={100}
          value={params.map_width}
          onChange={e => { set('map_width', +e.target.value); set('map_height', +e.target.value); }} />
      </div>

      <div className="mb-2">
        <label className="form-label small mb-0">Sea Level: {params.sea_level.toFixed(2)}</label>
        <input type="range" className="form-range form-range-sm" min={0.1} max={0.7} step={0.02}
          value={params.sea_level}
          onChange={e => set('sea_level', +e.target.value)} />
      </div>

      <div className="mb-2">
        <label className="form-label small mb-0">Islands: {params.island_count}</label>
        <input type="range" className="form-range form-range-sm" min={1} max={20}
          value={params.island_count}
          onChange={e => set('island_count', +e.target.value)} />
      </div>

      <div className="mb-2">
        <label className="form-label small mb-0">Island Size: {params.island_size_factor.toFixed(2)}</label>
        <input type="range" className="form-range form-range-sm" min={0.1} max={0.8} step={0.05}
          value={params.island_size_factor}
          onChange={e => set('island_size_factor', +e.target.value)} />
      </div>

      <div className="mb-2">
        <label className="form-label small mb-0">Min Land Ratio: {params.min_land_ratio.toFixed(2)}</label>
        <input type="range" className="form-range form-range-sm" min={0} max={0.9} step={0.05}
          value={params.min_land_ratio}
          onChange={e => set('min_land_ratio', +e.target.value)} />
      </div>

      <div className="mb-2">
        <label className="form-label small mb-0">Seed (empty = random)</label>
        <input type="text" className="form-control form-control-sm" placeholder="Random"
          value={params.seed}
          onChange={e => set('seed', e.target.value)} />
      </div>

      <h6 className="mt-3">Population</h6>

      <div className="mb-2">
        <label className="form-label small mb-0">Herbivores: {params.initial_herbivore_count}</label>
        <input type="range" className="form-range form-range-sm" min={0} max={200}
          value={params.initial_herbivore_count}
          onChange={e => set('initial_herbivore_count', +e.target.value)} />
      </div>

      <div className="mb-2">
        <label className="form-label small mb-0">Carnivores: {params.initial_carnivore_count}</label>
        <input type="range" className="form-range form-range-sm" min={0} max={100}
          value={params.initial_carnivore_count}
          onChange={e => set('initial_carnivore_count', +e.target.value)} />
      </div>

      <div className="mb-2">
        <label className="form-label small mb-0">Plant Density: {(params.initial_plant_density * 100).toFixed(0)}%</label>
        <input type="range" className="form-range form-range-sm" min={0} max={0.5} step={0.01}
          value={params.initial_plant_density}
          onChange={e => set('initial_plant_density', +e.target.value)} />
      </div>

      <button className="btn btn-sim btn-sm w-100 mt-2" onClick={handleRegenerate}>
        🔄 Regenerate World
      </button>
    </div>
  );
}
