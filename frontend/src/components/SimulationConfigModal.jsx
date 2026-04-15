import React, { useMemo, useRef } from 'react';
import useSimStore from '../store/simulationStore';
import { buildSimulationConfigSections } from './simulationConfigViewModel.js';
import { useModalA11y } from '../hooks/useModalA11y.js';

function SourceBadge({ source }) {
  return (
    <span className={`sim-config-source ${source === 'live' ? 'live' : 'world'}`}>
      {source === 'live' ? 'Live' : 'World'}
    </span>
  );
}

export default function SimulationConfigModal({ open, onClose }) {
  const { gameConfig, clock, tps, hungerMultiplier, thirstMultiplier } = useSimStore();
  const modalRef = useRef(null);

  useModalA11y({ open, onClose, containerRef: modalRef });

  const sections = useMemo(() => buildSimulationConfigSections({
    gameConfig,
    clock,
    tps,
    hungerMultiplier,
    thirstMultiplier,
  }), [gameConfig, clock, tps, hungerMultiplier, thirstMultiplier]);

  if (!open) return null;

  return (
    <div className="sim-config-overlay" onClick={onClose}>
      <div className="sim-config-modal" ref={modalRef} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="sim-config-modal-title" tabIndex={-1}>
        <div className="sim-config-header">
          <div>
            <div className="sim-config-eyebrow">Global Simulation</div>
            <h5 id="sim-config-modal-title">Runtime configuration</h5>
          </div>
          <button className="btn btn-sm btn-outline-secondary py-0 px-1" onClick={onClose} aria-label="Close simulation configuration">✕</button>
        </div>

        <div className="sim-config-body">
          <section className="sim-config-hero">
            <p className="sim-config-intro">
              Read-only view of the active world&apos;s baseline settings and the live runtime values that can drift while the simulation is running.
            </p>
            <div className="sim-config-chip-list">
              <span className="sim-config-chip live">Live values update continuously</span>
              <span className="sim-config-chip">World config includes merged defaults</span>
              <span className="sim-config-chip">This panel is read-only</span>
            </div>
          </section>

          <div className="sim-config-grid">
            {sections.map(section => (
              <section key={section.id} className="sim-config-section">
                <div className="sim-config-section-header">
                  <h6>{section.title}</h6>
                  <p>{section.description}</p>
                </div>

                <div className="sim-config-rows">
                  {section.rows.map(row => (
                    <div key={row.id} className="sim-config-row">
                      <div className="sim-config-row-copy">
                        <div className="sim-config-row-label">{row.label}</div>
                        <div className="sim-config-row-hint">{row.hint}</div>
                      </div>
                      <div className="sim-config-row-meta">
                        <div className="sim-config-row-value">{row.value}</div>
                        <SourceBadge source={row.source} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <p className="sim-config-footer">
            Live multiplier editing remains in the population panel. New world generation settings stay in the main menu.
          </p>
        </div>
      </div>
    </div>
  );
}