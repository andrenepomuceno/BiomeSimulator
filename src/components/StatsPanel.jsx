/**
 * StatsPanel — live population counters and chart.
 */
import React, { useEffect, useState, useMemo } from 'react';
import useSimStore from '../store/simulationStore';
import { ANIMAL_HEX_COLORS, SPECIES_INFO } from '../utils/terrainColors';
import { getEffectiveAnimalPopulationCap } from '../engine/animalSpecies';
import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Legend, Tooltip } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { STATS_PANEL_HISTORY_LIMIT } from '../constants/simulation';
import { getBadgeToneStyle, getPopulationStatusColor, getPopulationStatusTone } from '../constants/statusColors';
import { buildPlantChartColors, buildPlantChartEmojis, getPlantByTypeId } from '../engine/plantSpecies.js';

const PLANT_COLORS = buildPlantChartColors();  // typeId → hex color
const PLANT_EMOJIS = buildPlantChartEmojis();  // typeId → emoji

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Legend, Tooltip);

/**
 * External HTML legend rendered below a Line chart so it never clips the canvas.
 */
function ChartLegend({ datasets }) {
  if (!datasets || datasets.length === 0) return null;
  return (
    <div className="chart-legend-external" role="list">
      {datasets.map((ds, i) => (
        <span key={i} className="chart-legend-item" role="listitem">
          <span className="chart-legend-swatch" style={{ background: ds.borderColor }} />
          {ds.label}
        </span>
      ))}
    </div>
  );
}

