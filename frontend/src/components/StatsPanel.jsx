/**
 * StatsPanel — live population counters and chart.
 */
import React, { useEffect, useState, useRef } from 'react';
import useSimStore from '../store/simulationStore';
import { SPECIES_INFO } from '../utils/terrainColors';
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
  const { stats, clock } = useSimStore();
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

  return (
    <div className="sidebar-section">
      <h6>Population</h6>
      {speciesKeys.map(k => (
        <div className="stat-row" key={k}>
          <span className="stat-label">{SPECIES_INFO[k].emoji} {SPECIES_INFO[k].name}</span>
          <span className="stat-value" style={{ color: SPECIES_CHART_COLORS[k] }}>
            {(stats.species && stats.species[k]) || 0}
          </span>
        </div>
      ))}
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
    </div>
  );
}
