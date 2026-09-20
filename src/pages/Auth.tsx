import { FormEvent, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
  // Set once the real Google button has actually rendered -- Google
  // is the default tab, so without this the button area is just
  // empty for up to 5s on every page load (worse whenever the script
  // is slow or blocked), which reads as a broken/frozen page rather
  // than "still loading". See googleUnavailable above for what
  // happens if it never renders at all.
  const [googleButtonReady, setGoogleButtonReady] = useState(false);

  useEffect(() => {
    if (method !== 'google' || pendingGoogleIdToken) return;
    let cancelled = false;
    const deadline = Date.now() + 5000;
    setGoogleUnavailable(false);
    setGoogleButtonReady(false);

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
        setGoogleButtonReady(true);
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
        setError(t('errors.googleSignInFailed', 'Google sign-in failed. Try again.'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.googleSignInFailed', 'Google sign-in failed. Try again.'));
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
        setError(t('errors.signupIncomplete', "Couldn't finish signing up. Try again."));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.somethingWrong', 'Something went wrong. Try again.'));
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
          setInfo(t('auth.codeSentTo', { email }));
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
        setInfo(t('auth.resetCodeSentTo', { email }));
      } else {
        await emailResetPassword(email, otp, newPassword);
        setInfo(t('auth.passwordResetDone'));
        switchMode('login');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.somethingWrong', 'Something went wrong. Try again.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell auth-page">
      <div className="auth-hero">
        <OllieOrb size={56} breathing />
        <h1>Ollie</h1>
        <p>{method === 'google' && pendingGoogleIdToken ? t('auth.subtitleOneMoreThing') : t('auth.subtitleReturning')}</p>
      </div>

      <div className="auth-tabs" role="tablist" aria-label={t('auth.signInMethod')}>
        <button
          type="button"
          role="tab"
          aria-selected={method === 'google'}
          className={`auth-tab${method === 'google' ? ' auth-tab--active' : ''}`}
          onClick={() => switchMethod('google')}
        >
          {t('auth.tabGoogle')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={method === 'email'}
          className={`auth-tab${method === 'email' ? ' auth-tab--active' : ''}`}
          onClick={() => switchMethod('email')}
        >
          {t('auth.tabEmail')}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {info && !error && <div className="info-banner">{info}</div>}

      {method === 'google' ? (
        pendingGoogleIdToken ? (
          <form className="auth-form" onSubmit={handleDobSubmit}>
            <p className="auth-dob-hint">{t('auth.dobHint')}</p>
            <input
              className="field"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              required
            />
            <button className="btn-pill auth-submit" type="submit" disabled={loading}>
              {loading ? t('auth.pleaseWait') : t('auth.continue')}
            </button>
          </form>
        ) : googleUnavailable ? (
          <div className="google-button-wrap">
            <p className="auth-dob-hint">{t('auth.googleUnavailable')}</p>
          </div>
        ) : (
          <div className="google-button-wrap">
            <div ref={googleButtonRef} />
            {!googleButtonReady && !loading && <p className="auth-dob-hint">{t('auth.checkingGoogle')}</p>}
            {loading && <p className="auth-dob-hint">{t('auth.signingIn')}</p>}
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
                  placeholder={t('auth.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                {mode !== 'forgot' && (
                  <input
                    className="field"
                    type="password"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    placeholder={t('auth.passwordPlaceholder')}
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
                  placeholder={t('auth.otpPlaceholder')}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                />
                {mode === 'forgot' && (
                  <input
                    className="field"
                    type="password"
                    autoComplete="new-password"
                    placeholder={t('auth.newPasswordPlaceholder')}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                )}
              </>
            )}

            <button className="btn-pill auth-submit" type="submit" disabled={loading}>
              {loading ? t('auth.pleaseWait') : submitLabel(mode, step, t)}
            </button>

            {mode === 'login' && (
              <button type="button" className="btn-text" onClick={() => switchMode('forgot')}>
                {t('auth.forgotPassword')}
              </button>
            )}
          </form>

          <div className="auth-switch">
            {mode === 'login' ? (
              <>
                {t('auth.newHere')} <button type="button" onClick={() => switchMode('signup')}>{t('auth.createAccount')}</button>
              </>
            ) : (
              <>
                {t('auth.alreadyHaveAccount')} <button type="button" onClick={() => switchMode('login')}>{t('auth.logIn')}</button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function submitLabel(mode: Mode, step: Step, t: (key: string) => string): string {
  if (mode === 'login') return t('auth.submitLogin');
  if (step === 'form') return t('auth.submitSendCode');
  if (mode === 'signup') return t('auth.submitCreateAccount');
  return t('auth.submitResetPassword');
}
