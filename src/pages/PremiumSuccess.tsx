import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import OllieOrb from '../components/OllieOrb';
import './Premium.css';

export default function PremiumSuccess() {
  const { t } = useTranslation();
  return (
    <div className="page-shell premium-page">
      <div className="premium-hero">
        <OllieOrb size={64} breathing />
        <h1>{t('premium.successTitle')}</h1>
        <p>{t('premium.successBody')}</p>
      </div>
      <Link className="btn-pill premium-cta" to="/chat" style={{ textAlign: 'center', textDecoration: 'none' }}>
        {t('premium.backToChat')}
      </Link>
    </div>
  );
}
