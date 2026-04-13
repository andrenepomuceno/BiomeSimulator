/**
 * SimulationReport — full-screen modal with historical analytics of the simulation.
 */
import React, { useMemo, useState } from 'react';
import useSimStore from '../store/simulationStore';
import { SPECIES_INFO, PLANT_TYPE_NAMES } from '../utils/terrainColors';
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
  RABBIT:   '#66cc66',
  SQUIRREL: '#cc8844',
  BEETLE:   '#556633',
  GOAT:     '#bbbbbb',
  DEER:     '#cc9955',
  FOX:      '#dd8833',
  WOLF:     '#dd4444',
  BOAR:     '#885533',
  BEAR:     '#8B4513',
  RACCOON:  '#778899',
  CROW:     '#555566',
};

const DIET_GROUPS = {
  Herbivore: ['RABBIT', 'SQUIRREL', 'BEETLE', 'GOAT', 'DEER'],
  Carnivore: ['FOX', 'WOLF'],
  Omnivore:  ['BOAR', 'BEAR', 'RACCOON', 'CROW'],
};

const DIET_COLORS = {
  Herbivore: '#66cc66',
  Carnivore: '#dd4444',
  Omnivore:  '#cc8844',
};

const PLANT_COLORS_MAP = {
  1: '#7fbb5c', // Grass
  2: '#ff6b6b', // Strawberry
  3: '#6b6bff', // Blueberry
  4: '#66aa44', // Apple Tree
  5: '#ffaa33', // Mango Tree
  6: '#ff8844', // Carrot
  7: '#ffdd44', // Sunflower
  8: '#ff4444', // Tomato
  9: '#aa8866', // Mushroom
  10: '#8B6914', // Oak Tree
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

    return {
      ticks, tickLabels, speciesKeys, speciesData,
      dietData, plantsTotal, fruits, plantTypes, latest,
      peaks, mins, totalAnimals, diversity, extinctions,
    };
  }, [statsHistory, clock.ticks_per_day]);

  if (!open) return null;

  const noData = !data;

  function renderPopulationTab() {
    if (noData) return <p className="report-empty">No history data yet. Start the simulation first.</p>;

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
      <div className="report-chart-section">
        <h6>Species Population Over Time</h6>
        <div className="report-chart-container" style={{ height: 320 }}>
          <Line data={chartData} options={CHART_BASE} />
        </div>
      </div>
    );
  }

  function renderEcosystemTab() {
    if (noData) return <p className="report-empty">No history data yet.</p>;

    const dietChart = {
      labels: data.tickLabels,
      datasets: Object.entries(DIET_GROUPS).map(([diet]) => ({
        label: diet + 's',
        data: data.dietData[diet],
        borderColor: DIET_COLORS[diet],
        backgroundColor: DIET_COLORS[diet] + '33',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
        fill: true,
      })),
    };

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
          <h6>Diet Group Balance</h6>
          <div className="report-chart-container" style={{ height: 260 }}>
            <Line data={dietChart} options={CHART_BASE} />
          </div>
        </div>
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

    // Plant type breakdown doughnut
    const ptEntries = Object.entries(data.plantTypes).filter(([, v]) => v > 0);
    const doughnutData = {
      labels: ptEntries.map(([k]) => PLANT_TYPE_NAMES[k] || `Type ${k}`),
      datasets: [{
        data: ptEntries.map(([, v]) => v),
        backgroundColor: ptEntries.map(([k]) => PLANT_COLORS_MAP[k] || '#888'),
        borderColor: '#16213e',
        borderWidth: 2,
      }],
    };

    const doughnutOpts = {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#ccc', font: { size: 11 }, padding: 8, usePointStyle: true },
        },
      },
    };

    return (
      <>
        <div className="report-chart-section">
          <h6>Plant Population Over Time</h6>
          <div className="report-chart-container" style={{ height: 260 }}>
            <Line data={floraChart} options={CHART_BASE} />
          </div>
        </div>
        {ptEntries.length > 0 && (
          <div className="report-chart-section">
            <h6>Current Plant Distribution</h6>
            <div className="report-chart-container" style={{ height: 220 }}>
              <Doughnut data={doughnutData} options={doughnutOpts} />
            </div>
          </div>
        )}
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

        <h6 style={{ marginTop: 20 }}>Species Details</h6>
        <div className="report-species-table">
          <div className="report-species-header">
            <span>Species</span>
            <span>Current</span>
            <span>Peak</span>
            <span>Min</span>
            <span>Status</span>
          </div>
          {data.speciesKeys.map(k => {
            const current = data.speciesData[k][data.speciesData[k].length - 1] || 0;
            const extinct = data.peaks[k] > 0 && current === 0;
            return (
              <div key={k} className={`report-species-row ${extinct ? 'extinct' : ''}`}>
                <span>
                  <span style={{ color: SPECIES_COLORS[k] }}>{SPECIES_INFO[k].emoji}</span>{' '}
                  {SPECIES_INFO[k].name}
                </span>
                <span>{current}</span>
                <span>{data.peaks[k]}</span>
                <span>{data.mins[k]}</span>
                <span className={extinct ? 'text-danger' : current > 0 ? 'text-success' : 'text-muted'}>
                  {data.peaks[k] === 0 ? 'Never spawned' : extinct ? 'Extinct' : 'Alive'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function exportToText() {
    if (noData) return;

    const tpd = clock.ticks_per_day || 200;
    const lastTick = data.ticks[data.ticks.length - 1] || 0;
    const days = Math.floor(lastTick / tpd);
    const currentTotal = data.totalAnimals[data.totalAnimals.length - 1] || 0;
    const peakTotal = Math.max(...data.totalAnimals);
    const currentDiversity = data.diversity[data.diversity.length - 1] || 0;
    const peakDiversity = Math.max(...data.diversity);
    const currentPlants = data.plantsTotal[data.plantsTotal.length - 1] || 0;
    const peakPlants = Math.max(...data.plantsTotal);
    const currentFruits = data.fruits[data.fruits.length - 1] || 0;

    const lines = [];
    lines.push('=== ECOGAME SIMULATION REPORT ===');
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push('');

    // ========== SUMMARY TAB ==========
    lines.push('╔══════════════════════════════════╗');
    lines.push('║         📊 SUMMARY               ║');
    lines.push('╚══════════════════════════════════╝');
    lines.push('');
    lines.push(`Simulation Time:  ${days} days (${lastTick.toLocaleString()} ticks)`);
    lines.push(`Total Animals:    ${currentTotal} (Peak: ${peakTotal})`);
    lines.push(`Living Plants:    ${currentPlants.toLocaleString()} (Peak: ${peakPlants.toLocaleString()})`);
    lines.push(`Fruiting Plants:  ${currentFruits.toLocaleString()}`);
    lines.push(`Biodiversity:     ${currentDiversity.toFixed(3)} (Peak: ${peakDiversity.toFixed(3)})`);
    const activeCount = data.speciesKeys.filter(k => (data.speciesData[k][data.speciesData[k].length - 1] || 0) > 0).length;
    lines.push(`Active Species:   ${activeCount} / ${data.speciesKeys.length}`);
    lines.push(`Extinction Events: ${data.extinctions.length}`);
    lines.push('');

    // Species details table
    lines.push('Species Details:');
    lines.push('  ' + 'Species'.padEnd(14) + 'Current'.padStart(9) + 'Peak'.padStart(9) + 'Min'.padStart(9) + '  Status');
    lines.push('  ' + '-'.repeat(54));
    data.speciesKeys.forEach(k => {
      const current = data.speciesData[k][data.speciesData[k].length - 1] || 0;
      const extinct = data.peaks[k] > 0 && current === 0;
      const status = data.peaks[k] === 0 ? 'Never spawned' : extinct ? 'Extinct' : 'Alive';
      lines.push(
        '  ' + (SPECIES_INFO[k]?.name || k).padEnd(14) +
        String(current).padStart(9) +
        String(data.peaks[k]).padStart(9) +
        String(data.mins[k]).padStart(9) +
        '  ' + status
      );
    });
    lines.push('');

    // ========== POPULATION TAB ==========
    lines.push('╔══════════════════════════════════╗');
    lines.push('║     🐾 POPULATION OVER TIME      ║');
    lines.push('╚══════════════════════════════════╝');
    lines.push('');

    // Per-species population timeline
    const visibleSpecies = data.speciesKeys.filter(k => data.peaks[k] > 0);
    const step = Math.max(1, Math.floor(data.ticks.length / 150));

    // Header row
    const spNames = visibleSpecies.map(k => (SPECIES_INFO[k]?.name || k).slice(0, 8));
    let popHeader = '  ' + 'Day'.padStart(5) + 'Tick'.padStart(8);
    spNames.forEach(n => { popHeader += n.padStart(9); });
    popHeader += 'Total'.padStart(8);
    lines.push(popHeader);
    lines.push('  ' + '-'.repeat(popHeader.length - 2));

    for (let i = 0; i < data.ticks.length; i += step) {
      const day = Math.floor(data.ticks[i] / tpd);
      let row = '  ' + String(day).padStart(5) + String(data.ticks[i]).padStart(8);
      visibleSpecies.forEach(k => {
        row += String(data.speciesData[k][i]).padStart(9);
      });
      row += String(data.totalAnimals[i]).padStart(8);
      lines.push(row);
    }
    // Always include last entry
    const lastIdx = data.ticks.length - 1;
    if (lastIdx % step !== 0) {
      const day = Math.floor(data.ticks[lastIdx] / tpd);
      let row = '  ' + String(day).padStart(5) + String(data.ticks[lastIdx]).padStart(8);
      visibleSpecies.forEach(k => {
        row += String(data.speciesData[k][lastIdx]).padStart(9);
      });
      row += String(data.totalAnimals[lastIdx]).padStart(8);
      lines.push(row);
    }
    lines.push('');

    // ========== ECOSYSTEM TAB ==========
    lines.push('╔══════════════════════════════════╗');
    lines.push('║      ⚖ ECOSYSTEM BALANCE         ║');
    lines.push('╚══════════════════════════════════╝');
    lines.push('');

    // Diet groups current
    lines.push('Diet Groups (current):');
    Object.entries(DIET_GROUPS).forEach(([diet, speciesList]) => {
      const total = speciesList.reduce((sum, sp) => {
        const arr = data.speciesData[sp];
        return sum + (arr[arr.length - 1] || 0);
      }, 0);
      const members = speciesList.map(sp => SPECIES_INFO[sp]?.name || sp).join(', ');
      lines.push(`  ${diet}: ${total}  (${members})`);
    });
    lines.push('');

    // Diet group + diversity timeline
    lines.push('Diet Group & Diversity Over Time:');
    const dietNames = Object.keys(DIET_GROUPS);
    let ecoHeader = '  ' + 'Day'.padStart(5) + 'Tick'.padStart(8);
    dietNames.forEach(d => { ecoHeader += d.slice(0, 9).padStart(11); });
    ecoHeader += 'Diversity'.padStart(11);
    lines.push(ecoHeader);
    lines.push('  ' + '-'.repeat(ecoHeader.length - 2));

    for (let i = 0; i < data.ticks.length; i += step) {
      const day = Math.floor(data.ticks[i] / tpd);
      let row = '  ' + String(day).padStart(5) + String(data.ticks[i]).padStart(8);
      dietNames.forEach(d => {
        row += String(data.dietData[d][i]).padStart(11);
      });
      row += data.diversity[i].toFixed(3).padStart(11);
      lines.push(row);
    }
    if (lastIdx % step !== 0) {
      const day = Math.floor(data.ticks[lastIdx] / tpd);
      let row = '  ' + String(day).padStart(5) + String(data.ticks[lastIdx]).padStart(8);
      dietNames.forEach(d => {
        row += String(data.dietData[d][lastIdx]).padStart(11);
      });
      row += data.diversity[lastIdx].toFixed(3).padStart(11);
      lines.push(row);
    }
    lines.push('');

    // Extinction log
    if (data.extinctions.length > 0) {
      lines.push('Extinction Events:');
      data.extinctions.forEach(ev => {
        const day = Math.floor(ev.tick / tpd);
        lines.push(`  Day ${day} (tick ${ev.tick}): ${SPECIES_INFO[ev.species]?.name || ev.species} went extinct`);
      });
      lines.push('');
    }

    // ========== FLORA TAB ==========
    lines.push('╔══════════════════════════════════╗');
    lines.push('║          🌿 FLORA                ║');
    lines.push('╚══════════════════════════════════╝');
    lines.push('');

    // Plant distribution
    const ptEntries = Object.entries(data.plantTypes).filter(([, v]) => v > 0);
    if (ptEntries.length > 0) {
      lines.push('Current Plant Distribution:');
      const plantTotal = ptEntries.reduce((s, [, v]) => s + v, 0);
      ptEntries.forEach(([k, v]) => {
        const pct = plantTotal > 0 ? ((v / plantTotal) * 100).toFixed(1) : '0.0';
        lines.push(`  ${(PLANT_TYPE_NAMES[k] || 'Type ' + k).padEnd(16)} ${String(v.toLocaleString()).padStart(8)}  (${pct}%)`);
      });
      lines.push('');
    }

    // Plant timeline
    lines.push('Plant Population Over Time:');
    let floraHeader = '  ' + 'Day'.padStart(5) + 'Tick'.padStart(8) + 'Plants'.padStart(9) + 'Fruiting'.padStart(10);
    lines.push(floraHeader);
    lines.push('  ' + '-'.repeat(floraHeader.length - 2));

    for (let i = 0; i < data.ticks.length; i += step) {
      const day = Math.floor(data.ticks[i] / tpd);
      lines.push(
        '  ' + String(day).padStart(5) +
        String(data.ticks[i]).padStart(8) +
        String(data.plantsTotal[i]).padStart(9) +
        String(data.fruits[i]).padStart(10)
      );
    }
    if (lastIdx % step !== 0) {
      const day = Math.floor(data.ticks[lastIdx] / tpd);
      lines.push(
        '  ' + String(day).padStart(5) +
        String(data.ticks[lastIdx]).padStart(8) +
        String(data.plantsTotal[lastIdx]).padStart(9) +
        String(data.fruits[lastIdx]).padStart(10)
      );
    }
    lines.push('');
    lines.push('=== END OF REPORT ===');

    const text = lines.join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
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
