/**
 * SimulationReport — full-screen modal with historical analytics of the simulation.
 */
import React, { useMemo, useState } from 'react';
import useSimStore from '../store/simulationStore';
import { SPECIES_INFO, PLANT_TYPE_NAMES } from '../utils/terrainColors';
import { buildSimulationReportText } from '../utils/simulationReportExport';
import {
  Chart as ChartJS,
  LineElement, PointElement, LinearScale, CategoryScale,
  Legend, Tooltip, Filler, Title, ArcElement, BarElement,
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(
  LineElement, PointElement, LinearScale, CategoryScale,
  Legend, Tooltip, Filler, Title, ArcElement, BarElement,
);

const SPECIES_COLORS = {
  RABBIT:      '#66cc66',
  SQUIRREL:    '#cc8844',
  BEETLE:      '#556633',
  GOAT:        '#bbbbbb',
  DEER:        '#cc9955',
  FOX:         '#dd8833',
  WOLF:        '#dd4444',
  BOAR:        '#885533',
  BEAR:        '#8B4513',
  RACCOON:     '#778899',
  CROW:        '#555566',
  MOSQUITO:    '#556655',
  CATERPILLAR: '#88bb33',
  CRICKET:     '#6f9933',
  LIZARD:      '#5a8f4b',
  SNAKE:       '#448844',
  HAWK:        '#aa6622',
  CROCODILE:   '#556b2f',
};

const DIET_GROUPS = {
  Herbivore: ['RABBIT', 'SQUIRREL', 'BEETLE', 'GOAT', 'DEER', 'MOSQUITO', 'CATERPILLAR', 'CRICKET'],
  Carnivore: ['FOX', 'WOLF', 'SNAKE', 'HAWK', 'CROCODILE'],
  Omnivore:  ['BOAR', 'BEAR', 'RACCOON', 'CROW', 'LIZARD'],
};

const DIET_COLORS = {
  Herbivore: '#66cc66',
  Carnivore: '#dd4444',
  Omnivore:  '#cc8844',
};

const PLANT_COLORS_MAP = {
  1: '#7fbb5c',  // Grass
  2: '#ff6b6b',  // Strawberry
  3: '#6b6bff',  // Blueberry
  4: '#66aa44',  // Apple Tree
  5: '#ffaa33',  // Mango Tree
  6: '#ff8844',  // Carrot
  7: '#ffdd44',  // Sunflower
  8: '#ff4444',  // Tomato
  9: '#aa8866',  // Mushroom
  10: '#8B6914', // Oak Tree
  11: '#88cc88', // Cactus
  12: '#44bb88', // Coconut Palm
  13: '#b08b57', // Potato
  14: '#dd4b39', // Chili Pepper
  15: '#7da34e', // Olive Tree
};

const PLANT_EMOJIS = {
  1: '🌱', 2: '🍓', 3: '🫐', 4: '🍎', 5: '🥭', 6: '🥕',
  7: '🌻', 8: '🍅', 9: '🍄', 10: '🌳', 11: '🌵', 12: '🌴',
  13: '🥔', 14: '🌶️', 15: '🫒',
};

const TABS = [
  { id: 'population', label: '🐾 Population' },
  { id: 'ecosystem',  label: '⚖ Ecosystem' },
  { id: 'flora',      label: '🌿 Flora' },
  { id: 'summary',    label: '📊 Summary' },
];

const CHART_BASE = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: { color: '#ccc', font: { size: 11 }, padding: 12, usePointStyle: true },
    },
  },
  scales: {
    x: {
      ticks: { color: '#777', font: { size: 9 }, maxTicksLimit: 12 },
      grid: { color: '#1a1a3e' },
    },
    y: {
      ticks: { color: '#999', font: { size: 10 } },
      grid: { color: '#1a1a3e' },
      beginAtZero: true,
    },
  },
};

