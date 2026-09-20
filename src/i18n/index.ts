import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import pt from './locales/pt.json';
import rw from './locales/rw.json';
import hi from './locales/hi.json';
import ur from './locales/ur.json';
import ar from './locales/ar.json';
import fr from './locales/fr.json';
import sw from './locales/sw.json';
import es from './locales/es.json';
import zh from './locales/zh.json';

// The first eight were chosen from this app's own Vercel Analytics
// country breakdown, not a generic "top world languages" guess --
// each one maps to a real, substantial slice of ourollie.space's
// actual visitors (Angola -> pt, Rwanda -> rw, India -> hi, Pakistan
// -> ur, Egypt/Saudi Arabia -> ar, France -> fr, Kenya -> sw).
// Spanish and Chinese were added on top of that by direct request,
// not from analytics -- the single Rwanda data point is plausibly
// just the app's own developer testing it, so it isn't being treated
// as strong evidence either way.
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'pt', label: 'Português' },
  { code: 'rw', label: 'Ikinyarwanda' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ur', label: 'اردو' },
  { code: 'ar', label: 'العربية' },
  { code: 'fr', label: 'Français' },
  { code: 'sw', label: 'Kiswahili' },
  { code: 'es', label: 'Español' },
  { code: 'zh', label: '中文' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

// Same set every real UI language ever needs from i18next -- RTL
// scripts (Arabic, Urdu) get mirrored automatically via i18n.dir(),
// applied to <html dir> in App.tsx whenever the language changes.
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      pt: { translation: pt },
      rw: { translation: rw },
      hi: { translation: hi },
      ur: { translation: ur },
      ar: { translation: ar },
      fr: { translation: fr },
      sw: { translation: sw },
      es: { translation: es },
      zh: { translation: zh },
    },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'ollie_language',
    },
    interpolation: { escapeValue: false },
  });

export default i18n;
