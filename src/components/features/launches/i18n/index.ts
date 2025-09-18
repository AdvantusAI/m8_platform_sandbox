import en from './en.json';
import es from './es.json';

export type Language = 'en' | 'es';
export type TranslationKey = keyof typeof en;

const translations = { en, es };

let currentLanguage: Language = 'es';

export function setLanguage(lang: Language) {
  currentLanguage = lang;
}

export function getCurrentLanguage(): Language {
  return currentLanguage;
}

export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  let text = translations[currentLanguage][key] || translations['en'][key] || key;
  
  if (params) {
    Object.entries(params).forEach(([param, value]) => {
      text = text.replace(`{{${param}}}`, String(value));
    });
  }
  
  return text;
}

export function useTranslation() {
  return { t, setLanguage, currentLanguage };
}