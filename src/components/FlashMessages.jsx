/**
 * FlashMessages — shows transient supervisor audit alerts overlaid on the canvas.
 * Each flash auto-dismisses after FLASH_DURATION_MS and can be closed manually.
 */
import React, { useEffect, useRef } from 'react';
import useSimStore from '../store/simulationStore';

const FLASH_DURATION_MS = 10000;

const CATEGORY_LABELS = {
  animal_numeric:     'invalid numeric field',
  animal_bounds:      'animal out of bounds',
  animal_state:       'invalid state',
  animal_species:     'missing species config',
  spatial_hash:       'spatial hash mismatch',
  egg_overlap:        'egg overlap',
  animal_egg_overlap: 'animal/egg overlap',
  occupancy_grid:     'occupancy grid mismatch',
  plant_state:        'invalid plant state',
};

function formatSummary(countsByType) {
  const entries = Object.entries(countsByType);
  if (entries.length === 0) return '';
  return entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat, n]) => `${n}\u00a0${CATEGORY_LABELS[cat] || cat}`)
    .join(', ');
}

function FlashItem({ flash }) {
  const dismiss = useSimStore(s => s.dismissSupervisorFlash);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => dismiss(flash.id), FLASH_DURATION_MS);
    return () => clearTimeout(timerRef.current);
  }, [flash.id, dismiss]);

  const summary = formatSummary(flash.countsByType || {});

  return (
    <div className="flash-message flash-warning" role="alert" aria-live="assertive">
      <div className="flash-header">
        <span className="flash-icon" aria-hidden="true">⚠</span>
        <span className="flash-title">
          Supervisor — {flash.issueCount} issue{flash.issueCount !== 1 ? 's' : ''} at tick {flash.tick}
        </span>
        <button
          className="flash-close"
          aria-label="Dismiss"
          onClick={() => dismiss(flash.id)}
        >
          ×
        </button>
      </div>
      {summary && (
        <div className="flash-body">{summary}</div>
      )}
    </div>
  );
}

export default function FlashMessages() {
  const flashes = useSimStore(s => s.supervisorFlashes);
  if (flashes.length === 0) return null;

  return (
    <div className="flash-container" aria-label="Supervisor notifications">
      {flashes.map(f => (
        <FlashItem key={f.id} flash={f} />
      ))}
    </div>
  );
}
