import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { getJourney, JourneyInfo } from '../lib/api';
import './OurSpace.css';

// Ported from our_space_screen.dart -- the shared history between
// Ollie and the user. Stage is computed from real signals (days
// active + memory/accomplishment depth, see relationship.py), never
// a streak -- that's deliberate, per relationship.py's own comment:
// this can't be rushed by messaging a lot in one sitting.
// stage_label comes straight from the backend and isn't localized
// here (same scoping as other backend-sourced strings in this app).

const CATEGORY_ICON: Record<string, string> = {
  accomplishment: '🏆',
  struggle: '☁️',
  person: '👥',
  event: '📅',
  promise: '🤝',
};

export default function OurSpace() {
  const { t } = useTranslation();
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
        <button className="settings-back" onClick={() => navigate('/home')} aria-label={t('common.back')}>
          ←
        </button>
        <h1>{t('ourSpace.title')}</h1>
      </header>

      {loading ? (
        <div className="settings-loading">{t('common.loading')}</div>
      ) : error ? (
        <div className="ourspace-error">
          <p>{t('ourSpace.loadError')}</p>
          <button className="btn-text" onClick={load}>
            {t('common.retry')}
          </button>
        </div>
      ) : (
        <>
          <div className="ourspace-stage-hero">
            <span className="ourspace-stage-emoji">{journey?.stage_emoji ?? '🌱'}</span>
            <h2>{journey?.stage_label ?? 'New'}</h2>
            <p>
              {activeDays === 0
                ? t('ourSpace.storyStarting')
                : t('ourSpace.daysTogether', { count: activeDays, memories: memoryCount })}
            </p>
          </div>

          {isEmpty ? (
            <div className="ourspace-empty">
              <span className="ourspace-empty-icon" aria-hidden="true">
                ✨
              </span>
              <h3>{t('ourSpace.nothingYet')}</h3>
              <p>{t('ourSpace.nothingYetDescription')}</p>
            </div>
          ) : (
            <>
              {activeGoals.length > 0 && (
                <section className="ourspace-section">
                  <div className="ourspace-section-label">{t('ourSpace.workingTogether')}</div>
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
                  <div className="ourspace-section-label">{t('ourSpace.accomplished')}</div>
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
                  <div className="ourspace-section-label">{t('ourSpace.moments')}</div>
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
