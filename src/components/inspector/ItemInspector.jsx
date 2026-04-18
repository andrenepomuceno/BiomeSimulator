/**
 * ItemInspector — displays full details for a selected ground item (meat, fruit, or seed).
 */
import React from 'react';
import { PLANT_TYPE_NAMES, SPECIES_INFO } from '../../utils/terrainColors';
import { CollapsibleSection } from './InspectorShared.jsx';

const ITEM_TYPE_NAMES = { 1: 'Meat', 2: 'Fruit', 3: 'Seed' };
const ITEM_TYPE_EMOJIS = { 1: '🥩', 2: '🍑', 3: '🌰' };
const ITEM_NUTRITION = {
  1: { hunger: 65, energy: 20, hp: 12 },
  2: { hunger: 40, energy: 6,  hp: 6  },
  3: { hunger: 15, energy: 2,  hp: 2  },
};

function StatRow({ label, value, color }) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className="stat-value" style={color ? { color } : undefined}>{value}</span>
    </div>
  );
}

export default function ItemInspector({ item, clearSelection, onFocusEntity, clock, gameConfig }) {
  const typeName = ITEM_TYPE_NAMES[item.type] || 'Item';
  const emoji = ITEM_TYPE_EMOJIS[item.type] || '📦';
  const nutr = ITEM_NUTRITION[item.type] || {};

  const tick = clock?.tick ?? 0;
  const age = item.createdTick != null ? Math.max(0, tick - item.createdTick) : null;

  const meatDecay    = gameConfig?.item_meat_decay_ticks        ?? 300;
  const fruitToSeed  = gameConfig?.item_fruit_to_seed_ticks     ?? 200;
  const seedGermTicks = item.germinationTicks > 0
    ? item.germinationTicks
    : (gameConfig?.item_seed_germination_ticks ?? 400);
  const germChance = gameConfig?.item_seed_germination_chance ?? 0.20;

  let maxLife = null;
  let expiryLabel = null;
  let expiryEmoji = null;
  if (item.type === 1) { maxLife = meatDecay;    expiryLabel = 'Decays in';        expiryEmoji = '🦠'; }
  else if (item.type === 2) { maxLife = fruitToSeed; expiryLabel = 'Becomes seed in'; expiryEmoji = '🌰'; }
  else if (item.type === 3) { maxLife = seedGermTicks; expiryLabel = 'Germinates in'; expiryEmoji = '🌱'; }

  const remaining = maxLife != null && age != null ? Math.max(0, maxLife - age) : null;
  const agePct = maxLife != null && age != null ? Math.min(100, (age / maxLife) * 100) : 0;
  const barColor = agePct > 80 ? '#ff4444' : agePct > 50 ? '#ffaa33' : '#4ecdc4';

  // Resolve source display
  let sourceDisplay = null;
  if (item.source != null) {
    if (item.type === 1) {
      // Meat: source is a species name string
      const info = SPECIES_INFO[item.source];
      sourceDisplay = info ? `${info.emoji} ${info.name}` : String(item.source);
    } else {
      // Fruit / Seed: source is a plant typeId number
      const plantName = PLANT_TYPE_NAMES[item.source];
      sourceDisplay = plantName ? `${plantName}` : `Plant type ${item.source}`;
    }
  }

  return (
    <div className="sidebar-section entity-info">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0">
          {emoji} {typeName}{' '}
          <span style={{ color: '#666', fontWeight: 'normal' }}>#{item.id}</span>
        </h6>
        <div className="d-flex align-items-center gap-1">
          <button
            className="btn btn-sm btn-outline-info py-0 px-2"
            onClick={() => onFocusEntity?.(item)}
            disabled={!Number.isFinite(item.x) || !Number.isFinite(item.y)}
          >
            Focus
          </button>
          <button className="btn btn-sm btn-outline-secondary py-0 px-1" onClick={clearSelection}>✕</button>
        </div>
      </div>

      <CollapsibleSection title="Identity" icon="📍" defaultOpen={true}>
        <StatRow label="Type" value={`${emoji} ${typeName}`} />
        <StatRow label="Position" value={`(${item.x}, ${item.y})`} />
        {sourceDisplay && <StatRow label="Source" value={sourceDisplay} />}
        {age != null && <StatRow label="Age" value={`${age} ticks`} />}
        {item.createdTick != null && <StatRow label="Spawned at" value={`Tick ${item.createdTick}`} />}
      </CollapsibleSection>

      {maxLife != null && age != null && (
        <CollapsibleSection title="Lifetime" icon={expiryEmoji} defaultOpen={true}>
          <div className="mb-1">
            <div className="d-flex justify-content-between" style={{ fontSize: '0.7rem' }}>
              <span className="text-muted">{expiryLabel}</span>
              <span style={{ color: remaining === 0 ? '#ff4444' : undefined }}>
                {remaining} ticks
              </span>
            </div>
            <div className="entity-bar">
              <div className="entity-bar-fill" style={{ width: `${agePct}%`, background: barColor }} />
            </div>
          </div>
          <StatRow label="Total lifetime" value={`${maxLife} ticks`} />
        </CollapsibleSection>
      )}

      <CollapsibleSection title="Nutrition" icon="🍽️" defaultOpen={true}>
        <StatRow label="🍖 Hunger restored" value={`−${nutr.hunger ?? '?'}`} color="#ff6b6b" />
        <StatRow label="⚡ Energy gained"   value={`+${nutr.energy ?? '?'}`} color="#4ecdc4" />
        <StatRow label="❤️ HP gained"       value={`+${nutr.hp    ?? '?'}`} color="#ff4757" />
      </CollapsibleSection>

      {item.type === 3 && (
        <CollapsibleSection title="Germination" icon="🌱" defaultOpen={true}>
          <StatRow label="Success chance" value={`${Math.round(germChance * 100)}%`} />
          <StatRow label="Germ. window"   value={`${seedGermTicks} ticks`} />
          {remaining === 0 && (
            <StatRow label="Status" value="Ready to germinate" color="#88cc44" />
          )}
        </CollapsibleSection>
      )}
    </div>
  );
}
