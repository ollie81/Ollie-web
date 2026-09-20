import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import OllieOrb from '../components/OllieOrb';
import { createCheckoutSession } from '../lib/api';
import './Premium.css';

type Plan = 'monthly' | 'yearly';

export default function Premium() {
  const { t } = useTranslation();
  const [plan, setPlan] = useState<Plan>('yearly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    setError(null);
    setLoading(true);
    try {
      const { checkout_url } = await createCheckoutSession(plan);
      window.location.href = checkout_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : t('premium.checkoutError'));
      setLoading(false);
    }
  }

  return (
    <div className="page-shell premium-page">
      <div className="premium-hero">
        <OllieOrb size={64} breathing />
        <h1>{t('premium.title')}</h1>
        <p>{t('premium.description')}</p>
      </div>

      <div className="plan-options">
        <button
          type="button"
          className={`plan-card${plan === 'monthly' ? ' plan-card--selected' : ''}`}
          onClick={() => setPlan('monthly')}
        >
          <span className="plan-card__name">{t('premium.monthly')}</span>
          <span className="plan-card__detail">{t('premium.monthlyDetail')}</span>
        </button>
        <button
          type="button"
          className={`plan-card${plan === 'yearly' ? ' plan-card--selected' : ''}`}
          onClick={() => setPlan('yearly')}
        >
          <span className="plan-card__badge">{t('premium.bestValue')}</span>
          <span className="plan-card__name">{t('premium.yearly')}</span>
          <span className="plan-card__detail">{t('premium.yearlyDetail')}</span>
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <button className="btn-pill premium-cta" onClick={handleContinue} disabled={loading}>
        {loading ? t('premium.redirecting') : t('premium.continue')}
      </button>
      <p className="premium-footnote">{t('premium.footnote')}</p>
    </div>
  );
}
