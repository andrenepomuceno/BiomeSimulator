export function matchesActiveSelection(entry, selectedEntity, selectedTile) {
  if (entry.entityType === 'animal') {
    return selectedEntity?.id === entry.raw.id;
  }
  if (!selectedTile || !selectedTile.plant || selectedTile.plant.type === 0) return false;
  return selectedTile.x === entry.x && selectedTile.y === entry.y;
}

export function buildEntitySummaryGroups(entries, selectedEntity, selectedTile) {
  const groups = new Map();

  for (const entry of entries) {
    const key = entry.groupKey || `${entry.entityType}:${entry.speciesLabel}`;
    const active = matchesActiveSelection(entry, selectedEntity, selectedTile);
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

export function reconcileCollapsedGroups(collapsedGroups, groups, activeGroupKey) {
  const validKeys = new Set(groups.map(group => group.key));
  const next = {};
  let changed = false;

  for (const [key, value] of Object.entries(collapsedGroups)) {
    if (!value) {
      changed = true;
      continue;
    }
    if (!validKeys.has(key) || key === activeGroupKey) {
      changed = true;
      continue;
    }
    next[key] = true;
  }

  if (!changed && Object.keys(next).length === Object.keys(collapsedGroups).length) {
    return collapsedGroups;
  }

  return next;
}