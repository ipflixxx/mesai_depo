import { ar } from './locales/ar';
import { de } from './locales/de';
import { en } from './locales/en';
import { es } from './locales/es';
import { fr } from './locales/fr';
import { hi } from './locales/hi';
import { it } from './locales/it';
import { pt } from './locales/pt';
import { ru } from './locales/ru';
import { tr } from './locales/tr';
import {
  AppLanguage,
  LanguageMeta,
  SUPPORTED_LANGUAGES,
  SUPPORTED_LANGUAGE_CODES,
  TranslationSchema,
} from './types';

export type { AppLanguage, LanguageMeta, TranslationSchema } from './types';
export { SUPPORTED_LANGUAGES, SUPPORTED_LANGUAGE_CODES } from './types';

export const TRANSLATIONS: Record<AppLanguage, TranslationSchema> = {
  tr,
  en,
  de,
  fr,
  es,
  ar,
  ru,
  pt,
  it,
  hi,
};

const LANGUAGE_META_MAP: Record<AppLanguage, LanguageMeta> = SUPPORTED_LANGUAGES.reduce(
  (acc, item) => {
    acc[item.code] = item;
    return acc;
  },
  {} as Record<AppLanguage, LanguageMeta>
);

export function isSupportedLanguage(code: unknown): code is AppLanguage {
  return typeof code === 'string' && (SUPPORTED_LANGUAGE_CODES as readonly string[]).includes(code);
}

export function matchLanguageTag(rawTag: string | null | undefined): AppLanguage | null {
  if (!rawTag || typeof rawTag !== 'string') return null;
  const cleaned = rawTag.trim().toLowerCase();
  if (!cleaned) return null;
  const base = cleaned.split(/[-_]/)[0];
  return isSupportedLanguage(base) ? base : null;
}

export function detectSystemLanguage(candidateTags?: readonly string[]): AppLanguage {
  const tags: string[] = [];

  if (candidateTags && candidateTags.length > 0) {
    tags.push(...candidateTags);
  } else if (typeof navigator !== 'undefined') {
    if (Array.isArray(navigator.languages)) {
      tags.push(...navigator.languages);
    }
    if (navigator.language) {
      tags.push(navigator.language);
    }
  } else if (typeof Intl !== 'undefined') {
    try {
      const resolved = Intl.DateTimeFormat().resolvedOptions().locale;
      if (resolved) tags.push(resolved);
    } catch {
      // Ignore environment without Intl locale
    }
  }

  for (const tag of tags) {
    const matched = matchLanguageTag(tag);
    if (matched) return matched;
  }

  return 'en';
}

export function resolveLanguage(savedLanguage?: unknown): AppLanguage {
  if (isSupportedLanguage(savedLanguage)) {
    return savedLanguage;
  }
  return detectSystemLanguage();
}

export function getLanguageMeta(lang: AppLanguage): LanguageMeta {
  return LANGUAGE_META_MAP[lang] ?? LANGUAGE_META_MAP.en;
}

export function getTranslations(lang: AppLanguage): TranslationSchema {
  return TRANSLATIONS[lang] ?? TRANSLATIONS.en;
}

export function formatTemplate(
  template: string,
  vars: Record<string, string | number>
): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key: string) =>
    key in vars ? String(vars[key]) : `{${key}}`
  );
}
