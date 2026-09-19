import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getJourney, JourneyInfo } from '../lib/api';
import './OurSpace.css';

// Ported from our_space_screen.dart -- the shared history between
// Ollie and the user. Stage is computed from real signals (days
// active + memory/accomplishment depth, see relationship.py), never
// a streak -- that's deliberate, per relationship.py's own comment:
// this can't be rushed by messaging a lot in one sitting.

const CATEGORY_ICON: Record<string, string> = {
  accomplishment: '🏆',
  struggle: '☁️',
  person: '👥',
  event: '📅',
  promise: '🤝',
};

export default function OurSpace() {
  const navigate = useNavigate();
  const [journey, setJourney] = useState<JourneyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    setError(false);
    getJourney()
      .then(setJourney)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  const activeGoals = journey?.active_goals ?? [];
  const completedGoals = journey?.completed_goals ?? [];
  const highlights = journey?.highlights ?? [];
  const isEmpty =
    activeGoals.length === 0 && completedGoals.length === 0 && highlights.length === 0 && (journey?.memory_count ?? 0) === 0;
  const activeDays = journey?.active_days ?? 0;
  const memoryCount = journey?.memory_count ?? 0;

  return (
    <div className="page-shell ourspace-page">
      <header className="settings-header">
        <button className="settings-back" onClick={() => navigate('/home')} aria-label="Back">
          ←
        </button>
        <h1>Our Space</h1>
      </header>

      {loading ? (
        <div className="settings-loading">Loading…</div>
      ) : error ? (
        <div className="ourspace-error">
          <p>Could not load your journey, try again</p>
          <button className="btn-text" onClick={load}>
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="ourspace-stage-hero">
            <span className="ourspace-stage-emoji">{journey?.stage_emoji ?? '🌱'}</span>
            <h2>{journey?.stage_label ?? 'New'}</h2>
            <p>
              {activeDays === 0
                ? 'Your story with Ollie is just getting started'
                : `${activeDays} ${activeDays === 1 ? 'day' : 'days'} together · ${memoryCount} ${
                    memoryCount === 1 ? 'thing' : 'things'
                  } Ollie remembers`}
            </p>
          </div>

          {isEmpty ? (
            <div className="ourspace-empty">
              <span className="ourspace-empty-icon" aria-hidden="true">
                ✨
              </span>
              <h3>Nothing here yet</h3>
              <p>Keep talking to Ollie — your memories, goals, and milestones together will start showing up here.</p>
            </div>
          ) : (
            <>
              {activeGoals.length > 0 && (
                <section className="ourspace-section">
                  <div className="ourspace-section-label">Working on together</div>
                  {activeGoals.map((g) => (
                    <div key={g.id} className="ourspace-tile">
                      <span className="ourspace-tile__icon" aria-hidden="true">
                        🚩
                      </span>
                      <span className="ourspace-tile__text">{g.title}</span>
                    </div>
                  ))}
                </section>
              )}

              {completedGoals.length > 0 && (
                <section className="ourspace-section">
                  <div className="ourspace-section-label">What you've accomplished</div>
                  {completedGoals.map((g) => (
                    <div key={g.id} className="ourspace-tile">
                      <span className="ourspace-tile__icon" aria-hidden="true">
                        🏆
                      </span>
                      <span className="ourspace-tile__text ourspace-tile__text--done">{g.title}</span>
                    </div>
                  ))}
                </section>
              )}

              {highlights.length > 0 && (
                <section className="ourspace-section">
                  <div className="ourspace-section-label">Moments</div>
                  {highlights.map((h) => (
                    <div key={h.id} className="ourspace-tile ourspace-tile--highlight">
                      <span className="ourspace-tile__icon" aria-hidden="true">
                        {CATEGORY_ICON[h.category] ?? '✨'}
                      </span>
                      <span className="ourspace-tile__text">{h.memory_text}</span>
                    </div>
                  ))}
                </section>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
