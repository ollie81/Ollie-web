import { Link } from 'react-router-dom';
import OllieOrb from '../components/OllieOrb';
import './Premium.css';

export default function PremiumSuccess() {
  return (
    <div className="page-shell premium-page">
      <div className="premium-hero">
        <OllieOrb size={64} breathing />
        <h1>You're premium 🎉</h1>
        <p>
          Thanks for supporting Ollie. It can take a few seconds to activate — if your chat still shows limits,
          give it a moment and reopen the app.
        </p>
      </div>
      <Link className="btn-pill premium-cta" to="/chat" style={{ textAlign: 'center', textDecoration: 'none' }}>
        Back to chat
      </Link>
    </div>
  );
}
