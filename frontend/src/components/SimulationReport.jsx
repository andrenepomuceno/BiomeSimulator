/**
 * SimulationReport — full-screen modal with historical analytics of the simulation.
 */
import React, { useMemo, useState } from 'react';
import useSimStore from '../store/simulationStore';
import { ANIMAL_HEX_COLORS, SPECIES_INFO, PLANT_TYPE_NAMES } from '../utils/terrainColors';
import { buildSimulationReportText, deriveSimulationReportData, DIET_GROUPS } from '../utils/simulationReportExport';
import { buildPlantChartColors, buildPlantChartEmojis } from '../engine/plantSpecies';
import {
  Chart as ChartJS,
  LineElement, PointElement, LinearScale, CategoryScale,
  Legend, Tooltip, Filler, Title,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { DIET_COLORS } from '../constants/statusColors';
import { resolveTicksPerDay, ticksToDay } from '../utils/time';

ChartJS.register(
  LineElement, PointElement, LinearScale, CategoryScale,
  Legend, Tooltip, Filler, Title,
);

const PLANT_COLORS_MAP = buildPlantChartColors();

const PLANT_EMOJIS = buildPlantChartEmojis();

const TABS = [
  { id: 'population', label: '🐾 Population' },
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
  const { statsHistory, clock } = useSimStore();
  const ticksPerDay = resolveTicksPerDay(clock.ticks_per_day);

  // Derive all chart data from statsHistory
  const data = useMemo(
    () => deriveSimulationReportData(statsHistory, ticksPerDay),
    [statsHistory, ticksPerDay]
  );

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
          borderColor: ANIMAL_HEX_COLORS[k],
          backgroundColor: ANIMAL_HEX_COLORS[k] + '22',
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
                    <span style={{ color: ANIMAL_HEX_COLORS[k] }}>{SPECIES_INFO[k].emoji}</span>{' '}
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

  function renderEcosystemSection() {
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
        <div className="report-chart-section">
          <h6>Extinction Events</h6>
          {data.extinctions.length > 0 ? (
            <div className="report-events">
              {data.extinctions.map((ev, i) => (
                <div key={i} className="report-event">
                  <span className="report-event-icon">💀</span>
                  <span>{SPECIES_INFO[ev.species]?.emoji} {SPECIES_INFO[ev.species]?.name}</span>
                  <span className="report-event-tick">tick {ev.tick}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="report-empty" style={{ padding: '12px 0 0', textAlign: 'left' }}>No extinctions recorded.</p>
          )}
        </div>
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

    const daysElapsed = ticksToDay(data.ticks[data.ticks.length - 1] || 0, ticksPerDay);
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
        {renderEcosystemSection()}
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
    const lastTick = data.ticks[data.ticks.length - 1] || 0;
    const days = ticksToDay(lastTick, ticksPerDay);
    a.download = `biome-simulator-report-day${days}.txt`;
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
          {tab === 'flora' && renderFloraTab()}
          {tab === 'summary' && renderSummaryTab()}
        </div>
      </div>
    </div>
  );
}
