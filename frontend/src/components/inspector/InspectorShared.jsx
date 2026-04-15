import React, { useState } from 'react';
import { LifeStage } from '../../engine/entities';
import { formatGameDuration } from '../../utils/time';
import { ticksToGameMinutes } from '../../utils/gameTime.js';

export const DIRECTION_LABELS = { 0: '↓ Down', 1: '← Left', 2: '→ Right', 3: '↑ Up' };

export const ANIMAL_LIFE_STAGE_KEYS = Object.entries(LifeStage)
  .filter(([, value]) => Number.isInteger(value) && value >= 0)
  .sort(([, a], [, b]) => a - b)
  .map(([key]) => key);

export function formatPercent(value, digits = 0) {
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatTickDurationLabel(ticks, ticksPerDay) {
  return `${ticks} ticks (${formatGameDuration(ticksToGameMinutes(ticks, ticksPerDay))})`;
}

export function Bar({ label, value, max, color, icon }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="mb-1">
      <div className="d-flex justify-content-between" style={{ fontSize: '0.7rem' }}>
        <span className="text-muted">{icon} {label}</span>
        <span>{Math.round(value)} / {max}</span>
      </div>
      <div className="entity-bar">
        <div className="entity-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export function EnergyCostTable({ costs }) {
  const ACTION_LABELS = {
    IDLE: '💤 Idle', WALK: '🚶 Walk', RUN: '🏃 Run',
    EAT: '🍽️ Eat', DRINK: '💧 Drink', SLEEP: '😴 Sleep',
    ATTACK: '⚔️ Attack', MATE: '💕 Mate', FLEE: '🏃‍♂️ Flee',
  };

  return (
    <div className="inspector-detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2px 8px' }}>
      {Object.entries(costs).map(([action, cost]) => (
        <div key={action} className="d-flex justify-content-between">
          <span className="text-muted">{ACTION_LABELS[action] || action}</span>
          <span style={{ color: cost < 0 ? '#4ecdc4' : '#ff6b6b' }}>{cost > 0 ? `-${cost}` : `+${Math.abs(cost)}`}</span>
        </div>
      ))}
    </div>
  );
}

export function CollapsibleSection({ title, icon, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mt-2">
      <div
        className="d-flex justify-content-between align-items-center"
        style={{ cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setOpen((value) => !value)}
      >
        <h6 className="mb-0" style={{ fontSize: '0.75rem' }}>{icon} {title}</h6>
        <span style={{ fontSize: '0.7rem', color: '#777' }}>{open ? '▾' : '▸'}</span>
      </div>
      {open && <div className="mt-1">{children}</div>}
    </div>
  );
}
