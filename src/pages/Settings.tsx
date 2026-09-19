import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  clearTokens,
  clearMemory,
  exportUserData,
  getPremiumStatus,
  getUsage,
  logout,
  PremiumStatus,
  requestDeleteAccount,
  setMemoryEnabled,
  updateLocation,
  updateNotificationFrequency,
  UsageInfo,
} from '../lib/api';
import './Settings.css';

// Ported from settings_screen.dart's section-by-section layout
// (Account / Usage / Notifications / Location / Memory / About).
// Left out on purpose, for now: the full "Manage memories" list/edit
// screen (memories_screen.dart) and a Play/LemonSqueezy customer-
// portal deep link for "Manage subscription" -- everything else here
// hits a real endpoint, nothing is a stub.

const FREQUENCY_OPTIONS = [
  { value: 'off', label: 'Off', description: "Ollie won't reach out first" },
  { value: 'low', label: 'Low', description: 'Just a morning hello' },
  { value: 'normal', label: 'Normal', description: 'Morning, evening, and check-ins' },
  { value: 'frequent', label: 'Frequent', description: "More often, checks in sooner if you're quiet" },
] as const;

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DELETE_PHRASE = 'DELETE';

function planLabel(productId: string | null): string | null {
  if (productId === 'ollie_premium_yearly_web') return 'Yearly';
  if (productId === 'ollie_premium_monthly_web') return 'Monthly';
  return null;
}

