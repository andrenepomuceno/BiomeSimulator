import React, { useEffect, useState } from 'react';
import { HELP_TABS } from '../constants/helpContent.js';

function ReferenceRows({ rows }) {
  return (
    <div className="help-reference-list">
      {rows.map((row) => (
        <div key={`${row.label}-${row.value}`} className="help-reference-item">
          <div className="help-reference-top">
            <span className="help-reference-label">{row.label}</span>
            <span className="help-reference-value">{row.value}</span>
          </div>
          {row.note ? <div className="help-reference-note">{row.note}</div> : null}
        </div>
      ))}
    </div>
  );
}

function SectionCards({ cards }) {
  return (
    <div className="help-card-grid">
      {cards.map((card) => (
        <div key={card.title} className="help-card">
          <h6>{card.title}</h6>
          <p>{card.body}</p>
        </div>
      ))}
    </div>
  );
}

function HelpSection({ section }) {
  return (
    <section className="help-section">
      <div className="help-section-header">
        <h6>{section.heading}</h6>
      </div>
      {section.body ? <p className="help-section-body">{section.body}</p> : null}
      {section.bullets ? (
        <div className="help-bullet-list">
          {section.bullets.map((bullet) => (
            <div key={bullet} className="help-bullet-item">{bullet}</div>
          ))}
        </div>
      ) : null}
      {section.cards ? <SectionCards cards={section.cards} /> : null}
      {section.rows ? <ReferenceRows rows={section.rows} /> : null}
      {section.secondaryRows ? (
        <>
          <div className="help-secondary-heading">{section.secondaryTitle}</div>
          <ReferenceRows rows={section.secondaryRows} />
        </>
      ) : null}
    </section>
  );
}

export default function HelpModal({ open, onClose }) {
  const [activeTab, setActiveTab] = useState(HELP_TABS[0].id);

  useEffect(() => {
    if (open) {
      setActiveTab(HELP_TABS[0].id);
    }
  }, [open]);

  if (!open) return null;

  const currentTab = HELP_TABS.find(tab => tab.id === activeTab) || HELP_TABS[0];

  return (
    <div className="help-overlay" onClick={onClose}>
      <div className="help-modal" onClick={e => e.stopPropagation()}>
        <div className="help-header">
          <div>
            <div className="help-eyebrow">In-Game Guide</div>
            <h5>{currentTab.title}</h5>
          </div>
          <button className="btn btn-sm btn-outline-secondary py-0 px-1" onClick={onClose} aria-label="Close guide">✕</button>
        </div>

        <div className="help-tabs" role="tablist" aria-label="Guide sections">
          {HELP_TABS.map(tab => (
            <button
              key={tab.id}
              className={`help-tab ${tab.id === currentTab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              aria-selected={tab.id === currentTab.id}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="help-body">
          <section className="help-hero">
            <p className="help-intro">{currentTab.intro}</p>
            <div className="help-chip-list">
              {currentTab.chips.map(chip => (
                <span key={chip} className="help-chip">{chip}</span>
              ))}
            </div>
          </section>

          {currentTab.callout ? (
            <section className="help-callout">
              <div className="help-callout-title">{currentTab.callout.title}</div>
              <p>{currentTab.callout.body}</p>
            </section>
          ) : null}

          {currentTab.sections.map(section => (
            <HelpSection key={section.heading} section={section} />
          ))}
        </div>
      </div>
    </div>
  );
}