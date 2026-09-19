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

// Shared by every authenticated call (JSON or not): retries exactly
// once on a 401 after a silent token refresh, same as api_service.dart's
// _doAuthRequest. Callers pass a thunk rather than a Response so the
// same retry dance works whether the underlying request is a plain
// JSON fetch or a binary/multipart one (see speak/chatVoice below).
async function withAuthRetry(makeRequest: () => Promise<Response>): Promise<Response> {
  let response = await makeRequest();
  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      clearTokens();
      throw new ApiError('Session expired. Please log in again.');
    }
    response = await makeRequest();
  }
  return response;
}

export async function authRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  endpoint: string,
  body?: Record<string, unknown>,
  timeoutMs?: number,
): Promise<T> {
  const response = await withAuthRetry(() => doAuthFetch(method, endpoint, body, timeoutMs));

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

export interface ChatReply {
  reply: string;
  user_message_id: string;
  message_id: string;
  // _process_chat_message's own field name is "streak", not
  // "current_streak" (that name belongs to /settings/usage's
  // unrelated response) -- matching it exactly here, since reading
  // the wrong key silently means the badge just never updates.
  streak?: number;
}

export const sendMessage = (message: string, mode?: string | null, replyToId?: string | null) =>
  authRequest<ChatReply>('POST', '/chat', {
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

export interface UsageInfo {
  messages_used_today: number;
  daily_limit: number;
  has_active_ad_bonus: boolean;
  is_premium: boolean;
  current_streak: number;
  voice_trial_seconds_remaining: number;
  notifications_enabled: boolean;
  notification_frequency: 'off' | 'low' | 'normal' | 'frequent';
  memory_enabled: boolean;
  country: string | null;
  region: string | null;
  district: string | null;
  email: string | null;
  username: string | null;
}

export const getUsage = () => authRequest<UsageInfo>('GET', '/settings/usage');

// ---- journey ("Our Space" summary) ----

export interface JourneyInfo {
  stage: string;
  stage_label: string;
  stage_emoji: string;
  active_days: number;
  memory_count: number;
  active_goals: { title: string }[];
  completed_goals: unknown[];
  highlights: unknown[];
  is_premium: boolean;
}

export const getJourney = () => authRequest<JourneyInfo>('GET', '/journey/');

// ---- premium status (the canonical, Play/LemonSqueezy-re-verifying
// check) -- distinct from getUsage's simpler local is_premium flag,
// same split as settings_screen.dart's _loadPremiumDetails. ----

export interface PremiumStatus {
  is_premium: boolean;
  product_id: string | null;
  expiry_time_millis: number | null;
}

export const getPremiumStatus = () => authRequest<PremiumStatus>('GET', '/premium/status');

// ---- mode starters ("Do It With Me" openers) ----

export const getModeStarter = (mode: string) =>
  authRequest<{ reply: string; mode: string }>('POST', '/chat/mode-starter', {
    mode,
    utc_offset_minutes: -new Date().getTimezoneOffset(),
  });

// ---- settings ----

export const updateNotificationFrequency = (frequency: 'off' | 'low' | 'normal' | 'frequent') =>
  authRequest<{ success: boolean }>('PUT', '/settings/notification-frequency', { frequency });

export const updateLocation = (location: { country: string | null; region: string | null; district: string | null }) =>
  authRequest<{ success: boolean }>('PUT', '/settings/location', location);

export const setMemoryEnabled = (enabled: boolean) =>
  authRequest<{ success: boolean }>('PUT', '/settings/memory/enabled', { enabled });

export const clearMemory = () => authRequest<{ success: boolean }>('DELETE', '/settings/memory');

export const exportUserData = () => authRequest<Record<string, unknown>>('GET', '/settings/export-data');

export const requestDeleteAccount = (confirmation: string) =>
  authRequest<{ success: boolean; scheduled_for: string }>('POST', '/settings/delete-account', { confirmation });

// ---- billing (web-only -- Lemon Squeezy; see billing.py) ----

export const createCheckoutSession = (plan: 'monthly' | 'yearly') =>
  authRequest<{ checkout_url: string }>('POST', '/billing/create-checkout-session', { plan });

// ---- voice ----
//
// Both routes below return/send binary audio or multipart form data,
// not JSON, so they can't go through authRequest -- they share its
// 401-retry behavior via withAuthRetry instead, and handle a 402
// ("Voice chat requires Ollie Premium") as a distinct, recognizable
// error so the UI can offer /premium specifically rather than a
// generic failure message.

export class VoicePremiumRequiredError extends ApiError {}

function authHeaders(): HeadersInit {
  return { Authorization: `Bearer ${getAccessToken()}` };
}

async function readAudioResponse(response: Response): Promise<{ blob: Blob; trialSecondsRemaining: number | null }> {
  if (response.status === 402) {
    throw new VoicePremiumRequiredError(await readErrorDetail(response, 'Voice requires Ollie Premium'));
  }
  if (!response.ok) {
    throw new ApiError(await readErrorDetail(response, 'Could not get a voice reply. Try again.'));
  }
  const header = response.headers.get('X-Voice-Trial-Remaining-Seconds');
  return { blob: await response.blob(), trialSecondsRemaining: header ? Number(header) : null };
}

// POST /speak -- synthesizes one line of text (typically an already-
// received Ollie reply) as spoken audio. Voice generation is slow
// enough that the shared REQUEST_TIMEOUT_MS would clip it.
export async function speak(message: string): Promise<{ blob: Blob; trialSecondsRemaining: number | null }> {
  const response = await withAuthRetry(() =>
    timedFetch(
      '/speak',
      { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ message }) },
      30_000,
    ),
  );
  return readAudioResponse(response);
}

export interface VoiceChatResult extends ChatReply {
  transcribed_text: string;
  voice_trial_seconds_remaining?: number;
}

// POST /chat/voice -- uploads a recorded clip; the backend transcribes
// it (Whisper) and runs the same reply pipeline as sendMessage. Given
// a real network + Whisper + chat-model round trip, this gets the
// upload timeout rather than the plain request one.
export async function chatVoice(audioBlob: Blob, filename: string, mode?: string | null): Promise<VoiceChatResult> {
  const form = new FormData();
  form.append('audio', audioBlob, filename);
  form.append('utc_offset_minutes', String(-new Date().getTimezoneOffset()));
  if (mode) form.append('mode', mode);

  const response = await withAuthRetry(() =>
    timedFetch('/chat/voice', { method: 'POST', headers: authHeaders(), body: form }, 45_000),
  );

  if (response.status === 402) {
    throw new VoicePremiumRequiredError(await readErrorDetail(response, 'Voice chat requires Ollie Premium'));
  }
  if (!response.ok) {
    throw new ApiError(await readErrorDetail(response, "Couldn't hear that. Try again."));
  }
  return response.json();
}
