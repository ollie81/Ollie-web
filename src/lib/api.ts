// ============================================================
// API — talks to the same FastAPI backend the Flutter app uses
// (see ollie-api-1/app.py for routes). Mirrors api_service.dart's
// shape closely: same endpoints, same timeout discipline (that
// file's _requestTimeout/_uploadTimeout were added this session
// after a real production hang caused by a request with no timeout
// at all -- baking the same guard in here from the start rather
// than relearning it).
// ============================================================

const BASE_URL = 'https://ollie-api-1-production.up.railway.app';

// Same Web-type OAuth client ID auth.py's google_login already
// verifies ID tokens against (see auth_screen.dart's
// _googleServerClientId) -- reused as-is, not a separate client, so
// the backend needs no changes for web sign-in to work. Requires the
// deployed web origin to be added to this client's "Authorized
// JavaScript origins" in Google Cloud Console (Credentials page) --
// otherwise Google rejects the sign-in with an origin mismatch.
export const GOOGLE_CLIENT_ID = '431417738635-f3ipimjqmdldh0lfsf44f70irif9eoho.apps.googleusercontent.com';

const REQUEST_TIMEOUT_MS = 15_000;

const ACCESS_TOKEN_KEY = 'ollie_access_token';
const REFRESH_TOKEN_KEY = 'ollie_refresh_token';

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function saveTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function isLoggedIn(): boolean {
  return !!getAccessToken();
}

class ApiError extends Error {}

async function timedFetch(path: string, init: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${BASE_URL}${path}`, { ...init, signal: controller.signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new ApiError('Connection timed out. Check your signal and try again.');
    }
    throw new ApiError("Couldn't reach Ollie. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }
}

async function readErrorDetail(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json();
    return body.detail ?? fallback;
  } catch {
    return fallback;
  }
}

// ---- pre-login calls (signup/login/OTP/reset) -- never carry an
// auth header, and never retry-on-401 since there's no session yet. ----

export async function publicRequest<T>(
  method: 'GET' | 'POST',
  endpoint: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const response = await timedFetch(endpoint, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new ApiError(await readErrorDetail(response, 'Something went wrong. Try again.'));
  }
  return response.json();
}

// ---- authenticated calls -- attach the access token, and on a 401
// try exactly one silent refresh + retry before giving up (mirrors
// api_service.dart's _doAuthRequest). ----

async function doAuthFetch(method: string, endpoint: string, body?: unknown, timeoutMs?: number) {
  return timedFetch(
    endpoint,
    {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAccessToken()}`,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    },
    timeoutMs,
  );
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await timedFetch('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!response.ok) return false;
    const data = await response.json();
    saveTokens(data.access_token, data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

export async function authRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  endpoint: string,
  body?: Record<string, unknown>,
  timeoutMs?: number,
): Promise<T> {
  let response = await doAuthFetch(method, endpoint, body, timeoutMs);

  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      clearTokens();
      throw new ApiError('Session expired. Please log in again.');
    }
    response = await doAuthFetch(method, endpoint, body, timeoutMs);
  }

  if (response.status === 429) {
    throw new ApiError(await readErrorDetail(response, 'Daily limit reached'));
  }
  if (!response.ok) {
    throw new ApiError(await readErrorDetail(response, 'Something went wrong. Try again.'));
  }
  return response.json();
}

// ---- auth endpoints ----
//
// Web skips phone/SMS auth entirely (the Android app keeps it --
// see auth.py's /auth/signup, /auth/login, /auth/forgot, /auth/reset,
// untouched) -- Google is a one-click flow on every device and email
// covers everyone else, so there's no web-specific reason to also
// carry SMS OTP's cost and friction here.

export interface GoogleLoginResponse {
  success: boolean;
  // True on a brand-new account with no birthdate yet -- collect one
  // and call googleLogin again with it (see auth.py's google_login).
  needs_date_of_birth?: boolean;
  access_token?: string;
  refresh_token?: string;
  is_new_user?: boolean;
  username?: string;
}

export async function googleLogin(idToken: string, dateOfBirth?: string): Promise<GoogleLoginResponse> {
  const data = await publicRequest<GoogleLoginResponse>('POST', '/auth/google', {
    id_token: idToken,
    ...(dateOfBirth ? { date_of_birth: dateOfBirth } : {}),
  });
  if (data.access_token && data.refresh_token) {
    saveTokens(data.access_token, data.refresh_token);
  }
  return data;
}

export const emailRequestSignupOtp = (email: string) =>
  publicRequest('POST', '/auth/email/signup/request-otp', { email });

export const emailSignup = (email: string, password: string, otp: string, dateOfBirth?: string) =>
  publicRequest<{ access_token: string; refresh_token: string }>('POST', '/auth/email/signup', {
    email,
    password,
    otp,
    ...(dateOfBirth ? { date_of_birth: dateOfBirth } : {}),
  }).then(saveAndReturn);

export const emailLogin = (email: string, password: string) =>
  publicRequest<{ access_token: string; refresh_token: string }>('POST', '/auth/email/login', {
    email,
    password,
  }).then(saveAndReturn);

export const emailForgotPassword = (email: string) => publicRequest('POST', '/auth/email/forgot', { email });

export const emailResetPassword = (email: string, otp: string, newPassword: string) =>
  publicRequest('POST', '/auth/email/reset', { email, otp, new_password: newPassword });

function saveAndReturn<T extends { access_token: string; refresh_token: string }>(data: T): T {
  saveTokens(data.access_token, data.refresh_token);
  return data;
}

export async function logout() {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken) {
      await publicRequest('POST', '/auth/logout', { refresh_token: refreshToken });
    }
  } catch {
    // Best-effort -- the local tokens are cleared regardless below,
    // which is what actually ends the session on this device.
  } finally {
    clearTokens();
  }
}

// ---- chat ----

export interface ChatMessageRow {
  id: string;
  message: string;
  sender: 'user' | 'ollie';
  created_at: string;
  reply_to?: { sender: string; message: string } | null;
}

export const sendMessage = (message: string, mode?: string | null, replyToId?: string | null) =>
  authRequest<{
    reply: string;
    user_message_id: string;
    message_id: string;
    current_streak?: number;
  }>('POST', '/chat', {
    message,
    history: [],
    // Dart's DateTime.timeZoneOffset.inMinutes and JS's
    // Date.getTimezoneOffset() use opposite signs for the same
    // offset -- negating matches what the Flutter client sends.
    utc_offset_minutes: -new Date().getTimezoneOffset(),
    ...(mode ? { mode } : {}),
    ...(replyToId ? { reply_to_id: replyToId } : {}),
  });

export const getHistory = () =>
  authRequest<{ messages: ChatMessageRow[] }>('GET', '/history')
    .then((r) => r.messages ?? [])
    .catch(() => [] as ChatMessageRow[]);

export const getUsage = () =>
  authRequest<{
    messages_used_today: number;
    daily_limit: number;
    is_premium: boolean;
    current_streak: number;
  }>('GET', '/settings/usage');

// ---- billing (web-only -- Stripe; see billing.py) ----

export const createCheckoutSession = (plan: 'monthly' | 'yearly') =>
  authRequest<{ checkout_url: string }>('POST', '/billing/create-checkout-session', { plan });
