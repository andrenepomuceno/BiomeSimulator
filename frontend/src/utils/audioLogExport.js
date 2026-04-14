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

function formatViewportValue(value) {
  return Number.isFinite(value) ? value : 'n/a';
}

export function formatAudioLogEntryLabel(entry) {
  if (entry?.type === 'uiClick') return 'UI click';
  if (entry?.type === 'ambience') {
    return entry.mode === 'night' ? 'Night ambience' : 'Day ambience';
  }

  if (typeof entry?.type === 'string' && entry.type.length > 0) {
    return entry.type.charAt(0).toUpperCase() + entry.type.slice(1);
  }

  return 'Sound';
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

export function formatAudioLogEntryMeta(entry, separator = ' | ') {
  return getAudioLogEntryMetaParts(entry).join(separator);
}

export function formatAudioLogExportTimestamp(value) {
  const date = toDate(value);
  if (!date) return 'Unknown time';
  return `${formatDateParts(date)} ${formatTimeParts(date)}`;
}

export function formatAudioLogEventTime(value) {
  const date = toDate(value);
  if (!date) return 'Unknown time';
  return formatTimeParts(date);
}

export function buildAudioLogExportLine(entry) {
  const time = formatAudioLogEventTime(entry?.at);
  const label = formatAudioLogEntryLabel(entry);
  const meta = formatAudioLogEntryMeta(entry);
  return meta ? `${time} - ${label} | ${meta}` : `${time} - ${label}`;
}

export function buildAudioLogExportText({ audioSettings = {}, viewport = {}, entries = [], exportedAt = new Date() } = {}) {
  const lines = [];

  lines.push('=== ECOGAME AUDIO LOG ===');
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

  for (const entry of entries) {
    lines.push(buildAudioLogExportLine(entry));
  }

  return lines.join('\n');
}
