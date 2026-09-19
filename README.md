# Ollie Web

The web client for Ollie — same FastAPI backend the Android app uses
([ollie-api-1](https://github.com/ollie81/ollie-api-1)), same personality
and memory, no app store required. Built so iPhone users (and anyone else)
can chat with Ollie without Apple's developer fee.

MVP scope: chat, Google/email auth, and premium via Flutterwave (the web
has no equivalent to Google Play Billing, which the Android app uses
instead — and Stripe doesn't support Rwanda as a merchant country, so
Flutterwave is the one that actually works here). Voice chat and push
notifications are deferred — harder on the web, especially iOS Safari.

## Run locally

```bash
npm install
npm run dev
```

Opens on `http://localhost:5173`. Talks directly to the live backend at
`https://ollie-api-1-production.up.railway.app` — no local API needed.

## Build

```bash
npm run build   # outputs to dist/
npm run preview # serve the production build locally
```

## Deploy

Any static host works (Vercel, Netlify, Cloudflare Pages) — import this
repo, no config needed beyond the framework preset (Vite). One thing to
set after deploying:

- On the backend (Railway → ollie-api-1 → Variables), set `WEB_APP_URL`
  to this app's real deployed URL, so Flutterwave's hosted checkout
  redirects back to the right place after payment.
- Also add this app's real deployed origin to the Google OAuth client's
  Authorized JavaScript origins in Google Cloud Console (Credentials
  page) — otherwise Google sign-in fails with an origin mismatch.

## Design

Colors, type, and motion are ported directly from the real Flutter app
(`lib/screens/*.dart`, `lib/main.dart`) rather than redesigned — see
`src/styles/theme.css` for the token source of truth.
