import { useState } from 'react';
import OllieOrb from '../components/OllieOrb';
import { createCheckoutSession } from '../lib/api';
import './Premium.css';

type Plan = 'monthly' | 'yearly';

export default function Premium() {
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
      setError(err instanceof Error ? err.message : 'Could not start checkout. Try again.');
      setLoading(false);
    }
  }

  return (
    <div className="page-shell premium-page">
      <div className="premium-hero">
        <OllieOrb size={64} breathing />
        <h1>Go premium</h1>
        <p>Unlimited messages, deeper memory, and voice conversations with Ollie.</p>
      </div>

      <div className="plan-options">
        <button
          type="button"
          className={`plan-card${plan === 'monthly' ? ' plan-card--selected' : ''}`}
          onClick={() => setPlan('monthly')}
        >
          <span className="plan-card__name">Monthly</span>
          <span className="plan-card__detail">Billed monthly · see price at checkout</span>
        </button>
        <button
          type="button"
          className={`plan-card${plan === 'yearly' ? ' plan-card--selected' : ''}`}
          onClick={() => setPlan('yearly')}
        >
          <span className="plan-card__badge">Best value</span>
          <span className="plan-card__name">Yearly</span>
          <span className="plan-card__detail">Billed yearly · see price at checkout</span>
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <button className="btn-pill premium-cta" onClick={handleContinue} disabled={loading}>
        {loading ? 'Redirecting…' : 'Continue'}
      </button>
      <p className="premium-footnote">Secure checkout via Stripe. Cancel anytime.</p>
    </div>
  );
}
