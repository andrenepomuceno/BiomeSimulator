import { SPECIES_INFO, STATE_NAMES, PLANT_STAGE_NAMES } from '../utils/terrainColors';
import { getPlantByTypeId } from '../engine/plantSpecies';

// Maps plant stage index to the corresponding emoji key on the plant species emoji object
const STAGE_TO_EMOJI_KEY = {
  1: 'seed',
  2: 'youngSprout',
  3: 'adultSprout',
  4: 'adult',
  5: 'fruit',
};

export function buildAnimalEntry(animal) {
  const info = SPECIES_INFO[animal.species] || { emoji: '🐾', name: animal.species || 'Unknown' };
  return {
    key: `A-${animal.id}`,
    entityType: 'animal',
    groupKey: `animal:${animal.species || info.name}`,
    groupLabel: info.name,
    groupEmoji: info.emoji,
    idLabel: `#${animal.id}`,
    speciesLabel: info.name,
    emoji: info.emoji,
    x: animal.x,
    y: animal.y,
    summary: `${STATE_NAMES[animal.state] || 'Unknown'} · HP ${Math.round(animal.hp)}`,
    searchable: `${info.name} ${animal.species || ''} ${animal.id}`.toLowerCase(),
    raw: animal,
  };
}

export function buildPlantEntry(typeId, stage, x, y) {
  const plant = getPlantByTypeId(typeId);
  const speciesLabel = plant?.name || `Plant ${typeId}`;
  const stageLabel = PLANT_STAGE_NAMES[stage] || `Stage ${stage}`;
  const emojiKey = STAGE_TO_EMOJI_KEY[stage];
  const emoji = (emojiKey && plant?.emoji?.[emojiKey]) || plant?.emoji?.adult || plant?.emoji?.youngSprout || '🌿';
  return {
    key: `P-${x}-${y}`,
    entityType: 'plant',
    groupKey: `plant:${typeId}`,
    groupLabel: speciesLabel,
    groupEmoji: emoji,
    idLabel: `P(${x},${y})`,
    speciesLabel,
    emoji,
    x,
    y,
    summary: `${stageLabel} · Tile (${x}, ${y})`,
    searchable: `${speciesLabel} p ${x} ${y} ${typeId}`.toLowerCase(),
    raw: { type: typeId, stage },
  };
}

const ITEM_TYPE_NAMES = { 1: 'Meat', 2: 'Fruit', 3: 'Seed' };
const ITEM_TYPE_EMOJIS = { 1: '🥩', 2: '🍑', 3: '🌰' };

export function buildItemEntry(item) {
  const typeName = ITEM_TYPE_NAMES[item.type] || 'Item';
  const emoji = ITEM_TYPE_EMOJIS[item.type] || '📦';
  let sourceLabel = '';
  if (item.source != null) {
    if (item.type === 1) {
      const info = SPECIES_INFO[item.source];
      sourceLabel = info ? info.name : String(item.source);
    } else {
      sourceLabel = '(plant)';
    }
  }
  return {
    key: `I-${item.id}`,
    entityType: 'item',
    groupKey: `item:${item.type}`,
    groupLabel: typeName,
    groupEmoji: emoji,
    idLabel: `#${item.id}`,
    speciesLabel: typeName,
    emoji,
    x: item.x,
    y: item.y,
    summary: `${sourceLabel ? `from ${sourceLabel} ` : ''}· Tile (${item.x}, ${item.y})`,
    searchable: `${typeName} item ${item.id} ${item.x} ${item.y}`.toLowerCase(),
    raw: item,
  };
}