function renewalSummary(expiryMs: number | null): string | null {
  if (!expiryMs) return null;
  const date = new Date(expiryMs);
  return `Renews ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function locationSummary(country: string | null, region: string | null, district: string | null): string {
  const parts = [district, region, country].filter((p) => p && p.trim());
  return parts.length ? parts.join(', ') : 'Not set';
}

type ConfirmAction = 'logout' | 'clearMemory' | null;

export default function Settings() {
  const navigate = useNavigate();
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [premium, setPremium] = useState<PremiumStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);

  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [exporting, setExporting] = useState(false);

  const [frequencyOpen, setFrequencyOpen] = useState(false);

  const [locationOpen, setLocationOpen] = useState(false);
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [district, setDistrict] = useState('');
  const [savingLocation, setSavingLocation] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getUsage()
      .then((u) => {
        setUsage(u);
        setCountry(u.country ?? '');
        setRegion(u.region ?? '');
        setDistrict(u.district ?? '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    getPremiumStatus().then(setPremium).catch(() => {});
  }, []);

  function flash(text: string, error = false) {
    setNotice({ text, error });
    setTimeout(() => setNotice(null), 3500);
  }

  async function handleLogout() {
    setConfirmAction(null);
    await logout();
    navigate('/auth');
  }

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      const data = await exportUserData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ollie-data-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      flash('Could not export your data, try again', true);
    } finally {
      setExporting(false);
    }
  }

  async function handleClearMemory() {
    setConfirmAction(null);
    try {
      await clearMemory();
      flash('Memory cleared');
    } catch {
      flash('Could not clear memory, try again', true);
    }
  }

  async function handleSetFrequency(value: (typeof FREQUENCY_OPTIONS)[number]['value']) {
    if (!usage) return;
    if (value === 'frequent' && !usage.is_premium) {
      navigate('/premium');
      return;
    }
    setFrequencyOpen(false);
    const previous = usage.notification_frequency;
    setUsage({ ...usage, notification_frequency: value });
    try {
      await updateNotificationFrequency(value);
    } catch {
      setUsage((u) => (u ? { ...u, notification_frequency: previous } : u));
      flash('Could not update notification setting', true);
    }
  }

  async function handleToggleMemory(enabled: boolean) {
    if (!usage) return;
    setUsage({ ...usage, memory_enabled: enabled });
    try {
      await setMemoryEnabled(enabled);
    } catch {
      setUsage((u) => (u ? { ...u, memory_enabled: !enabled } : u));
      flash('Could not update memory setting', true);
    }
  }

  async function handleSaveLocation() {
    setSavingLocation(true);
    try {
      const payload = {
        country: country.trim() || null,
        region: region.trim() || null,
        district: district.trim() || null,
      };
      await updateLocation(payload);
      setUsage((u) => (u ? { ...u, ...payload } : u));
      setLocationOpen(false);
      flash('Location updated');
    } catch {
      flash('Could not update location, try again', true);
    } finally {
      setSavingLocation(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText.trim() !== DELETE_PHRASE || deleting) return;
    setDeleting(true);
    try {
      await requestDeleteAccount(deleteConfirmText.trim());
      flash("Account deletion scheduled. Log back in before it's final to cancel. Logging you out…");
      setTimeout(() => {
        clearTokens();
        navigate('/');
      }, 2500);
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Could not schedule account deletion', true);
      setDeleting(false);
    }
  }

  const isPremium = usage?.is_premium ?? false;
  const plan = planLabel(premium?.product_id ?? null);
  const renewal = isPremium ? renewalSummary(premium?.expiry_time_millis ?? null) : null;
  const frequencyLabel = FREQUENCY_OPTIONS.find((o) => o.value === usage?.notification_frequency)?.label ?? 'Normal';

  return (
    <div className="page-shell settings-page">
      <header className="settings-header">
        <button className="settings-back" onClick={() => navigate('/home')} aria-label="Back">
          ←
        </button>
        <h1>Settings</h1>
      </header>

      {loading ? (
        <div className="settings-loading">Loading…</div>
      ) : (
        <div className="settings-list">
          <SectionLabel>Account</SectionLabel>
          <InfoTile icon="📧" title="Email" value={usage?.email ?? '—'} />
          <ActionTile icon="🚪" title="Log out" onClick={() => setConfirmAction('logout')} />
          <ActionTile icon="⬇️" title={exporting ? 'Preparing your export…' : 'Export my data'} onClick={handleExport} />
          <ActionTile icon="🗑️" title="Delete account" destructive onClick={() => setDeleteOpen((v) => !v)} />
          {deleteOpen && (
            <div className="settings-panel settings-panel--danger">
              <p className="settings-panel__hint">
                This starts a grace period before your account and everything in it is permanently deleted. Logging
                back in before then cancels it. Type <strong>{DELETE_PHRASE}</strong> to confirm.
              </p>
              <input
                className="field"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={DELETE_PHRASE}
                autoCapitalize="characters"
              />
              <button
                className="btn-pill settings-panel__confirm-btn settings-panel__confirm-btn--danger"
                disabled={deleteConfirmText.trim() !== DELETE_PHRASE || deleting}
                onClick={handleDeleteAccount}
              >
                {deleting ? 'Deleting…' : 'Delete my account'}
              </button>
            </div>
          )}

          <SectionLabel>Usage</SectionLabel>
          <InfoTile
            icon="💬"
            title="Messages today"
            value={`${usage?.messages_used_today ?? 0} / ${usage?.daily_limit ?? 20}${
              isPremium ? ' (premium — unlimited)' : ''
            }${usage?.has_active_ad_bonus ? ' · bonus active' : ''}`}
          />
          <InfoTile icon="🏆" title="Plan" value={isPremium ? plan ?? 'Premium' : 'Free'} />
          {isPremium && renewal && <InfoTile icon="🔁" title="Renewal" value={renewal} />}
          {!isPremium && <ActionTile icon="⭐" title="Upgrade to Premium" onClick={() => navigate('/premium')} />}

          <SectionLabel>Notifications</SectionLabel>
          <InfoTile icon="🔔" title="How often Ollie reaches out" value={frequencyLabel} />
          <ActionTile icon="⚙️" title="Change" onClick={() => setFrequencyOpen((v) => !v)} />
          {frequencyOpen && (
            <div className="settings-panel">
              {FREQUENCY_OPTIONS.map((option) => {
                const selected = option.value === usage?.notification_frequency;
                const locked = option.value === 'frequent' && !isPremium;
                return (
                  <button key={option.value} className="frequency-option" onClick={() => handleSetFrequency(option.value)}>
                    <span className={`frequency-option__dot${selected ? ' frequency-option__dot--selected' : ''}`} />
                    <span className="frequency-option__text">
                      <span className="frequency-option__label">
                        {option.label}
                        {locked && <span className="frequency-option__badge">PREMIUM</span>}
                      </span>
                      <span className="frequency-option__description">{option.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <SectionLabel>Location</SectionLabel>
          <InfoTile icon="📍" title="Your location" value={locationSummary(usage?.country ?? null, usage?.region ?? null, usage?.district ?? null)} />
          <ActionTile
            icon="✏️"
            title={usage?.country || usage?.region || usage?.district ? 'Edit location' : 'Set your location'}
            onClick={() => setLocationOpen((v) => !v)}
          />
          {locationOpen && (
            <div className="settings-panel">
              <p className="settings-panel__hint">
                So Ollie can talk like a local — reference your culture, holidays, what's actually going on where you
                are.
              </p>
              <input className="field" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" />
              <input
                className="field"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="State / Province / Region"
              />
              <input
                className="field"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="District / City (optional)"
              />
              <button className="btn-pill settings-panel__confirm-btn" disabled={savingLocation} onClick={handleSaveLocation}>
                {savingLocation ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}

          <SectionLabel>Memory</SectionLabel>
          <SwitchTile icon="🧠" title="Let Ollie remember" value={usage?.memory_enabled ?? true} onChange={handleToggleMemory} />
          <ActionTile icon="🔄" title="Clear Ollie's memory of you" destructive onClick={() => setConfirmAction('clearMemory')} />

          <SectionLabel>About</SectionLabel>
          <InfoTile icon="ℹ️" title="Ollie" value="Made in Rwanda 🇷🇼" />
          <ActionTile icon="🔒" title="Privacy Policy" onClick={() => navigate('/privacy')} />
          <ActionTile icon="📄" title="Terms of Service" onClick={() => navigate('/terms')} />
        </div>
      )}

      {notice && <div className={`settings-toast${notice.error ? ' settings-toast--error' : ''}`}>{notice.text}</div>}

      {confirmAction === 'logout' && (
        <ConfirmDialog
          title="Log out?"
          message="You can log back in anytime."
          confirmLabel="Log out"
          onConfirm={handleLogout}
          onCancel={() => setConfirmAction(null)}
        />
      )}
      {confirmAction === 'clearMemory' && (
        <ConfirmDialog
          title="Clear memory?"
          message="Ollie will forget everything it's learned about you — your interests, things you've shared, patterns it noticed. This can't be undone."
          confirmLabel="Clear memory"
          destructive
          onConfirm={handleClearMemory}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="settings-section-label">{children}</div>;
}

function InfoTile({ icon, title, value }: { icon: string; title: string; value: string }) {
  return (
    <div className="settings-tile">
      <span className="settings-tile__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="settings-tile__title">{title}</span>
      <span className="settings-tile__value">{value}</span>
    </div>
  );
}

function ActionTile({ icon, title, onClick, destructive }: { icon: string; title: string; onClick: () => void; destructive?: boolean }) {
  return (
    <button className={`settings-tile settings-tile--action${destructive ? ' settings-tile--destructive' : ''}`} onClick={onClick}>
      <span className="settings-tile__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="settings-tile__title">{title}</span>
      <span className="settings-tile__chevron" aria-hidden="true">
        ›
      </span>
    </button>
  );
}

function SwitchTile({ icon, title, value, onChange }: { icon: string; title: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="settings-tile">
      <span className="settings-tile__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="settings-tile__title">{title}</span>
      <button
        className={`settings-switch${value ? ' settings-switch--on' : ''}`}
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
      >
        <span className="settings-switch__knob" />
      </button>
    </div>
  );
}
