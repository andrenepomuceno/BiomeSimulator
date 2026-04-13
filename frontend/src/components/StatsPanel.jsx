/**
 * StatsPanel — live population counters and chart.
 */
import React, { useEffect, useState, useRef, useMemo } from 'react';
import useSimStore from '../store/simulationStore';
import { SPECIES_INFO } from '../utils/terrainColors';
import ANIMAL_SPECIES, { BASE_POP_TOTAL } from '../engine/animalSpecies';
import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Legend, Tooltip } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Legend, Tooltip);

const SPECIES_CHART_COLORS = {
  RABBIT:   '#66cc66',
  SQUIRREL: '#cc8844',
  BEETLE:   '#556633',
  GOAT:     '#bbbbbb',
  DEER:     '#cc9955',
  FOX:      '#dd8833',
  WOLF:     '#dd4444',
};

export default function StatsPanel() {
  const { stats, clock, hungerMultiplier, thirstMultiplier, worker } = useSimStore();
  const speciesKeys = Object.keys(SPECIES_INFO);
  const [history, setHistory] = useState(() => {
    const h = { ticks: [] };
    speciesKeys.forEach(k => h[k] = []);
    h.plants = [];
    return h;
  });

  useEffect(() => {
    setHistory(prev => {
      const newH = { ticks: [...prev.ticks, clock.tick].slice(-200) };
      speciesKeys.forEach(k => {
        newH[k] = [...(prev[k] || []), (stats.species && stats.species[k]) || 0].slice(-200);
      });
      newH.plants = [...prev.plants, stats.plants_total].slice(-200);
      return newH;
    });
  }, [clock.tick]);

  const chartData = {
    labels: history.ticks.map(() => ''),
    datasets: [
      ...speciesKeys.map(k => ({
        label: SPECIES_INFO[k].name,
        data: history[k] || [],
        borderColor: SPECIES_CHART_COLORS[k],
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.3,
      })),
      {
        label: 'Plants',
        data: history.plants,
        borderColor: '#88cc44',
        borderWidth: 1,
        pointRadius: 0,
        tension: 0.3,
        hidden: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#ccc', font: { size: 10 } },
      },
    },
    scales: {
      x: { display: false },
      y: {
        ticks: { color: '#999', font: { size: 9 } },
        grid: { color: '#1a1a3e' },
      },
    },
    animation: false,
  };

  const gameConfig = useSimStore(s => s.gameConfig);
  const speciesCaps = useMemo(() => {
    const globalMax = gameConfig?.max_animal_population || 0;
    const caps = {};
    for (const k of speciesKeys) {
      const base = ANIMAL_SPECIES[k]?.max_population || 0;
      caps[k] = globalMax > 0
        ? Math.max(2, Math.round(base * globalMax / BASE_POP_TOTAL))
        : base;
    }
    return caps;
  }, [gameConfig?.max_animal_population]);

  return (
    <div className="sidebar-section">
      <h6>Population</h6>
      {speciesKeys.map(k => {
        const count = (stats.species && stats.species[k]) || 0;
        const cap = speciesCaps[k] || 0;
        const pct = cap > 0 ? count / cap : 0;
        const barColor = pct > 0.8 ? '#dd4444' : pct > 0.6 ? '#ddaa33' : SPECIES_CHART_COLORS[k] || '#66cc66';
        return (
          <div key={k} style={{ marginBottom: 2 }}>
            <div className="stat-row">
              <span className="stat-label">{SPECIES_INFO[k].emoji} {SPECIES_INFO[k].name}</span>
              <span className="stat-value" style={{ color: SPECIES_CHART_COLORS[k] }}>
                {count}<span style={{ color: '#666', fontSize: '0.7rem' }}>/{cap}</span>
              </span>
            </div>
            <div style={{ height: 3, background: '#1a1a3e', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, pct * 100)}%`, background: barColor, transition: 'width 0.3s' }} />
            </div>
          </div>
        );
      })}
      <div className="stat-row">
        <span className="stat-label">🌿 Plants</span>
        <span className="stat-value" style={{ color: '#88cc44' }}>{stats.plants_total}</span>
      </div>
      <div className="stat-row">
        <span className="stat-label">🍎 Fruits</span>
        <span className="stat-value" style={{ color: '#ff8844' }}>{stats.fruits}</span>
      </div>

      <div style={{ height: 140, marginTop: 8 }}>
        <Line data={chartData} options={chartOptions} />
      </div>

      <h6 style={{ marginTop: 12 }}>Rate Multipliers</h6>
      <div className="stat-row" style={{ flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="stat-label" style={{ minWidth: 50 }}>🍖 Hunger</span>
          <input
            type="range"
            min="0.1"
            max="3"
            step="0.1"
            value={hungerMultiplier}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              useSimStore.getState().setHungerMultiplier(v);
              if (worker) worker.postMessage({ cmd: 'setMultipliers', hungerMultiplier: v });
            }}
            style={{ flex: 1 }}
          />
          <span className="stat-value" style={{ minWidth: 32, textAlign: 'right' }}>{hungerMultiplier.toFixed(1)}x</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="stat-label" style={{ minWidth: 50 }}>💧 Thirst</span>
          <input
            type="range"
            min="0.1"
            max="3"
            step="0.1"
            value={thirstMultiplier}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              useSimStore.getState().setThirstMultiplier(v);
              if (worker) worker.postMessage({ cmd: 'setMultipliers', thirstMultiplier: v });
            }}
            style={{ flex: 1 }}
          />
          <span className="stat-value" style={{ minWidth: 32, textAlign: 'right' }}>{thirstMultiplier.toFixed(1)}x</span>
        </div>
      </div>
    </div>
  );
}
