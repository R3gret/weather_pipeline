"use client";

import { useState } from "react";

export default function AIInsights({ insight, model, error }) {
  const [expanded, setExpanded] = useState(true);

  // Split multi-paragraph insight into individual <p> elements
  const paragraphs = insight
    ? insight.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
    : [];

  return (
    <section className="insight-card" aria-label="AI Weather Insights">
      <div className="insight-card__header">
        <div className="insight-card__title-group">
          <span className="insight-card__icon">🤖</span>
          <div>
            <h2 className="insight-card__title">AI Weather Insights</h2>
            <p className="insight-card__model">
              Powered by {model ?? "Free (auto-routed)"} via OpenRouter
            </p>
          </div>
        </div>

        <div className="insight-card__controls">
          <span className="insight-card__badge">AI Generated</span>
          <button
            className={`insight-card__toggle ${expanded ? "insight-card__toggle--open" : ""}`}
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse insights" : "Expand insights"}
          >
            <span className="insight-card__toggle-icon">▾</span>
            <span>{expanded ? "Collapse" : "Expand"}</span>
          </button>
        </div>
      </div>

      <div className={`insight-card__body ${expanded ? "insight-card__body--open" : "insight-card__body--closed"}`}>
        <div className="insight-card__body-inner">
          {error ? (
            <div className="insight-card__error">
              <span className="insight-card__error-icon">⚠️</span>
              <p>{error}</p>
            </div>
          ) : paragraphs.length > 0 ? (
            <div className="insight-card__prose">
              {paragraphs.map((para, i) => (
                <p key={i} className="insight-card__text">{para}</p>
              ))}
            </div>
          ) : (
            <div className="insight-card__empty">
              <span>No insight available — check your OpenRouter API key.</span>
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div className="insight-card__footer">
          <span className="insight-card__footer-note">
            ✦ Insights are generated once per data fetch and reflect the latest {" "}
            {paragraphs.length > 0 ? "30" : "0"} records.
          </span>
        </div>
      )}
    </section>
  );
}
