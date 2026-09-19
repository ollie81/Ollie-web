import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import './LegalPage.css';

// Shared shell for Privacy.tsx/Terms.tsx -- same drafted-not-reviewed
// framing as privacy_policy_screen.dart/terms_of_service_screen.dart,
// content adapted for what the web app itself actually does (Google/
// email sign-in and Lemon Squeezy billing, not phone/SMS or Play).
export default function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="page-shell legal-page">
      <header className="legal-header">
        <button className="settings-back" onClick={() => navigate(-1)} aria-label="Back">
          ←
        </button>
        <h1>{title}</h1>
      </header>
      <div className="legal-body">
        <DraftNotice />
        <Paragraph>Last updated: Not yet published — draft</Paragraph>
        {children}
        <DraftNotice />
      </div>
    </div>
  );
}

function DraftNotice() {
  return (
    <div className="legal-draft-notice">
      <span aria-hidden="true">⚠️</span>
      <p>
        This is a draft that reflects what the app actually does, generated to give you a starting point — not legal
        advice. Have it reviewed by a lawyer before you publish, especially since Ollie is used by minors and handles
        sensitive topics like self-harm flagging.
      </p>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="legal-section">
      <h2>{title}</h2>
      <ul>{children}</ul>
    </section>
  );
}

export function Bullet({ children }: { children: ReactNode }) {
  return <li>{children}</li>;
}

export function Paragraph({ children }: { children: ReactNode }) {
  return <p className="legal-paragraph">{children}</p>;
}
