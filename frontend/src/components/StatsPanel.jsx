/**
 * StatsPanel — live population counters and chart.
 */
import React, { useEffect, useState, useRef } from 'react';
import useSimStore from '../store/simulationStore';
import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Legend, Tooltip } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Legend, Tooltip);

export default function StatsPanel() {
  const { stats, clock } = useSimStore();
  const [history, setHistory] = useState({ herbs: [], carns: [], plants: [], ticks: [] });

  // Accumulate local history from incoming stats
  useEffect(() => {
    setHistory(prev => {
      const newH = { ...prev };
      newH.herbs = [...prev.herbs, stats.herbivores].slice(-200);
      newH.carns = [...prev.carns, stats.carnivores].slice(-200);
      newH.plants = [...prev.plants, stats.plants_total].slice(-200);
      newH.ticks = [...prev.ticks, clock.tick].slice(-200);
      return newH;
    });
  }, [clock.tick]);

  const chartData = {
    labels: history.ticks.map(t => ''),
    datasets: [
      {
        label: 'Herbivores',
        data: history.herbs,
        borderColor: '#44bb44',
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.3,
      },
      {
        label: 'Carnivores',
        data: history.carns,
        borderColor: '#dd4444',
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.3,
      },
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
      <div className="stat-row">
        <span className="stat-label">🐰 Herbivores</span>
        <span className="stat-value" style={{ color: '#44bb44' }}>{stats.herbivores}</span>
      </div>
      <div className="stat-row">
        <span className="stat-label">🐺 Carnivores</span>
        <span className="stat-value" style={{ color: '#dd4444' }}>{stats.carnivores}</span>
      </div>
      <div className="stat-row">
        <span className="stat-label">🌿 Plants</span>
        <span className="stat-value" style={{ color: '#88cc44' }}>{stats.plants_total}</span>
      </div>
      <div className="stat-row">
        <span className="stat-label">🍎 Fruits</span>
        <span className="stat-value" style={{ color: '#ff8844' }}>{stats.fruits}</span>
      </div>

      <div style={{ height: 120, marginTop: 8 }}>
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}
