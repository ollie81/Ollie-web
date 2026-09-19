import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OllieOrb from '../components/OllieOrb';
import {
  GOOGLE_CLIENT_ID,
  emailForgotPassword,
  emailLogin,
  emailRequestSignupOtp,
  emailResetPassword,
  emailSignup,
  googleLogin,
} from '../lib/api';
import './Auth.css';

type Method = 'google' | 'email';
type Mode = 'login' | 'signup' | 'forgot';
type Step = 'form' | 'otp';

export default function Auth() {
  const navigate = useNavigate();
  const [method, setMethod] = useState<Method>('google');
  const [mode, setMode] = useState<Mode>('login');
  const [step, setStep] = useState<Step>('form');
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Google-only: set once a brand-new account needs a birthdate
  // before auth.py's google_login will actually create it (see
  // needs_date_of_birth in api.ts's GoogleLoginResponse). The id
  // token itself can't be re-requested without restarting the whole
  // Google flow, so it's held here to retry with once dob is filled.
  const [pendingGoogleIdToken, setPendingGoogleIdToken] = useState<string | null>(null);
  const [dob, setDob] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  // Set once polling for window.google gives up -- a blocked script
  // (ad-blocker, offline, or the origin not yet authorized in Google
  // Cloud Console) would otherwise leave the button area blank
  // forever with no explanation and no way forward.
  const [googleUnavailable, setGoogleUnavailable] = useState(false);

  useEffect(() => {
    if (method !== 'google' || pendingGoogleIdToken) return;
    let cancelled = false;
    const deadline = Date.now() + 5000;
    setGoogleUnavailable(false);

    function tryRender() {
      if (cancelled) return;
      const google = window.google;
      if (google?.accounts?.id && googleButtonRef.current) {
        google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleCredential });
        google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          width: 320,
          text: 'continue_with',
        });
      } else if (Date.now() < deadline) {
        setTimeout(tryRender, 100);
      } else {
        setGoogleUnavailable(true);
      }
    }
    tryRender();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, pendingGoogleIdToken]);

  async function handleGoogleCredential(response: { credential: string }) {
    setError(null);
    setLoading(true);
    try {
      const result = await googleLogin(response.credential);
      if (result.needs_date_of_birth) {
        setPendingGoogleIdToken(response.credential);
      } else if (result.access_token) {
        navigate('/home');
      } else {
        setError('Google sign-in failed. Try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDobSubmit(e: FormEvent) {
    e.preventDefault();
    if (!pendingGoogleIdToken || !dob) return;
    setError(null);
    setLoading(true);
    try {
      const result = await googleLogin(pendingGoogleIdToken, dob);
      if (result.access_token) {
        navigate('/home');
      } else {
        setError("Couldn't finish signing up. Try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setStep('form');
    setError(null);
    setInfo(null);
    setOtp('');
    setNewPassword('');
  }

  function switchMethod(next: Method) {
    setMethod(next);
    setPendingGoogleIdToken(null);
    setError(null);
    setInfo(null);
  }

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        await emailLogin(email, password);
        navigate('/home');
        return;
      }

      if (mode === 'signup') {
        if (step === 'form') {
          await emailRequestSignupOtp(email);
          setStep('otp');
          setInfo(`We sent a code to ${email}`);
        } else {
          await emailSignup(email, password, otp);
          navigate('/home');
        }
        return;
      }

      // mode === 'forgot'
      if (step === 'form') {
        await emailForgotPassword(email);
        setStep('otp');
        setInfo(`We sent a reset code to ${email}`);
      } else {
        await emailResetPassword(email, otp, newPassword);
        setInfo('Password reset — you can log in now.');
        switchMode('login');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell auth-page">
      <div className="auth-hero">
        <OllieOrb size={56} breathing />
        <h1>Ollie</h1>
        <p>{method === 'google' && pendingGoogleIdToken ? 'One more thing' : 'Good to see you again'}</p>
      </div>

      <div className="auth-tabs" role="tablist" aria-label="Sign in method">
        <button
          type="button"
          role="tab"
          aria-selected={method === 'google'}
          className={`auth-tab${method === 'google' ? ' auth-tab--active' : ''}`}
          onClick={() => switchMethod('google')}
        >
          Google
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={method === 'email'}
          className={`auth-tab${method === 'email' ? ' auth-tab--active' : ''}`}
          onClick={() => switchMethod('email')}
        >
          Email
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {info && !error && <div className="info-banner">{info}</div>}

      {method === 'google' ? (
        pendingGoogleIdToken ? (
          <form className="auth-form" onSubmit={handleDobSubmit}>
            <p className="auth-dob-hint">Ollie needs your birthdate to finish setting up your account.</p>
            <input
              className="field"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              required
            />
            <button className="btn-pill auth-submit" type="submit" disabled={loading}>
              {loading ? 'Please wait…' : 'Continue'}
            </button>
          </form>
        ) : googleUnavailable ? (
          <div className="google-button-wrap">
            <p className="auth-dob-hint">
              Google sign-in didn't load — check your connection, or use the Email tab instead.
            </p>
          </div>
        ) : (
          <div className="google-button-wrap">
            <div ref={googleButtonRef} />
            {loading && <p className="auth-dob-hint">Signing in…</p>}
          </div>
        )
      ) : (
        <>
          <form className="auth-form" onSubmit={handleEmailSubmit}>
            {step === 'form' && (
              <>
                <input
                  className="field"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                {mode !== 'forgot' && (
                  <input
                    className="field"
                    type="password"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                )}
              </>
            )}

            {step === 'otp' && (
              <>
                <input
                  className="field"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                />
                {mode === 'forgot' && (
                  <input
                    className="field"
                    type="password"
                    autoComplete="new-password"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                )}
              </>
            )}

            <button className="btn-pill auth-submit" type="submit" disabled={loading}>
              {loading ? 'Please wait…' : submitLabel(mode, step)}
            </button>

            {mode === 'login' && (
              <button type="button" className="btn-text" onClick={() => switchMode('forgot')}>
                Forgot password?
              </button>
            )}
          </form>

          <div className="auth-switch">
            {mode === 'login' ? (
              <>
                New here? <button type="button" onClick={() => switchMode('signup')}>Create an account</button>
              </>
            ) : (
              <>
                Already have an account? <button type="button" onClick={() => switchMode('login')}>Log in</button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function submitLabel(mode: Mode, step: Step): string {
  if (mode === 'login') return 'Log in';
  if (step === 'form') return 'Send code';
  if (mode === 'signup') return 'Create account';
  return 'Reset password';
}
