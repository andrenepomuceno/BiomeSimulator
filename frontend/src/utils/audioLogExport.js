function padNumber(value) {
  return String(value).padStart(2, '0');
}

function formatDateParts(date) {
  return [
    date.getFullYear(),
    padNumber(date.getMonth() + 1),
    padNumber(date.getDate()),
  ].join('-');
}

function formatTimeParts(date) {
  return [
    padNumber(date.getHours()),
    padNumber(date.getMinutes()),
    padNumber(date.getSeconds()),
  ].join(':');
}

function formatTimePrecise(date) {
  const base = formatTimeParts(date);
  return `${base}.${String(date.getMilliseconds()).padStart(3, '0')}`;
}

function toDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatBoolean(value) {
  return value ? 'yes' : 'no';
}

function formatToggle(value) {
  return value ? 'on' : 'off';
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return 'n/a';
  return `${Math.round(value * 100)}%`;
}

function describePan(pan) {
  if (!Number.isFinite(pan)) return null;
  if (pan <= -0.25) return 'Left';
  if (pan >= 0.25) return 'Right';
  return 'Center';
}

function describeDistance(distance) {
  if (!Number.isFinite(distance)) return null;
  if (distance < 18) return 'Near';
  if (distance < 42) return 'Mid';
  return 'Far';
}

function describeGainBand(gain) {
  if (!Number.isFinite(gain)) return null;
  if (gain >= 0.6) return 'Loud';
  if (gain >= 0.25) return 'Medium';
  if (gain > 0) return 'Quiet';
  return null;
}

const PRIORITY_LABELS = { 0: 'UI', 1: 'High', 2: 'Med', 3: 'Low' };

function describePriority(priority) {
  if (!Number.isFinite(priority)) return null;
  return PRIORITY_LABELS[priority] ?? `P${priority}`;
}

function formatViewportValue(value) {
  return Number.isFinite(value) ? value : 'n/a';
}

export function formatAudioLogEntryLabel(entry) {
  if (entry?.type === 'uiClick') return 'UI click';
  if (entry?.type === 'ambience') {
    return entry.mode === 'night' ? 'Night ambience' : 'Day ambience';
  }

  const base = typeof entry?.type === 'string' && entry.type.length > 0
    ? entry.type.charAt(0).toUpperCase() + entry.type.slice(1)
    : 'Sound';

  if (entry?.species) return `${entry.species} ${entry.type}`;
  return base;
}

export function getAudioLogEntryMetaParts(entry) {
  const parts = [];

  if (Number.isFinite(entry?.tick)) {
    parts.push(`Tick ${entry.tick}`);
  }

  if (entry?.type === 'ambience') {
    return parts;
  }

  if (entry?.type === 'uiClick') {
    parts.push('Interface');
    return parts;
  }

  const panLabel = describePan(entry?.pan);
  if (panLabel) parts.push(panLabel);

  const distanceLabel = describeDistance(entry?.distance);
  if (distanceLabel) parts.push(distanceLabel);

  return parts;
}

export function getAudioLogEntryDetailParts(entry) {
  const parts = [];

  const prioLabel = describePriority(entry?.priority);
  if (prioLabel) parts.push(`Pri:${prioLabel}`);

  if (Number.isFinite(entry?.gain)) {
    parts.push(`Gain:${entry.gain.toFixed(3)}`);
  }

  if (Number.isFinite(entry?.pan)) {
    parts.push(`Pan:${entry.pan >= 0 ? '+' : ''}${entry.pan.toFixed(2)}`);
  }

  if (Number.isFinite(entry?.distanceGain)) {
    parts.push(`DistG:${entry.distanceGain.toFixed(2)}`);
  }

  if (entry?.nearBoosted) {
    parts.push('Boosted');
  }

  if (entry?.soundGroup) {
    parts.push(`Group:${entry.soundGroup}`);
  }

  if (Number.isFinite(entry?.x) && Number.isFinite(entry?.y)) {
    parts.push(`@${entry.x.toFixed(0)},${entry.y.toFixed(0)}`);
  }

  return parts;
}

export function formatAudioLogEntryMeta(entry, separator = ' | ') {
  return getAudioLogEntryMetaParts(entry).join(separator);
}

