import { Navigate, Link } from 'react-router-dom';
import OllieOrb from '../components/OllieOrb';
import { isLoggedIn } from '../lib/api';
import './Landing.css';

export default function Landing() {
  if (isLoggedIn()) return <Navigate to="/home" replace />;

  return (
    <div className="page-shell landing-page">
      <div className="landing-hero">
        <OllieOrb size={96} breathing />
        <h1>Ollie</h1>
        <p>Your emotional companion. Always here, always listening.</p>
      </div>

      <div className="landing-actions">
        <Link className="btn-pill landing-cta" to="/auth">
          Chat with Ollie
        </Link>
      </div>

      <p className="landing-footnote">Free to start · no app store needed</p>
    </div>
  );
}
