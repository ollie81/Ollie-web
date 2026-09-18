import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OllieOrb from '../components/OllieOrb';
import {
  emailForgotPassword,
  emailLogin,
  emailRequestSignupOtp,
  emailResetPassword,
  emailSignup,
  forgotPassword,
  login,
  requestSignupOtp,
  resetPassword,
  signup,
} from '../lib/api';
import './Auth.css';

type Method = 'phone' | 'email';
type Mode = 'login' | 'signup' | 'forgot';
type Step = 'form' | 'otp';

export default function Auth() {
  const navigate = useNavigate();
  const [method, setMethod] = useState<Method>('phone');
  const [mode, setMode] = useState<Mode>('login');
  const [step, setStep] = useState<Step>('form');

  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const identifier = method === 'phone' ? phoneNumber : email;

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
    setStep('form');
    setError(null);
    setInfo(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        if (method === 'phone') await login(phoneNumber, password);
        else await emailLogin(email, password);
        navigate('/chat');
        return;
      }

      if (mode === 'signup') {
        if (step === 'form') {
          if (method === 'phone') await requestSignupOtp(phoneNumber);
          else await emailRequestSignupOtp(email);
          setStep('otp');
          setInfo(`We sent a code to ${identifier}`);
        } else {
          if (method === 'phone') await signup(phoneNumber, password, otp);
          else await emailSignup(email, password, otp);
          navigate('/chat');
        }
        return;
      }

      // mode === 'forgot'
      if (step === 'form') {
        if (method === 'phone') await forgotPassword(phoneNumber);
        else await emailForgotPassword(email);
        setStep('otp');
        setInfo(`We sent a reset code to ${identifier}`);
      } else {
        if (method === 'phone') await resetPassword(phoneNumber, otp, newPassword);
        else await emailResetPassword(email, otp, newPassword);
        setInfo('Password reset — you can log in now.');
        switchMode('login');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  const identifierField =
    method === 'phone' ? (
      <input
        className="field"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="+1 555 123 4567"
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
        required
      />
    ) : (
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
    );

  return (
    <div className="page-shell auth-page">
      <div className="auth-hero">
        <OllieOrb size={56} breathing />
        <h1>Ollie</h1>
        <p>{mode === 'login' ? 'Good to see you again' : mode === 'signup' ? 'Let’s get you set up' : 'Reset your password'}</p>
      </div>

      <div className="auth-tabs" role="tablist" aria-label="Sign in method">
        <button
          type="button"
          role="tab"
          aria-selected={method === 'phone'}
          className={`auth-tab${method === 'phone' ? ' auth-tab--active' : ''}`}
          onClick={() => switchMethod('phone')}
        >
          Phone
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

      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <div className="error-banner">{error}</div>}
        {info && !error && <div className="info-banner">{info}</div>}

        {step === 'form' && (
          <>
            {identifierField}
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
    </div>
  );
}

function submitLabel(mode: Mode, step: Step): string {
  if (mode === 'login') return 'Log in';
  if (step === 'form') return 'Send code';
  if (mode === 'signup') return 'Create account';
  return 'Reset password';
}
