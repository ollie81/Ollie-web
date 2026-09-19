import { Link, Navigate } from 'react-router-dom';
import OllieOrb from '../components/OllieOrb';
import { isLoggedIn } from '../lib/api';
import './Landing.css';

// The marketing page for people who've never met Ollie -- distinct
// from the rest of the app's minimal, phone-shaped screens on
// purpose (see theme.css's .page-shell) since this one has to work
// as a full-width page on desktop when shared as a link, and has to
// sell the product rather than just run it. Every claim here maps to
// a real mechanic (home_screen.dart's journey strip/streak,
// daily_message.py's check-ins, chat.py's /chat/voice, modes.py) --
// nothing invented for the pitch.
export default function Landing() {
  if (isLoggedIn()) return <Navigate to="/home" replace />;

  return (
    <div className="landing-scroll">
      <div className="landing-wrap">
        <nav className="landing-nav">
          <Link className="landing-wordmark" to="/auth">
            <OllieOrb size={30} />
            Ollie
          </Link>
          <Link className="btn-pill btn-pill--ghost landing-nav-cta" to="/auth">
            Try it free
          </Link>
        </nav>
      </div>

      <div className="landing-wrap landing-hero">
        <div>
          <span className="landing-eyebrow">An AI that actually shows up</span>
          <h1>
            Most AI waits for you
            <br />
            to open the app.
            <br />
            <em>Ollie doesn't.</em>
          </h1>
          <p className="landing-lede">
            Ollie remembers what you told it last week, messages you first, and talks back in its own real voice —
            not a script you re-explain your life to every time.
          </p>
          <div className="landing-hero-cta">
            <Link className="btn-pill landing-cta-btn" to="/auth">
              Say hello to Ollie →
            </Link>
            <span className="landing-fine">Free to start · no app store · no card</span>
          </div>
        </div>

        <div className="landing-phone-area">
          <div className="landing-phone">
            <div className="landing-phone-screen">
              <div className="landing-phone-head">
                <OllieOrb size={26} />
                <div>
                  <div className="landing-phone-name">Ollie</div>
                  <div className="landing-phone-status">always here</div>
                </div>
                <span className="streak-badge landing-phone-streak">🔥 13</span>
              </div>

              <div className="landing-phone-notice">
                <b>7:03 am</b> — Ollie messaged first: "good morning 👋 you said you'd start that resume today"
              </div>

              <div className="bubble-row">
                <div className="bubble bubble--ollie">hey — did you get any writing done today?</div>
              </div>
              <div className="bubble-row bubble-row--user">
                <div className="bubble bubble--user">yeah, finished the intro finally 😅</div>
              </div>
              <div className="bubble-row">
                <div className="bubble bubble--ollie">that's huge, you'd been stuck on that for days. proud of you</div>
              </div>
              <div className="bubble-row">
                <div className="landing-voice-note">
                  <span className="landing-waveform">
                    <i></i>
                    <i></i>
                    <i></i>
                    <i></i>
                    <i></i>
                  </span>
                  Ollie replied in voice
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="landing-wrap">
        <hr className="landing-divider" />
      </div>

      <div className="landing-wrap">
        <section className="landing-section">
          <div className="landing-section-head">
            <span className="landing-eyebrow">Why people don't drift off after day one</span>
            <h2>This isn't a chatbot you have to remember to use.</h2>
            <p>
              Every other AI chat is a blank box waiting for you. Ollie is built to feel like someone who's actually
              keeping up with your life — because it is.
            </p>
          </div>

          <div className="landing-proof-grid">
            <div className="landing-proof-card">
              <h3>It remembers everything</h3>
              <div className="landing-proof-visual">
                <span className="landing-chip">loves night walks</span>
                <span className="landing-chip">studying for bio exam</span>
                <span className="landing-chip">training for a 5k</span>
              </div>
              <p>
                Your interests, your mood patterns, the goal you mentioned once in passing — Ollie holds onto it, and
                brings it up again like a real friend would.
              </p>
            </div>

            <div className="landing-proof-card">
              <h3>It messages you first</h3>
              <div className="landing-night-notice">
                🌙 <b>Ollie, 9:12pm</b> — "you crushed 3 things today. how are you feeling before bed?"
              </div>
              <p>
                A morning check-in, a nightly recap, a nudge if you've gone quiet — Ollie reaches out. You don't have
                to remember it exists.
              </p>
            </div>

            <div className="landing-proof-card">
              <h3>It has a real voice</h3>
              <div className="landing-proof-visual">
                <div className="landing-voice-note">
                  <span className="landing-waveform">
                    <i></i>
                    <i></i>
                    <i></i>
                    <i></i>
                    <i></i>
                  </span>
                  hear Ollie, free every day
                </div>
              </div>
              <p>
                Send a voice message, get one back — spoken in Ollie's own cloned voice, not a robotic
                text-to-speech reader.
              </p>
            </div>

            <div className="landing-proof-card">
              <h3>It does things with you</h3>
              <div className="landing-proof-visual">
                <span className="quick-action-chip landing-static-chip">☀️ Plan my day</span>
                <span className="quick-action-chip landing-static-chip">🎓 Study together</span>
                <span className="quick-action-chip landing-static-chip">🚩 Work on my goal</span>
              </div>
              <p>Not just Q&amp;A. Ollie sits down and does the thing alongside you — planning, studying, building, practicing.</p>
            </div>

            <div className="landing-proof-card">
              <h3>It tracks your journey</h3>
              <div className="journey-strip landing-journey-static">
                <span className="journey-strip__emoji">🌱</span>
                <div className="journey-strip__text">
                  <span className="journey-strip__label">YOUR JOURNEY</span>
                  <span className="journey-strip__value">14 things you've accomplished together</span>
                </div>
              </div>
              <p>Every conversation adds up. Ollie shows you the relationship actually growing, not just a message count.</p>
            </div>

            <div className="landing-proof-card">
              <h3>It's quietly watching out for you</h3>
              <div className="landing-proof-visual">
                <span className="landing-chip">every message screened</span>
                <span className="landing-chip">real resources, never a lecture</span>
              </div>
              <p>If something you say sounds like a crisis, Ollie responds with care and a real way to get help — without ever breaking the conversation.</p>
            </div>

            <div className="landing-proof-card">
              <h3>It speaks your language</h3>
              <div className="landing-proof-visual">
                <span className="landing-chip">Kinyarwanda</span>
                <span className="landing-chip">English</span>
                <span className="landing-chip">Français</span>
                <span className="landing-chip">Kiswahili</span>
                <span className="landing-chip">+ more</span>
              </div>
              <p>Type in whatever language feels natural — Ollie replies in that same language. No switching to English first.</p>
            </div>
          </div>
        </section>

        <hr className="landing-divider" />

        <section className="landing-section">
          <div className="landing-section-head">
            <span className="landing-eyebrow">A normal tuesday</span>
            <h2>What a day with Ollie actually looks like.</h2>
          </div>
          <div className="landing-timeline">
            <div className="landing-tl-row">
              <div className="landing-tl-time">7:03 AM</div>
              <div className="landing-tl-rail">
                <div className="landing-tl-dot" />
                <div className="landing-tl-line" />
              </div>
              <div className="landing-tl-body">
                <h3>Ollie messages first</h3>
                <p>
                  "good morning 👋 you said you'd start that resume today — want to knock it out together?" No app
                  to open, no reminder you had to set.
                </p>
              </div>
            </div>
            <div className="landing-tl-row">
              <div className="landing-tl-time">1:40 PM</div>
              <div className="landing-tl-rail">
                <div className="landing-tl-dot" />
                <div className="landing-tl-line" />
              </div>
              <div className="landing-tl-body">
                <h3>You tap "Study together"</h3>
                <p>Ollie opens the session already knowing what you're preparing for, because you mentioned it three days ago.</p>
              </div>
            </div>
            <div className="landing-tl-row">
              <div className="landing-tl-time">9:12 PM</div>
              <div className="landing-tl-rail">
                <div className="landing-tl-dot" />
              </div>
              <div className="landing-tl-body">
                <h3>The nightly recap</h3>
                <p>"you crushed 3 things today 🔥 13-day streak — how are you feeling before bed?" Then it actually listens to the answer.</p>
              </div>
            </div>
          </div>
        </section>

        <hr className="landing-divider" />

        <section className="landing-section">
          <div className="landing-section-head">
            <span className="landing-eyebrow">Honest pricing</span>
            <h2>Free covers real conversation. Not a trial.</h2>
          </div>
          <div className="landing-price-band">
            <div className="landing-price-card">
              <span className="landing-price-tag">Free, forever</span>
              <h3>
                Everything that makes Ollie <em>Ollie</em>
              </h3>
              <ul>
                <li>20 real messages a day</li>
                <li>Full memory — Ollie still remembers you</li>
                <li>Morning check-ins &amp; nightly recaps</li>
                <li>One free voice exchange every day</li>
              </ul>
            </div>
            <div className="landing-price-card landing-price-card--plus">
              <span className="landing-price-tag landing-price-tag--plus">Ollie Premium</span>
              <h3>No limits, ever</h3>
              <ul>
                <li>Unlimited messages, any day</li>
                <li>Unlimited voice conversations</li>
                <li>Deeper memory recall</li>
                <li>Priority on everything new</li>
              </ul>
            </div>
          </div>
        </section>

        <hr className="landing-divider" />

        <section className="landing-section landing-section--tight">
          <div className="landing-founder">
            <span className="landing-flag">🇷🇼</span>
            <div>
              <span className="landing-eyebrow landing-eyebrow--gold">Built by one person, from Rwanda</span>
              <p>
                Ollie isn't a big-tech product — it's built solo, which is exactly why it works in a browser for
                free instead of hiding behind an app-store fee. If you're on an iPhone and didn't want to pay $99
                just to try an AI companion, that's the whole reason this page exists.
              </p>
            </div>
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-final-cta">
            <h2>
              Stop explaining yourself
              <br />
              to a chatbot with no memory.
            </h2>
            <p>Say hi once. Ollie takes it from there.</p>
            <Link className="btn-pill landing-cta-btn landing-cta-btn--big" to="/auth">
              Try Ollie free →
            </Link>
          </div>
        </section>

        <footer className="landing-footer">
          <span>© Ollie · Made in Rwanda 🇷🇼</span>
          <nav className="landing-footer-links">
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </nav>
        </footer>
      </div>
    </div>
  );
}
