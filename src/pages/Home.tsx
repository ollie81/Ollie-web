import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { getJourney, getUsage, JourneyInfo } from '../lib/api';
import './Home.css';

// Ported from home_screen.dart's _buildHeader/_buildMainOrb/
// _buildQuickActions/_startButton -- same greeting logic, same
// journey-strip condition, same quick actions (minus "More", which
// opened a full "Do It With Me" picker screen that doesn't exist on
// web yet -- everything else here is real, not a placeholder).

interface QuickAction {
  key: string;
  label: string;
  icon: string;
  mode: string | null;
}

export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [journey, setJourney] = useState<JourneyInfo | null>(null);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    getJourney().then(setJourney).catch(() => {});
    getUsage()
      .then((u) => setStreak(u.current_streak ?? 0))
      .catch(() => {});
  }, []);

  function greetingFor(hour: number): string {
    if (hour < 12) return t('home.greetingMorning');
    if (hour < 18) return t('home.greetingAfternoon');
    return t('home.greetingEvening');
  }

  const activeGoals = journey?.active_goals ?? [];
  const hasContext = activeGoals.length > 0 && !!activeGoals[0]?.title?.trim();
  const headline = hasContext ? t('home.headlineWithGoal', { title: activeGoals[0].title }) : t('home.headlineDefault');

  const recentCount = (journey?.highlights.length ?? 0) + (journey?.completed_goals.length ?? 0);
  const stageEmoji = journey?.stage_emoji ?? '🌱';

  const actions: QuickAction[] = [
    { key: 'plan_day', label: t('home.actionPlanMyDay'), icon: '☀️', mode: 'plan_day' },
    { key: 'study', label: t('home.actionStudyTogether'), icon: '🎓', mode: 'study' },
    ...(activeGoals.length > 0 ? [{ key: 'build', label: t('home.actionWorkOnGoal'), icon: '🚩', mode: 'build' }] : []),
    { key: 'continue', label: t('home.actionContinueYesterday'), icon: '🕘', mode: null },
  ];

  function openChat(mode?: string | null, modeLabel?: string) {
    navigate('/chat', mode ? { state: { mode, modeLabel } } : undefined);
  }

  return (
    <div className="page-shell home-page">
      <header className="home-header">
        <div className="home-header__text">
          <span className="home-header__greeting">{greetingFor(new Date().getHours())} 👋</span>
          <h1 className="home-header__headline">{headline}</h1>
          {!hasContext && <p className="home-header__subtext">{t('home.subtext')}</p>}
        </div>
        {streak > 0 && (
          <span className="home-streak" title={`${streak}-day streak`}>
            🔥 {streak}
          </span>
        )}
        <button className="home-icon-btn" onClick={() => navigate('/our-space')} aria-label={t('ourSpace.title')}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6L12 3Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" fill="currentColor" />
          </svg>
        </button>
        <button className="home-icon-btn" onClick={() => navigate('/settings')} aria-label={t('settings.title')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.8" />
            <path
              d="M19.4 13.5a7.6 7.6 0 0 0 0-3l1.9-1.5-2-3.4-2.3.9a7.6 7.6 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.5a7.6 7.6 0 0 0-2.6 1.5l-2.3-.9-2 3.4L4.6 10.5a7.6 7.6 0 0 0 0 3l-1.9 1.5 2 3.4 2.3-.9a7.6 7.6 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 2.6-1.5l2.3.9 2-3.4-1.9-1.5Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </header>

      {recentCount > 0 && (
        <button className="journey-strip journey-strip--tappable" onClick={() => navigate('/our-space')}>
          <span className="journey-strip__emoji">{stageEmoji}</span>
          <div className="journey-strip__text">
            <span className="journey-strip__label">{t('home.yourJourney')}</span>
            <span className="journey-strip__value">{t('home.recentCount', { count: recentCount })}</span>
          </div>
          <span className="journey-strip__chevron" aria-hidden="true">
            ›
          </span>
        </button>
      )}

      <div className="home-orb-area">
        <button className="home-orb" onClick={() => openChat()} aria-label={t('home.tapToChat')}>
          <span className="home-orb__face">🙂</span>
          <span className="home-orb__label">{t('home.tapToChat')}</span>
        </button>
      </div>

      <div className="quick-actions">
        {actions.map((action) => (
          <button
            key={action.key}
            className="quick-action-chip"
            onClick={() => (action.mode ? openChat(action.mode, action.label) : openChat())}
          >
            <span aria-hidden="true">{action.icon}</span>
            {action.label}
          </button>
        ))}
      </div>

      <button className="btn-pill home-start-btn" onClick={() => openChat()}>
        {t('home.startChatting')}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
