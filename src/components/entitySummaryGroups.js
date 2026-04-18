export function matchesActiveSelection(entry, selectedEntity, selectedTile, selectedItem) {
  if (entry.entityType === 'animal') {
    return selectedEntity?.id === entry.raw.id;
  }
  if (entry.entityType === 'plant') {
    if (!selectedTile || !selectedTile.plant || selectedTile.plant.type === 0) return false;
    return selectedTile.x === entry.x && selectedTile.y === entry.y;
  }
  if (entry.entityType === 'item') {
    return selectedItem?.id === entry.raw.id;
  }
  return false;
}

export function buildEntitySummaryGroups(entries, selectedEntity, selectedTile, selectedItem) {
  const groups = new Map();

  for (const entry of entries) {
    const key = entry.groupKey || `${entry.entityType}:${entry.speciesLabel}`;
    const active = matchesActiveSelection(entry, selectedEntity, selectedTile, selectedItem);
    let group = groups.get(key);

    if (!group) {
      group = {
        key,
        label: entry.groupLabel || entry.speciesLabel,
        emoji: entry.groupEmoji || entry.emoji,
        entityType: entry.entityType,
        count: 0,
        entries: [],
        hasActive: false,
      };
      groups.set(key, group);
    }

    group.entries.push(entry);
    group.count += 1;
    group.hasActive = group.hasActive || active;
  }

  return Array.from(groups.values()).sort((left, right) => {
    const labelCompare = left.label.localeCompare(right.label, 'pt-BR', { sensitivity: 'base' });
    if (labelCompare !== 0) return labelCompare;
    return left.key.localeCompare(right.key);
  });
}