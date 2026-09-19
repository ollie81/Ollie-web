import { Analytics } from '@vercel/analytics/react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AnimatedBackground from './components/AnimatedBackground';
import { isLoggedIn } from './lib/api';
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

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!isLoggedIn()) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

export default function App() {
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
