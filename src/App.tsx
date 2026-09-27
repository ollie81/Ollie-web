import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import i18n from 'i18next';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AnimatedBackground from './components/AnimatedBackground';
import OllieOrb from './components/OllieOrb';
import { guestLogin, isLoggedIn } from './lib/api';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Home from './pages/Home';
import Chat from './pages/Chat';
import OurSpace from './pages/OurSpace';
import Settings from './pages/Settings';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Premium from './pages/Premium';
import PremiumSuccess from './pages/PremiumSuccess';

// No session at all used to mean straight to the signup wall (see
// guestLogin's own comment for why that was costing real visitors).
// Now it silently starts a guest session instead -- chatting, and
// everything else behind this gate, never waits on a signup form.
// Only a genuine backend failure (not just "not logged in yet")
// falls through to /auth.
function RequireAuth({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(isLoggedIn());
  const [guestFailed, setGuestFailed] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) {
      setReady(true);
      return;
    }
    guestLogin()
      .then(() => setReady(true))
      .catch(() => setGuestFailed(true));
  }, []);

  if (guestFailed) return <Navigate to="/auth" replace />;
  if (!ready) {
    return (
      <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <OllieOrb size={56} breathing />
      </div>
    );
  }
  return <>{children}</>;
}

// Arabic and Urdu are RTL scripts -- i18n.dir() already knows this
// per language, so the whole document just needs to follow it
// (CSS's logical "row" direction mirrors automatically from this;
// only a few explicit left/right styles don't, which is an accepted
// gap for this first localization pass).
function useDocumentDirection() {
  useEffect(() => {
    const applyDirection = (lng: string) => {
      document.documentElement.dir = i18n.dir(lng);
      document.documentElement.lang = lng;
    };
    applyDirection(i18n.language);
    i18n.on('languageChanged', applyDirection);
    return () => {
      i18n.off('languageChanged', applyDirection);
    };
  }, []);
}

export default function App() {
  useDocumentDirection();

  return (
    <BrowserRouter>
      <Analytics />
      <AnimatedBackground />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route
          path="/home"
          element={
            <RequireAuth>
              <Home />
            </RequireAuth>
          }
        />
        <Route
          path="/chat"
          element={
            <RequireAuth>
              <Chat />
            </RequireAuth>
          }
        />
        <Route
          path="/our-space"
          element={
            <RequireAuth>
              <OurSpace />
            </RequireAuth>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireAuth>
              <Settings />
            </RequireAuth>
          }
        />
        <Route
          path="/premium"
          element={
            <RequireAuth>
              <Premium />
            </RequireAuth>
          }
        />
        <Route
          path="/premium/success"
          element={
            <RequireAuth>
              <PremiumSuccess />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