export default function SimulationReport({ open, onClose }) {
  const [tab, setTab] = useState('population');
  const { statsHistory, stats, clock } = useSimStore();

  // Derive all chart data from statsHistory
  const data = useMemo(() => {
    if (!statsHistory || statsHistory.length === 0) return null;

    const ticks = statsHistory.map(s => s.tick);
    const tickLabels = ticks.map(t => {
      const day = Math.floor(t / (clock.ticks_per_day || 200));
      return `D${day}`;
    });

    // Species population over time
    const speciesKeys = Object.keys(SPECIES_INFO);
    const speciesData = {};
    speciesKeys.forEach(k => {
      speciesData[k] = statsHistory.map(s => (s.species && s.species[k]) || 0);
    });

    // Diet groups over time
    const dietData = {};
    Object.entries(DIET_GROUPS).forEach(([diet, speciesList]) => {
      dietData[diet] = statsHistory.map(s =>
        speciesList.reduce((sum, sp) => sum + ((s.species && s.species[sp]) || 0), 0)
      );
    });

    // Flora over time
    const plantsTotal = statsHistory.map(s => s.plants_total || 0);
    const fruits = statsHistory.map(s => s.fruits || 0);

    // Plant types at latest snapshot
    const latest = statsHistory[statsHistory.length - 1];
    const plantTypes = latest.plant_types || {};

    // Peak & min populations
    const peaks = {};
    const mins = {};
    speciesKeys.forEach(k => {
      const arr = speciesData[k];
      peaks[k] = Math.max(...arr);
      mins[k] = Math.min(...arr);
    });

    // Total animal count over time
    const totalAnimals = statsHistory.map(s =>
      speciesKeys.reduce((sum, k) => sum + ((s.species && s.species[k]) || 0), 0)
    );

    // Biodiversity index (Shannon) at each snapshot
    const diversity = statsHistory.map(s => {
      const counts = speciesKeys.map(k => (s.species && s.species[k]) || 0);
      const total = counts.reduce((a, b) => a + b, 0);
      if (total === 0) return 0;
      return -counts.reduce((sum, c) => {
        if (c === 0) return sum;
        const p = c / total;
        return sum + p * Math.log(p);
      }, 0);
    });

    // Extinction events (species dropping to 0 after being > 0)
    const extinctions = [];
    speciesKeys.forEach(k => {
      const arr = speciesData[k];
      for (let i = 1; i < arr.length; i++) {
        if (arr[i] === 0 && arr[i - 1] > 0) {
          extinctions.push({ species: k, tick: ticks[i] });
        }
      }
    });

    // --- Plant per-species data ---
    const plantTypeKeys = Object.keys(PLANT_TYPE_NAMES).filter(k => k !== '0');
    const plantSpeciesData = {};
    plantTypeKeys.forEach(k => {
      plantSpeciesData[k] = statsHistory.map(s => (s.plant_types && s.plant_types[k]) || 0);
    });
    const plantPeaks = {};
    const plantMins = {};
    plantTypeKeys.forEach(k => {
      const arr = plantSpeciesData[k];
      plantPeaks[k] = Math.max(...arr);
      plantMins[k] = Math.min(...arr);
    });

    // --- Plant events aggregation ---
    const plantBirthsTotal = statsHistory.map(s => {
      const ev = s.plant_events;
      if (!ev || !ev.births) return 0;
      return Object.values(ev.births).reduce((a, b) => a + b, 0);
    });
    const plantDeathsTotal = statsHistory.map(s => {
      const ev = s.plant_events;
      if (!ev) return 0;
      let sum = 0;
      for (const cat of ['deaths_terrain', 'deaths_water', 'deaths_age', 'deaths_eaten']) {
        if (ev[cat]) sum += Object.values(ev[cat]).reduce((a, b) => a + b, 0);
      }
      return sum;
    });
    const deathCauseTotals = { terrain: 0, water: 0, age: 0, eaten: 0 };
    statsHistory.forEach(s => {
      const ev = s.plant_events;
      if (!ev) return;
      if (ev.deaths_terrain) deathCauseTotals.terrain += Object.values(ev.deaths_terrain).reduce((a, b) => a + b, 0);
      if (ev.deaths_water) deathCauseTotals.water += Object.values(ev.deaths_water).reduce((a, b) => a + b, 0);
      if (ev.deaths_age) deathCauseTotals.age += Object.values(ev.deaths_age).reduce((a, b) => a + b, 0);
      if (ev.deaths_eaten) deathCauseTotals.eaten += Object.values(ev.deaths_eaten).reduce((a, b) => a + b, 0);
    });

    return {
      ticks, tickLabels, speciesKeys, speciesData,
      dietData, plantsTotal, fruits, plantTypes, latest,
      peaks, mins, totalAnimals, diversity, extinctions,
      plantTypeKeys, plantSpeciesData, plantPeaks, plantMins,
      plantBirthsTotal, plantDeathsTotal, deathCauseTotals,
    };
  }, [statsHistory, clock.ticks_per_day]);

  if (!open) return null;

  const noData = !data;

  function renderPopulationTab() {
    if (noData) return <p className="report-empty">No history data yet. Start the simulation first.</p>;

    const totalChart = {
      labels: data.tickLabels,
      datasets: [
        {
          label: 'Total Animals',
          data: data.totalAnimals,
          borderColor: '#eee',
          backgroundColor: '#eee22',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
          fill: false,
        },
        ...Object.entries(DIET_GROUPS).map(([diet]) => ({
          label: diet + 's',
          data: data.dietData[diet],
          borderColor: DIET_COLORS[diet],
          backgroundColor: DIET_COLORS[diet] + '33',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
          fill: true,
        })),
      ],
    };

    const chartData = {
      labels: data.tickLabels,
      datasets: data.speciesKeys
        .filter(k => data.peaks[k] > 0)
        .map(k => ({
          label: SPECIES_INFO[k].name,
          data: data.speciesData[k],
          borderColor: SPECIES_COLORS[k],
          backgroundColor: SPECIES_COLORS[k] + '22',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
          fill: false,
        })),
    };

    return (
      <>
        <div className="report-chart-section">
          <h6>Total Animal Population</h6>
          <div className="report-chart-container" style={{ height: 260 }}>
            <Line data={totalChart} options={CHART_BASE} />
          </div>
        </div>

        <div className="report-chart-section">
          <h6>Species Population Over Time</h6>
          <div className="report-chart-container" style={{ height: 320 }}>
            <Line data={chartData} options={CHART_BASE} />
          </div>
        </div>

        <div className="report-chart-section">
          <h6>Animal Species Details</h6>
          <div className="report-species-table">
            <div className="report-species-header">
              <span>Species</span>
              <span>Current</span>
              <span>Peak</span>
              <span>Min</span>
              <span>Diet</span>
              <span>Status</span>
            </div>
            {data.speciesKeys.map(k => {
              const current = data.speciesData[k][data.speciesData[k].length - 1] || 0;
              const extinct = data.peaks[k] > 0 && current === 0;
              const diet = Object.entries(DIET_GROUPS).find(([, list]) => list.includes(k));
              const dietName = diet ? diet[0] : '\u2014';
              return (
                <div key={k} className={`report-species-row ${extinct ? 'extinct' : ''}`}>
                  <span>
                    <span style={{ color: SPECIES_COLORS[k] }}>{SPECIES_INFO[k].emoji}</span>{' '}
                    {SPECIES_INFO[k].name}
                  </span>
                  <span>{current}</span>
                  <span>{data.peaks[k]}</span>
                  <span>{data.mins[k]}</span>
                  <span style={{ color: DIET_COLORS[dietName] || '#ccc' }}>{dietName}</span>
                  <span className={extinct ? 'text-danger' : current > 0 ? 'text-success' : 'text-muted'}>
                    {data.peaks[k] === 0 ? 'Never spawned' : extinct ? 'Extinct' : 'Alive'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </>
    );
  }

  function renderEcosystemTab() {
    if (noData) return <p className="report-empty">No history data yet.</p>;

    const diversityChart = {
      labels: data.tickLabels,
      datasets: [{
        label: 'Shannon Diversity Index',
        data: data.diversity,
        borderColor: '#53a8b6',
        backgroundColor: '#53a8b633',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
        fill: true,
      }],
    };

    return (
      <>
        <div className="report-chart-section">
          <h6>Biodiversity (Shannon Index)</h6>
          <div className="report-chart-container" style={{ height: 200 }}>
            <Line data={diversityChart} options={CHART_BASE} />
          </div>
        </div>
        {data.extinctions.length > 0 && (
          <div className="report-chart-section">
            <h6>Extinction Events</h6>
            <div className="report-events">
              {data.extinctions.map((ev, i) => (
                <div key={i} className="report-event">
                  <span className="report-event-icon">💀</span>
                  <span>{SPECIES_INFO[ev.species]?.emoji} {SPECIES_INFO[ev.species]?.name}</span>
                  <span className="report-event-tick">tick {ev.tick}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  }

  function renderFloraTab() {
    if (noData) return <p className="report-empty">No history data yet.</p>;

    const floraChart = {
      labels: data.tickLabels,
      datasets: [
        {
          label: 'Living Plants',
          data: data.plantsTotal,
          borderColor: '#88cc44',
          backgroundColor: '#88cc4433',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
          fill: true,
        },
        {
          label: 'Fruiting',
          data: data.fruits,
          borderColor: '#ff8844',
          backgroundColor: '#ff884433',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
          fill: true,
        },
      ],
    };

    return (
      <>
        <div className="report-chart-section">
          <h6>Plant Population Over Time</h6>
          <div className="report-chart-container" style={{ height: 260 }}>
            <Line data={floraChart} options={CHART_BASE} />
          </div>
        </div>

        {/* Per-species plant population over time */}
        <div className="report-chart-section">
          <h6>Plant Species Over Time</h6>
          <div className="report-chart-container" style={{ height: 320 }}>
            <Line data={{
              labels: data.tickLabels,
              datasets: data.plantTypeKeys
                .filter(k => data.plantPeaks[k] > 0)
                .map(k => ({
                  label: PLANT_TYPE_NAMES[k] || `Type ${k}`,
                  data: data.plantSpeciesData[k],
                  borderColor: PLANT_COLORS_MAP[k] || '#888',
                  backgroundColor: (PLANT_COLORS_MAP[k] || '#888') + '22',
                  borderWidth: 2,
                  pointRadius: 0,
                  tension: 0.3,
                  fill: false,
                })),
            }} options={CHART_BASE} />
          </div>
        </div>

        {/* Plant species detail table */}
        <div className="report-chart-section">
          <h6>Plant Species Details</h6>
          <div className="report-species-table">
            <div className="report-species-header">
              <span>Species</span>
              <span>Current</span>
              <span>Peak</span>
              <span>Min</span>
              <span>Status</span>
            </div>
            {data.plantTypeKeys.map(k => {
              const arr = data.plantSpeciesData[k];
              const current = arr[arr.length - 1] || 0;
              const peak = data.plantPeaks[k];
              const min = data.plantMins[k];
              const extinct = peak > 0 && current === 0;
              return (
                <div key={k} className={`report-species-row ${extinct ? 'extinct' : ''}`}>
                  <span>
                    <span style={{ color: PLANT_COLORS_MAP[k] }}>{PLANT_EMOJIS[k] || ''}</span>{' '}
                    {PLANT_TYPE_NAMES[k] || `Type ${k}`}
                  </span>
                  <span>{current.toLocaleString()}</span>
                  <span>{peak.toLocaleString()}</span>
                  <span>{min.toLocaleString()}</span>
                  <span className={extinct ? 'text-danger' : current > 0 ? 'text-success' : 'text-muted'}>
                    {peak === 0 ? 'Never seeded' : extinct ? 'Extinct' : 'Growing'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </>
    );
  }

  function renderSummaryTab() {
    if (noData) return <p className="report-empty">No history data yet.</p>;

    const daysElapsed = Math.floor((data.ticks[data.ticks.length - 1] || 0) / (clock.ticks_per_day || 200));
    const totalTicks = data.ticks[data.ticks.length - 1] || 0;
    const currentTotal = data.totalAnimals[data.totalAnimals.length - 1] || 0;
    const peakTotal = Math.max(...data.totalAnimals);
    const currentDiversity = data.diversity[data.diversity.length - 1] || 0;
    const peakDiversity = Math.max(...data.diversity);
    const currentPlants = data.plantsTotal[data.plantsTotal.length - 1] || 0;
    const peakPlants = Math.max(...data.plantsTotal);

    const activeSpecies = data.speciesKeys.filter(k => {
      const last = data.speciesData[k][data.speciesData[k].length - 1];
      return last > 0;
    });

    return (
      <div className="report-summary">
        <div className="report-cards">
          <div className="report-card">
            <div className="report-card-label">Simulation Time</div>
            <div className="report-card-value">{daysElapsed} days</div>
            <div className="report-card-sub">{totalTicks.toLocaleString()} ticks</div>
          </div>
          <div className="report-card">
            <div className="report-card-label">Total Animals</div>
            <div className="report-card-value">{currentTotal}</div>
            <div className="report-card-sub">Peak: {peakTotal}</div>
          </div>
          <div className="report-card">
            <div className="report-card-label">Living Plants</div>
            <div className="report-card-value">{currentPlants.toLocaleString()}</div>
            <div className="report-card-sub">Peak: {peakPlants.toLocaleString()}</div>
          </div>
          <div className="report-card">
            <div className="report-card-label">Biodiversity</div>
            <div className="report-card-value">{currentDiversity.toFixed(2)}</div>
            <div className="report-card-sub">Peak: {peakDiversity.toFixed(2)}</div>
          </div>
          <div className="report-card">
            <div className="report-card-label">Active Species</div>
            <div className="report-card-value">{activeSpecies.length} / {data.speciesKeys.length}</div>
            <div className="report-card-sub">Extinctions: {data.extinctions.length}</div>
          </div>
          <div className="report-card">
            <div className="report-card-label">Fruiting Plants</div>
            <div className="report-card-value">{(data.fruits[data.fruits.length - 1] || 0).toLocaleString()}</div>
            <div className="report-card-sub">Food sources</div>
          </div>
        </div>
      </div>
    );
  }

  function exportToText() {
    if (noData) return;
    const text = buildSimulationReportText(data, clock.ticks_per_day, new Date());
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const tpd = clock.ticks_per_day || 200;
    const lastTick = data.ticks[data.ticks.length - 1] || 0;
    const days = Math.floor(lastTick / tpd);
    a.download = `ecogame-report-day${days}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="report-overlay" onClick={onClose}>
      <div className="report-modal" onClick={e => e.stopPropagation()}>
        <div className="report-header">
          <h5>📈 Simulation Report</h5>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="btn btn-sm btn-outline-info"
              onClick={exportToText}
              disabled={noData}
              title="Export report as text file"
            >
              📄 Export
            </button>
            <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="report-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`report-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="report-body">
          {tab === 'population' && renderPopulationTab()}
          {tab === 'ecosystem' && renderEcosystemTab()}
          {tab === 'flora' && renderFloraTab()}
          {tab === 'summary' && renderSummaryTab()}
        </div>
      </div>
    </div>
  );
}
