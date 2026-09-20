import { ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../components/ConfirmDialog';
import i18n, { SUPPORTED_LANGUAGES } from '../i18n';
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
// (Account / Usage / Notifications / Location / Memory / Language /
// About). Left out on purpose, for now: the full "Manage memories"
// list/edit screen (memories_screen.dart) and a Play/LemonSqueezy
// customer-portal deep link for "Manage subscription" -- everything
// else here hits a real endpoint, nothing is a stub.

const FREQUENCY_VALUES = ['off', 'low', 'normal', 'frequent'] as const;
type FrequencyValue = (typeof FREQUENCY_VALUES)[number];

const DELETE_PHRASE = 'DELETE';

function normalizeLanguage(lng: string): string {
  return lng.split('-')[0];
}

type ConfirmAction = 'logout' | 'clearMemory' | null;

export default function Settings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [premium, setPremium] = useState<PremiumStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);

  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [exporting, setExporting] = useState(false);

  const [frequencyOpen, setFrequencyOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);

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
      flash(t('settings.toastExportError'), true);
    } finally {
      setExporting(false);
    }
  }

  async function handleClearMemory() {
    setConfirmAction(null);
    try {
      await clearMemory();
      flash(t('settings.toastMemoryCleared'));
    } catch {
      flash(t('settings.toastMemoryClearError'), true);
    }
  }

  async function handleSetFrequency(value: FrequencyValue) {
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
      flash(t('settings.toastFrequencyError'), true);
    }
  }

  function handleSetLanguage(code: string) {
    setLanguageOpen(false);
    i18n.changeLanguage(code);
  }

  async function handleToggleMemory(enabled: boolean) {
    if (!usage) return;
    setUsage({ ...usage, memory_enabled: enabled });
    try {
      await setMemoryEnabled(enabled);
    } catch {
      setUsage((u) => (u ? { ...u, memory_enabled: !enabled } : u));
      flash(t('settings.toastMemoryToggleError'), true);
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
      flash(t('settings.toastLocationUpdated'));
    } catch {
      flash(t('settings.toastLocationError'), true);
    } finally {
      setSavingLocation(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText.trim() !== DELETE_PHRASE || deleting) return;
    setDeleting(true);
    try {
      await requestDeleteAccount(deleteConfirmText.trim());
      flash(t('settings.toastDeleteScheduled'));
      setTimeout(() => {
        clearTokens();
        navigate('/');
      }, 2500);
    } catch (err) {
      flash(err instanceof Error ? err.message : t('settings.toastDeleteError'), true);
      setDeleting(false);
    }
  }

  function planLabel(productId: string | null): string | null {
    if (productId === 'ollie_premium_yearly_web') return t('premium.yearly');
    if (productId === 'ollie_premium_monthly_web') return t('premium.monthly');
    return null;
  }

  function renewalSummary(expiryMs: number | null): string | null {
    if (!expiryMs) return null;
    const formatted = new Intl.DateTimeFormat(i18n.language, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(expiryMs));
    return t('settings.renewsOn', { date: formatted });
  }

  function locationSummary(): string {
    const parts = [usage?.district, usage?.region, usage?.country].filter((p) => p && p.trim());
    return parts.length ? parts.join(', ') : t('settings.locationNotSet');
  }

  const FREQUENCY_OPTIONS: Array<{ value: FrequencyValue; label: string; description: string }> = [
    { value: 'off', label: t('settings.freqOffLabel'), description: t('settings.freqOffDescription') },
    { value: 'low', label: t('settings.freqLowLabel'), description: t('settings.freqLowDescription') },
    { value: 'normal', label: t('settings.freqNormalLabel'), description: t('settings.freqNormalDescription') },
    { value: 'frequent', label: t('settings.freqFrequentLabel'), description: t('settings.freqFrequentDescription') },
  ];

  const isPremium = usage?.is_premium ?? false;
  const plan = planLabel(premium?.product_id ?? null);
  const renewal = isPremium ? renewalSummary(premium?.expiry_time_millis ?? null) : null;
  const frequencyLabel = FREQUENCY_OPTIONS.find((o) => o.value === usage?.notification_frequency)?.label ?? t('settings.freqNormalLabel');
  const currentLangCode = normalizeLanguage(i18n.language || 'en');
  const currentLanguageLabel = SUPPORTED_LANGUAGES.find((l) => l.code === currentLangCode)?.label ?? SUPPORTED_LANGUAGES[0].label;

  return (
    <div className="page-shell settings-page">
      <header className="settings-header">
        <button className="settings-back" onClick={() => navigate('/home')} aria-label={t('common.back')}>
          ←
        </button>
        <h1>{t('settings.title')}</h1>
      </header>

      {loading ? (
        <div className="settings-loading">{t('common.loading')}</div>
      ) : (
        <div className="settings-list">
          <SectionLabel>{t('settings.sectionAccount')}</SectionLabel>
          <InfoTile icon="📧" title={t('settings.email')} value={usage?.email ?? '—'} />
          <ActionTile icon="🚪" title={t('settings.logOut')} onClick={() => setConfirmAction('logout')} />
          <ActionTile
            icon="⬇️"
            title={exporting ? t('settings.exportPreparing') : t('settings.exportData')}
            onClick={handleExport}
          />
          <ActionTile icon="🗑️" title={t('settings.deleteAccount')} destructive onClick={() => setDeleteOpen((v) => !v)} />
          {deleteOpen && (
            <div className="settings-panel settings-panel--danger">
              <p className="settings-panel__hint">{t('settings.deleteHint', { phrase: DELETE_PHRASE })}</p>
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
                {deleting ? t('settings.deleting') : t('settings.deleteConfirmButton')}
              </button>
            </div>
          )}

          <SectionLabel>{t('settings.sectionUsage')}</SectionLabel>
          <InfoTile
            icon="💬"
            title={t('settings.messagesToday')}
            value={`${usage?.messages_used_today ?? 0} / ${usage?.daily_limit ?? 20}${
              isPremium ? t('settings.premiumUnlimited') : ''
            }${usage?.has_active_ad_bonus ? t('settings.bonusActive') : ''}`}
          />
          <InfoTile icon="🏆" title={t('settings.plan')} value={isPremium ? plan ?? t('settings.premiumBadge') : t('settings.planFree')} />
          {isPremium && renewal && <InfoTile icon="🔁" title={t('settings.renewal')} value={renewal} />}
          {!isPremium && <ActionTile icon="⭐" title={t('settings.upgradeToPremium')} onClick={() => navigate('/premium')} />}

          <SectionLabel>{t('settings.sectionNotifications')}</SectionLabel>
          <InfoTile icon="🔔" title={t('settings.reachOutFrequency')} value={frequencyLabel} />
          <ActionTile icon="⚙️" title={t('settings.change')} onClick={() => setFrequencyOpen((v) => !v)} />
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
                        {locked && <span className="frequency-option__badge">{t('settings.premiumBadge')}</span>}
                      </span>
                      <span className="frequency-option__description">{option.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <SectionLabel>{t('settings.sectionLocation')}</SectionLabel>
          <InfoTile icon="📍" title={t('settings.yourLocation')} value={locationSummary()} />
          <ActionTile
            icon="✏️"
            title={usage?.country || usage?.region || usage?.district ? t('settings.editLocation') : t('settings.setLocation')}
            onClick={() => setLocationOpen((v) => !v)}
          />
          {locationOpen && (
            <div className="settings-panel">
              <p className="settings-panel__hint">{t('settings.locationHint')}</p>
              <input
                className="field"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder={t('settings.countryPlaceholder')}
              />
              <input
                className="field"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder={t('settings.regionPlaceholder')}
              />
              <input
                className="field"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder={t('settings.districtPlaceholder')}
              />
              <button className="btn-pill settings-panel__confirm-btn" disabled={savingLocation} onClick={handleSaveLocation}>
                {savingLocation ? t('common.saving') : t('common.save')}
              </button>
            </div>
          )}

          <SectionLabel>{t('settings.sectionMemory')}</SectionLabel>
          <SwitchTile icon="🧠" title={t('settings.letOllieRemember')} value={usage?.memory_enabled ?? true} onChange={handleToggleMemory} />
          <ActionTile icon="🔄" title={t('settings.clearMemory')} destructive onClick={() => setConfirmAction('clearMemory')} />

          <SectionLabel>{t('settings.language')}</SectionLabel>
          <InfoTile icon="🌐" title={t('settings.chooseLanguage')} value={currentLanguageLabel} />
          <ActionTile icon="⚙️" title={t('settings.change')} onClick={() => setLanguageOpen((v) => !v)} />
          {languageOpen && (
            <div className="settings-panel">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const selected = lang.code === currentLangCode;
                return (
                  <button key={lang.code} className="frequency-option" onClick={() => handleSetLanguage(lang.code)}>
                    <span className={`frequency-option__dot${selected ? ' frequency-option__dot--selected' : ''}`} />
                    <span className="frequency-option__text">
                      <span className="frequency-option__label">{lang.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <SectionLabel>{t('settings.sectionAbout')}</SectionLabel>
          <InfoTile icon="ℹ️" title={t('settings.aboutOllie')} value={t('settings.madeInRwanda')} />
          <ActionTile icon="🔒" title={t('settings.privacyPolicy')} onClick={() => navigate('/privacy')} />
          <ActionTile icon="📄" title={t('settings.termsOfService')} onClick={() => navigate('/terms')} />
        </div>
      )}

      {notice && <div className={`settings-toast${notice.error ? ' settings-toast--error' : ''}`}>{notice.text}</div>}

      {confirmAction === 'logout' && (
        <ConfirmDialog
          title={t('settings.logOutTitle')}
          message={t('settings.logOutMessage')}
          confirmLabel={t('settings.logOut')}
          onConfirm={handleLogout}
          onCancel={() => setConfirmAction(null)}
        />
      )}
      {confirmAction === 'clearMemory' && (
        <ConfirmDialog
          title={t('settings.clearMemoryTitle')}
          message={t('settings.clearMemoryMessage')}
          confirmLabel={t('settings.clearMemoryConfirm')}
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
