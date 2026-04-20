/**
 * DevDebugModal — development-only diagnostic dashboard.
 * Displays runtime state, engine/renderer performance, active feature flags,
 * and renderer metadata sourced entirely from the existing Zustand store.
 *
 * This component is only imported when import.meta.env.DEV is true.
 * It must never appear in production builds.
 */
import React, { useRef } from 'react';
import useSimStore from '../store/simulationStore';
import { useModalA11y } from '../hooks/useModalA11y.js';
import { IS_DEV, FF_AUDIO_LOG_UI, FF_CAPTURE_BRIDGE } from '../config/featureFlags.js';

function Row({ label, value, valueStyle }) {
  return (
    <div className="dev-debug-row">
      <span className="dev-debug-label">{label}</span>
      <span className="dev-debug-value" style={valueStyle}>{value}</span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="dev-debug-section">
      <h6 className="dev-debug-section-title">{title}</h6>
      {children}
    </section>
  );
}

function Flag({ name, value }) {
  return (
    <div className="dev-debug-row">
      <span className="dev-debug-label">{name}</span>
      <span className={`dev-debug-flag ${value ? 'on' : 'off'}`}>{value ? 'ON' : 'OFF'}</span>
    </div>
  );
}

export default function DevDebugModal({ open, onClose }) {
  const modalRef = useRef(null);
  useModalA11y({ open, onClose, containerRef: modalRef });

  const {
    running, paused, tps, clock,
    profilingEnabled, profiling,
    rendererMode, viewport,
    mapWidth, mapHeight,
    stats,
  } = useSimStore();

  if (!open) return null;

  const eng = profiling?.engine ?? {};
  const ren = profiling?.renderer ?? {};
  const phases = eng.phases ?? {};

  const vp = viewport ?? {};

  return (
    <div className="dev-debug-overlay" onClick={onClose}>
      <div
        className="dev-debug-modal"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dev-debug-title"
        tabIndex={-1}
      >
        <div className="dev-debug-header">
          <div className="dev-debug-header-left">
            <span className="dev-debug-badge">DEV</span>
            <h5 id="dev-debug-title">Debug Dashboard</h5>
          </div>
          <button
            className="btn btn-sm btn-outline-secondary py-0 px-1"
            onClick={onClose}
            aria-label="Close debug dashboard"
          >
            ✕
          </button>
        </div>

        <div className="dev-debug-body">
          {/* ── Runtime ── */}
          <Section title="Runtime">
            <Row label="State"
              value={!running ? 'Idle' : paused ? 'Paused' : 'Running'}
              valueStyle={{ color: !running ? '#888' : paused ? '#ffaa33' : '#66cc66' }}
            />
            <Row label="Speed" value={`${tps} tps`} />
            <Row label="Tick" value={clock.tick?.toLocaleString() ?? '—'} />
            <Row label="Day" value={clock.day ?? '—'} />
            <Row label="Tick in day" value={clock.tick_in_day ?? '—'} />
            <Row label="Night" value={clock.is_night ? 'Yes' : 'No'} />
            <Row label="World size" value={mapWidth > 0 ? `${mapWidth} × ${mapHeight}` : '—'} />
            <Row label="Animals alive" value={stats?.animalsAlive ?? eng.counts?.animalsAlive ?? '—'} />
            <Row label="Plants total" value={stats?.plants_total?.toLocaleString() ?? '—'} />
          </Section>

          {/* ── Performance ── */}
          <Section title="Performance">
            <Row label="Profiling"
              value={profilingEnabled ? 'High-res ON' : 'Low-res'}
              valueStyle={{ color: profilingEnabled ? '#66cc66' : '#888' }}
            />
            <Row label="Engine tick" value={eng.tickMs != null ? `${eng.tickMs.toFixed(2)} ms` : '—'} />
            <Row label="Tick batch" value={eng.ticksInBatch > 1 ? `×${eng.ticksInBatch}` : '1'} />
            <Row label="Plants phase" value={phases.plantsMs != null ? `${phases.plantsMs.toFixed(2)} ms` : '—'} />
            <Row label="AI phase" value={phases.behaviorMs != null ? `${phases.behaviorMs.toFixed(2)} ms` : '—'} />
            <Row label="Spatial phase" value={phases.spatialMs != null ? `${phases.spatialMs.toFixed(2)} ms` : '—'} />
            <Row label="Cleanup phase" value={phases.cleanupMs != null ? `${phases.cleanupMs.toFixed(2)} ms` : '—'} />
            <Row label="Stats phase" value={phases.statsMs != null ? `${phases.statsMs.toFixed(2)} ms` : '—'} />
            <Row label="FPS" value={ren.fps != null ? ren.fps.toFixed(1) : '—'} />
            <Row label="Frame" value={ren.frameMs != null ? `${ren.frameMs.toFixed(2)} ms` : '—'} />
            <Row label="Entity update" value={ren.entityUpdateMs != null ? `${ren.entityUpdateMs.toFixed(2)} ms` : '—'} />
            <Row label="Plant update" value={ren.plantUpdateMs != null ? `${ren.plantUpdateMs.toFixed(2)} ms` : '—'} />
          </Section>

          {/* ── Renderer ── */}
          <Section title="Renderer">
            <Row label="Mode" value={rendererMode ?? '—'} />
            <Row label="Zoom" value={vp.zoom != null ? vp.zoom.toFixed(3) : '—'} />
            <Row label="Camera X" value={vp.x != null ? vp.x.toFixed(1) : '—'} />
            <Row label="Camera Y" value={vp.y != null ? vp.y.toFixed(1) : '—'} />
            <Row label="Viewport W" value={vp.width != null ? vp.width : '—'} />
            <Row label="Viewport H" value={vp.height != null ? vp.height : '—'} />
          </Section>

          {/* ── Feature Flags ── */}
          <Section title="Feature Flags">
            <Flag name="IS_DEV" value={IS_DEV} />
            <Flag name="FF_AUDIO_LOG_UI" value={FF_AUDIO_LOG_UI} />
            <Flag name="FF_CAPTURE_BRIDGE" value={FF_CAPTURE_BRIDGE} />
          </Section>
        </div>
      </div>
    </div>
  );
}