export function formatAudioLogEntryDetail(entry, separator = ' | ') {
  return getAudioLogEntryDetailParts(entry).join(separator);
}

export function formatAudioLogExportTimestamp(value) {
  const date = toDate(value);
  if (!date) return 'Unknown time';
  return `${formatDateParts(date)} ${formatTimeParts(date)}`;
}

export function formatAudioLogEventTime(value) {
  const date = toDate(value);
  if (!date) return 'Unknown time';
  return formatTimePrecise(date);
}

export function buildAudioLogExportLine(entry) {
  const time = formatAudioLogEventTime(entry?.at);
  const label = formatAudioLogEntryLabel(entry);
  const meta = formatAudioLogEntryMeta(entry);
  const detail = formatAudioLogEntryDetail(entry);
  const parts = [meta, detail].filter(Boolean);
  return parts.length ? `${time} - ${label} | ${parts.join(' | ')}` : `${time} - ${label}`;
}

function buildSummaryBlock(entries) {
  if (!entries.length) return '';

  const sfxEntries = entries.filter((e) => e.category === 'sfx');
  const total = entries.length;
  const sfxTotal = sfxEntries.length;

  // — Type distribution
  const typeCounts = {};
  for (const e of entries) {
    typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
  }
  const typeRows = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([t, c]) => `  ${t}: ${c} (${((c / total) * 100).toFixed(0)}%)`);

  // — Distance distribution (sfx only)
  let distRows = [];
  if (sfxTotal > 0) {
    let near = 0, mid = 0, far = 0, noData = 0;
    for (const e of sfxEntries) {
      const d = describeDistance(e.distance);
      if (d === 'Near') near++;
      else if (d === 'Mid') mid++;
      else if (d === 'Far') far++;
      else noData++;
    }
    distRows = [
      `  Near (<18): ${near} (${((near / sfxTotal) * 100).toFixed(0)}%)`,
      `  Mid (18-42): ${mid} (${((mid / sfxTotal) * 100).toFixed(0)}%)`,
      `  Far (>42): ${far} (${((far / sfxTotal) * 100).toFixed(0)}%)`,
    ];
    if (noData) distRows.push(`  No data: ${noData}`);
  }

  // — Stereo distribution (sfx only)
  let panRows = [];
  if (sfxTotal > 0) {
    let left = 0, center = 0, right = 0;
    for (const e of sfxEntries) {
      const p = describePan(e.pan);
      if (p === 'Left') left++;
      else if (p === 'Right') right++;
      else center++;
    }
    panRows = [
      `  Left: ${left} (${((left / sfxTotal) * 100).toFixed(0)}%)`,
      `  Center: ${center} (${((center / sfxTotal) * 100).toFixed(0)}%)`,
      `  Right: ${right} (${((right / sfxTotal) * 100).toFixed(0)}%)`,
    ];
  }

  // — Gain distribution (sfx only)
  let gainRows = [];
  if (sfxTotal > 0) {
    let loud = 0, medium = 0, quiet = 0;
    for (const e of sfxEntries) {
      const g = describeGainBand(e.gain);
      if (g === 'Loud') loud++;
      else if (g === 'Medium') medium++;
      else quiet++;
    }
    gainRows = [
      `  Loud (≥0.06): ${loud} (${((loud / sfxTotal) * 100).toFixed(0)}%)`,
      `  Medium: ${medium} (${((medium / sfxTotal) * 100).toFixed(0)}%)`,
      `  Quiet (<0.025): ${quiet} (${((quiet / sfxTotal) * 100).toFixed(0)}%)`,
    ];
  }

  // — Priority distribution
  const prioCounts = { 1: 0, 2: 0, 3: 0 };
  for (const e of sfxEntries) {
    const p = e.priority ?? 3;
    prioCounts[p] = (prioCounts[p] || 0) + 1;
  }
  const prioRows = sfxTotal > 0
    ? [
      `  High (1): ${prioCounts[1]} (${((prioCounts[1] / sfxTotal) * 100).toFixed(0)}%)`,
      `  Medium (2): ${prioCounts[2]} (${((prioCounts[2] / sfxTotal) * 100).toFixed(0)}%)`,
      `  Low (3): ${prioCounts[3]} (${((prioCounts[3] / sfxTotal) * 100).toFixed(0)}%)`,
    ]
    : [];

  // — Species distribution (top 8)
  const speciesCounts = {};
  for (const e of sfxEntries) {
    if (e.species) speciesCounts[e.species] = (speciesCounts[e.species] || 0) + 1;
  }
  const speciesRows = Object.entries(speciesCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([s, c]) => `  ${s}: ${c} (${((c / sfxTotal) * 100).toFixed(0)}%)`);

  // — Sound group distribution
  const groupCounts = {};
  for (const e of sfxEntries) {
    if (e.soundGroup) groupCounts[e.soundGroup] = (groupCounts[e.soundGroup] || 0) + 1;
  }
  const groupRows = Object.entries(groupCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([g, c]) => `  ${g}: ${c} (${((c / sfxTotal) * 100).toFixed(0)}%)`);

  // — Near-boosted count
  const boostedCount = sfxEntries.filter((e) => e.nearBoosted).length;

  // — Tick span
  const ticks = entries.filter((e) => Number.isFinite(e.tick)).map((e) => e.tick);
  const tickSpan = ticks.length >= 2 ? Math.max(...ticks) - Math.min(...ticks) : 0;
  const tickInfo = ticks.length >= 2
    ? `Ticks ${Math.min(...ticks)}–${Math.max(...ticks)} (span: ${tickSpan})`
    : 'n/a';

  const lines = [];
  lines.push('--- SUMMARY ---');
  lines.push(`Total events: ${total} | SFX: ${sfxTotal} | Tick range: ${tickInfo}`);
  if (boostedCount > 0) lines.push(`Near-boosted events: ${boostedCount}`);
  lines.push('');
  lines.push('Event types:');
  lines.push(...typeRows);
  if (distRows.length) {
    lines.push('');
    lines.push('Distance (SFX):');
    lines.push(...distRows);
  }
  if (panRows.length) {
    lines.push('');
    lines.push('Stereo (SFX):');
    lines.push(...panRows);
  }
  if (gainRows.length) {
    lines.push('');
    lines.push('Gain level (SFX):');
    lines.push(...gainRows);
  }
  if (prioRows.length) {
    lines.push('');
    lines.push('Priority (SFX):');
    lines.push(...prioRows);
  }
  if (speciesRows.length) {
    lines.push('');
    lines.push('Top species (SFX):');
    lines.push(...speciesRows);
  }
  if (groupRows.length) {
    lines.push('');
    lines.push('Sound groups (SFX):');
    lines.push(...groupRows);
  }

  return lines.join('\n');
}