export default function StatsPanel() {
  const {
    stats,
    clock,
    hungerMultiplier,
    thirstMultiplier,
    worker,
    profilingEnabled,
    profiling,
  } = useSimStore();
  const speciesKeys = useMemo(() => Object.keys(SPECIES_INFO), []);
  const plantTypeKeys = useMemo(() => Object.keys(PLANT_COLORS).map(Number).sort((a, b) => a - b), []);
  const [statsTab, setStatsTab] = useState('population');
  const [history, setHistory] = useState(() => {
    const h = {
      ticks: [],
      plants: [],
      animalsTotal: [],
      performance: {
        tickMs: [],
        fps: [],
      },
      plantTypes: {},
    };
    speciesKeys.forEach(k => {
      h[k] = [];
    });
    plantTypeKeys.forEach(typeId => {
      h.plantTypes[typeId] = [];
    });
    return h;
  });

  useEffect(() => {
    setHistory(prev => {
      const animalsTotalNow = speciesKeys.reduce(
        (sum, k) => sum + ((stats.species && stats.species[k]) || 0), 0,
      );
      const newH = {
        ticks: [...prev.ticks, clock.tick].slice(-STATS_PANEL_HISTORY_LIMIT),
        plants: [...(prev.plants || []), stats.plants_total || 0].slice(-STATS_PANEL_HISTORY_LIMIT),
        animalsTotal: [...(prev.animalsTotal || []), animalsTotalNow].slice(-STATS_PANEL_HISTORY_LIMIT),
        performance: {
          tickMs: [...(prev.performance?.tickMs || []), profiling?.engine?.tickMs || stats.tickMs || 0].slice(-STATS_PANEL_HISTORY_LIMIT),
          fps: [...(prev.performance?.fps || []), profiling?.renderer?.fps || 0].slice(-STATS_PANEL_HISTORY_LIMIT),
        },
        plantTypes: {},
      };

      speciesKeys.forEach(k => {
        newH[k] = [...(prev[k] || []), (stats.species && stats.species[k]) || 0].slice(-STATS_PANEL_HISTORY_LIMIT);
      });

      const allPlantTypeKeys = new Set([
        ...Object.keys(prev.plantTypes || {}),
        ...Object.keys(stats.plant_types || {}),
        ...plantTypeKeys.map(String),
      ]);

      allPlantTypeKeys.forEach(typeId => {
        newH.plantTypes[typeId] = [
          ...(prev.plantTypes?.[typeId] || []),
          (stats.plant_types && stats.plant_types[typeId]) || 0,
        ].slice(-STATS_PANEL_HISTORY_LIMIT);
      });

      return newH;
    });
  }, [clock.tick]);

  const animalChartData = {
    labels: history.ticks.map(() => ''),
    datasets: speciesKeys.map(k => ({
        label: SPECIES_INFO[k].name,
        data: history[k] || [],
        borderColor: ANIMAL_HEX_COLORS[k],
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.3,
      })),
  };

  const plantPopulationChartData = {
    labels: history.ticks.map(() => ''),
    datasets: plantTypeKeys
      .filter(typeId => {
        const values = history.plantTypes?.[typeId] || [];
        return values.some(v => v > 0);
      })
      .map(typeId => {
        const species = getPlantByTypeId(typeId);
        const color = PLANT_COLORS[typeId] || '#88cc44';
        return {
          label: species?.name || `Plant ${typeId}`,
          data: history.plantTypes?.[typeId] || [],
          borderColor: color,
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.3,
        };
      }),
  };

  const totalChartData = {
    labels: history.ticks.map(() => ''),
    datasets: [
      {
        label: 'Animals',
        data: history.animalsTotal || [],
        borderColor: '#7fc8ff',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
      },
      {
        label: 'Plants',
        data: history.plants || [],
        borderColor: '#88cc44',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
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

  const performanceChartData = {
    labels: history.ticks.map(() => ''),
    datasets: [
      {
        label: 'Tick ms',
        data: history.performance.tickMs,
        borderColor: '#7fc8ff',
        borderWidth: 1.7,
        pointRadius: 0,
        tension: 0.3,
        yAxisID: 'y',
      },
      {
        label: 'FPS',
        data: history.performance.fps,
        borderColor: '#f6cc6a',
        borderWidth: 1.7,
        pointRadius: 0,
        tension: 0.3,
        yAxisID: 'y1',
      },
    ],
  };

  const performanceChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: { display: false },
      y: {
        type: 'linear',
        position: 'left',
        ticks: { color: '#7fc8ff', font: { size: 9 } },
        grid: { color: '#1a1a3e' },
        beginAtZero: true,
      },
      y1: {
        type: 'linear',
        position: 'right',
        ticks: { color: '#f6cc6a', font: { size: 9 } },
        grid: { drawOnChartArea: false },
        beginAtZero: true,
      },
    },
    animation: false,
  };

  const gameConfig = useSimStore(s => s.gameConfig);
  const speciesCaps = useMemo(() => {
    const globalMax = gameConfig?.max_animal_population || 0;
    const caps = {};
    for (const k of speciesKeys) {
      caps[k] = getEffectiveAnimalPopulationCap(k, globalMax);
    }
    return caps;
  }, [gameConfig?.max_animal_population]);

  return (
    <div className="sidebar-section">
      {/* Tab bar */}
      <div className="stats-tabs" role="tablist" aria-label="Stats sections">
        <button
          className={`stats-tab${statsTab === 'population' ? ' active' : ''}`}
          onClick={() => setStatsTab('population')}
          role="tab"
          aria-selected={statsTab === 'population'}
        >
          Animals
        </button>
        <button
          className={`stats-tab${statsTab === 'plants' ? ' active' : ''}`}
          onClick={() => setStatsTab('plants')}
          role="tab"
          aria-selected={statsTab === 'plants'}
        >
          Plants
        </button>
        <button
          className={`stats-tab${statsTab === 'chart' ? ' active' : ''}`}
          onClick={() => setStatsTab('chart')}
          role="tab"
          aria-selected={statsTab === 'chart'}
        >
          Chart
        </button>
        <button
          className={`stats-tab${statsTab === 'settings' ? ' active' : ''}`}
          onClick={() => setStatsTab('settings')}
          role="tab"
          aria-selected={statsTab === 'settings'}
        >
          Settings
        </button>
      </div>

      {/* === Population tab === */}
      {statsTab === 'population' && (
        <div className="stats-tab-panel">
          {speciesKeys.map(k => {
        const count = (stats.species && stats.species[k]) || 0;
        const cap = speciesCaps[k] || 0;
        const pct = cap > 0 ? count / cap : 0;
        const speciesColor = ANIMAL_HEX_COLORS[k] || '#66cc66';
        const barColor = getPopulationStatusColor(pct, speciesColor);
        const tone = getPopulationStatusTone(pct);
        const statusLabel = tone === 'danger' ? 'High pressure' : tone === 'warning' ? 'Watch' : 'Stable';
        return (
          <div key={k} className="stats-species-row">
            <div className="stat-row">
              <span className="stat-label">{SPECIES_INFO[k].emoji} {SPECIES_INFO[k].name}</span>
              <span className="stat-value" style={{ color: speciesColor }}>
                {count}<span style={{ color: '#666', fontSize: '0.7rem' }}>/{cap}</span>
              </span>
            </div>
            <div className="stats-species-meta">
              <span className="stats-status-badge" style={getBadgeToneStyle(tone)}>{statusLabel}</span>
              <span className="stats-species-percent">{Math.round(pct * 100)}%</span>
            </div>
            <div className="stats-progress-track">
              <div className="stats-progress-fill" style={{ width: `${Math.min(100, pct * 100)}%`, background: barColor }} />
            </div>
          </div>
        );
      })}
        </div>
      )}

      {/* === Plants tab === */}
      {statsTab === 'plants' && (
        <div className="stats-tab-panel">
          <div className="stat-row" style={{ marginBottom: 4 }}>
            <span className="stat-label">🌿 Total plants</span>
            <span className="stat-value" style={{ color: '#88cc44' }}>{stats.plants_total || 0}</span>
          </div>
          <div className="stat-row" style={{ marginBottom: 10 }}>
            <span className="stat-label">🍎 Fruits</span>
            <span className="stat-value" style={{ color: '#ff8844' }}>{stats.fruits || 0}</span>
          </div>
          {plantTypeKeys
            .map(typeId => {
              const count = (stats.plant_types && stats.plant_types[typeId]) || 0;
              return [typeId, count];
            })
            .sort((a, b) => b[1] - a[1])
            .map(([typeId, count]) => {
              const sp = getPlantByTypeId(typeId);
              if (!sp) return null;
              const color = PLANT_COLORS[typeId] || '#88cc44';
              const emoji = PLANT_EMOJIS[typeId] || '🌱';
              const pct = stats.plants_total > 0 ? count / stats.plants_total : 0;
              const tone = count > 0 ? 'success' : 'danger';
              const barColor = getPopulationStatusColor(pct, color);
              const statusLabel = count > 0 ? 'Alive' : 'Extinct';
              return (
                <div key={typeId} className="stats-species-row">
                  <div className="stat-row">
                    <span className="stat-label">{emoji} {sp.name}</span>
                    <span className="stat-value" style={{ color }}>
                      {count}<span style={{ color: '#666', fontSize: '0.7rem' }}>/{stats.plants_total || 0}</span>
                    </span>
                  </div>
                  <div className="stats-species-meta">
                    <span className="stats-status-badge" style={getBadgeToneStyle(tone)}>{statusLabel}</span>
                    <span className="stats-species-percent">{Math.round(pct * 100)}%</span>
                  </div>
                  <div className="stats-progress-track">
                    <div className="stats-progress-fill" style={{ width: `${Math.min(100, pct * 100)}%`, background: barColor }} />
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* === Chart tab === */}
      {statsTab === 'chart' && (
        <div className="stats-tab-panel">
          <h6 className="stats-section-title">Total Population</h6>
          <div className="stats-chart-block-compact" style={{ marginBottom: 4 }}>
            <Line data={totalChartData} options={chartOptions} />
          </div>
          <ChartLegend datasets={totalChartData.datasets} />
          <h6 className="stats-section-title" style={{ marginTop: 10 }}>Animal Population</h6>
          <div className="stats-chart-block" style={{ marginBottom: 4 }}>
            <Line data={animalChartData} options={chartOptions} />
          </div>
          <ChartLegend datasets={animalChartData.datasets} />
          <h6 className="stats-section-title" style={{ marginTop: 10 }}>Plant Population</h6>
          {plantPopulationChartData.datasets.length > 0 ? (
            <>
              <div className="stats-chart-block">
                <Line data={plantPopulationChartData} options={chartOptions} />
              </div>
              <ChartLegend datasets={plantPopulationChartData.datasets} />
            </>
          ) : (
            <p className="report-empty" style={{ padding: '10px 0 4px', textAlign: 'left' }}>No plant population history yet.</p>
          )}
        </div>
      )}

      {/* === Settings tab === */}
      {statsTab === 'settings' && (
        <div className="stats-tab-panel">
          <h6 className="stats-section-title">Rate Multipliers</h6>
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

      <h6 className="stats-section-title" style={{ marginTop: 12 }}>Performance</h6>
      <div className="stat-row" style={{ marginBottom: 6 }}>
        <span className="stat-label">Profiling</span>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#aaa', fontSize: '0.82rem' }}>
          <input
            type="checkbox"
            checked={profilingEnabled}
            onChange={(e) => {
              const enabled = e.target.checked;
              useSimStore.getState().setProfilingEnabled(enabled);
              if (worker) worker.postMessage({ cmd: 'setProfiling', enabled });
            }}
          />
          High-res
        </label>
      </div>

      <div className="stats-chart-block-compact">
        <Line data={performanceChartData} options={performanceChartOptions} />
      </div>
      <ChartLegend datasets={performanceChartData.datasets} />

      <div className="stat-row">
        <span className="stat-label">Engine Tick</span>
        <span className="stat-value" style={{ color: '#7fc8ff' }}>
          {(profiling?.engine?.tickMs || stats.tickMs || 0).toFixed(2)}ms
        </span>
      </div>
      <div className="stat-row">
        <span className="stat-label">Plants / AI / Cleanup</span>
        <span className="stat-value" style={{ color: '#9ccf6a', fontSize: '0.75rem' }}>
          {(profiling?.engine?.phases?.plantsMs || 0).toFixed(1)} / {(profiling?.engine?.phases?.behaviorMs || 0).toFixed(1)} / {(profiling?.engine?.phases?.cleanupMs || 0).toFixed(1)}
        </span>
      </div>
      <div className="stat-row">
        <span className="stat-label">FPS / Frame</span>
        <span className="stat-value" style={{ color: '#f6cc6a' }}>
          {(profiling?.renderer?.fps || 0).toFixed(0)} / {(profiling?.renderer?.frameMs || 0).toFixed(1)}ms
        </span>
      </div>
      <div className="stat-row">
        <span className="stat-label">Render Entity / Plant</span>
        <span className="stat-value" style={{ color: '#d6a8ff', fontSize: '0.75rem' }}>
          {(profiling?.renderer?.entityUpdateMs || 0).toFixed(1)} / {(profiling?.renderer?.plantUpdateMs || 0).toFixed(1)}
        </span>
      </div>
        </div>
      )}
    </div>
  );
}