export function buildAudioLogExportText({ audioSettings = {}, viewport = {}, entries = [], exportedAt = new Date() } = {}) {
  const lines = [];

  lines.push('=== BIOMESIMULATOR AUDIO LOG ===');
  lines.push(`Exported: ${formatAudioLogExportTimestamp(exportedAt)}`);
  lines.push(`Entries: ${entries.length}`);
  lines.push('Order: newest first');
  lines.push(
    `Audio: muted=${formatBoolean(audioSettings.muted)} | master=${formatPercent(audioSettings.masterVolume)} | ` +
      `sfx=${formatToggle(audioSettings.sfxEnabled)} @ ${formatPercent(audioSettings.sfxVolume)} | ` +
      `ambience=${formatToggle(audioSettings.ambienceEnabled)} @ ${formatPercent(audioSettings.ambienceVolume)}`
  );
  lines.push(
    `Viewport: x=${formatViewportValue(viewport.x)} y=${formatViewportValue(viewport.y)} ` +
      `w=${formatViewportValue(viewport.w)} h=${formatViewportValue(viewport.h)} zoom=${formatViewportValue(viewport.zoom)}`
  );
  lines.push('');

  if (entries.length === 0) {
    lines.push('No sound events recorded.');
    return lines.join('\n');
  }

  const summary = buildSummaryBlock(entries);
  if (summary) {
    lines.push(summary);
    lines.push('');
    lines.push('--- EVENTS ---');
  }

  for (const entry of entries) {
    lines.push(buildAudioLogExportLine(entry));
  }

  return lines.join('\n');
}
