/**
 * OMNI-CRM Translation Hook
 * React hook for multi-language support
 * 
 * Features:
 * - Language state management
 * - Translation function with variable interpolation
 * - RTL support
 * - Namespace support
 * - Local storage persistence
 * - Automatic language detection
 */

'use client';

import { useState, useEffect, useCallback, useMemo, createContext, useContext } from 'react';

// ============================================
// TYPES
// ============================================

export interface Language {
  id: string;
  code: string;
  name: string;
  nativeName: string;
  isRtl: boolean;
  isDefault: boolean;
  isActive: boolean;
}

export interface TranslationContextType {
  language: Language | null;
  languages: Language[];
  translations: Record<string, string>;
  direction: 'rtl' | 'ltr';
  isLoading: boolean;
  setLanguage: (code: string) => Promise<void>;
  t: (key: string, variables?: Record<string, string | number>) => string;
  tn: (namespace: string, key: string, variables?: Record<string, string | number>) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (value: number, currency: string) => string;
  formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) => string;
  formatRelativeTime: (value: number, unit: Intl.RelativeTimeFormatUnit) => string;
}

// ============================================
// CONTEXT
// ============================================

const TranslationContext = createContext<TranslationContextType | null>(null);

// ============================================
// STORAGE KEYS
// ============================================

const LANGUAGE_STORAGE_KEY = 'omnicrm_language';

// ============================================
// TRANSLATION PROVIDER
// ============================================

export function TranslationProvider({
  children,
  defaultLanguage = 'en',
}: {
  children: React.ReactNode;
  defaultLanguage?: string;
}) {
  const [language, setLanguageState] = useState<Language | null>(null);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [namespaceTranslations, setNamespaceTranslations] = useState<Record<string, Record<string, string>>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Direction based on current language
  const direction = useMemo(() => {
    return language?.isRtl ? 'rtl' : 'ltr';
  }, [language]);

  // Load languages on mount
  useEffect(() => {
    loadLanguages();
  }, []);

  // Load translations when language changes
  useEffect(() => {
    if (language) {
      loadTranslations(language.code);
    }
  }, [language]);

  // Apply direction to document
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = direction;
      document.documentElement.lang = language?.code || 'en';
    }
  }, [direction, language]);

  /**
   * Load available languages
   */
  const loadLanguages = async () => {
    try {
      const response = await fetch('/api/i18n/languages');
      const data = await response.json();

      if (data.success && data.data) {
        setLanguages(data.data);

        // Get stored language or default
        const storedCode = localStorage.getItem(LANGUAGE_STORAGE_KEY);
        const defaultLang = data.data.find((l: Language) => l.isDefault);
        
        if (storedCode) {
          const storedLang = data.data.find((l: Language) => l.code === storedCode);
          if (storedLang) {
            setLanguageState(storedLang);
          } else if (defaultLang) {
            setLanguageState(defaultLang);
          }
        } else if (defaultLang) {
          setLanguageState(defaultLang);
        } else if (data.data.length > 0) {
          setLanguageState(data.data[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load languages:', error);
      // Fallback to default language
      setLanguageState({
        id: 'en',
        code: 'en',
        name: 'English',
        nativeName: 'English',
        isRtl: false,
        isDefault: true,
        isActive: true,
        createdAt: new Date().toISOString() as unknown as Date,
        updatedAt: new Date().toISOString() as unknown as Date,
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load translations for a language
   */
  const loadTranslations = async (code: string) => {
    try {
      // Load common namespace
      const response = await fetch(`/api/i18n/translations?languageCode=${code}&namespace=common`);
      const data = await response.json();

      if (data.success && data.data) {
        setTranslations(data.data);
      }

      // Load all namespaces
      const allResponse = await fetch(`/api/i18n/translations?languageCode=${code}&all=true`);
      const allData = await allResponse.json();

      if (allData.success && allData.data) {
        setNamespaceTranslations(allData.data);
      }
    } catch (error) {
      console.error('Failed to load translations:', error);
    }
  };

  /**
   * Set current language
   */
  const setLanguage = async (code: string) => {
    const lang = languages.find((l) => l.code === code);
    if (lang) {
      setLanguageState(lang);
      localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
    }
  };

  /**
   * Translate a key
   */
  const t = useCallback(
    (key: string, variables?: Record<string, string | number>): string => {
      let value = translations[key];

      if (!value) {
        // Try nested key access (e.g., "dashboard.title")
        const parts = key.split('.');
        if (parts.length === 2) {
          const [namespace, k] = parts;
          value = namespaceTranslations[namespace]?.[k];
        }
      }

      if (!value) {
        // Return key as fallback
        return key;
      }

      // Interpolate variables
      if (variables) {
        for (const [varKey, varValue] of Object.entries(variables)) {
          value = value.replace(
            new RegExp(`\\{\\{\\s*${varKey}\\s*\\}\\}`, 'g'),
            String(varValue)
          );
        }
      }

      return value;
    },
    [translations, namespaceTranslations]
  );

  /**
   * Translate with explicit namespace
   */
  const tn = useCallback(
    (namespace: string, key: string, variables?: Record<string, string | number>): string => {
      let value = namespaceTranslations[namespace]?.[key];

      if (!value) {
        // Try common translations
        value = translations[key];
      }

      if (!value) {
        return key;
      }

      // Interpolate variables
      if (variables) {
        for (const [varKey, varValue] of Object.entries(variables)) {
          value = value.replace(
            new RegExp(`\\{\\{\\s*${varKey}\\s*\\}\\}`, 'g'),
            String(varValue)
          );
        }
      }

      return value;
    },
    [translations, namespaceTranslations]
  );

  /**
   * Format number for current locale
   */
  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions): string => {
      try {
        return new Intl.NumberFormat(language?.code || 'en', options).format(value);
      } catch {
        return String(value);
      }
    },
    [language]
  );

  /**
   * Format currency for current locale
   */
  const formatCurrency = useCallback(
    (value: number, currency: string): string => {
      try {
        return new Intl.NumberFormat(language?.code || 'en', {
          style: 'currency',
          currency,
        }).format(value);
      } catch {
        return `${currency} ${value}`;
      }
    },
    [language]
  );

  /**
   * Format date for current locale
   */
  const formatDate = useCallback(
    (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
      try {
        const d = typeof date === 'string' ? new Date(date) : date;
        return new Intl.DateTimeFormat(language?.code || 'en', options).format(d);
      } catch {
        return String(date);
      }
    },
    [language]
  );

  /**
   * Format relative time for current locale
   */
  const formatRelativeTime = useCallback(
    (value: number, unit: Intl.RelativeTimeFormatUnit): string => {
      try {
        return new Intl.RelativeTimeFormat(language?.code || 'en', {
          numeric: 'auto',
        }).format(value, unit);
      } catch {
        return `${value} ${unit}`;
      }
    },
    [language]
  );

  const value: TranslationContextType = {
    language,
    languages,
    translations,
    direction,
    isLoading,
    setLanguage,
    t,
    tn,
    formatNumber,
    formatCurrency,
    formatDate,
    formatRelativeTime,
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}

// ============================================
// USE TRANSLATION HOOK
// ============================================

export function useTranslation(): TranslationContextType {
  const context = useContext(TranslationContext);

  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }

  return context;
}

// ============================================
// SIMPLIFIED HOOKS
// ============================================

/**
 * Get current language code
 */
export function useLanguage(): string {
  const { language } = useTranslation();
  return language?.code || 'en';
}

/**
 * Get RTL status
 */
export function useRtl(): boolean {
  const { direction } = useTranslation();
  return direction === 'rtl';
}

/**
 * Get text direction
 */
export function useDirection(): 'rtl' | 'ltr' {
  const { direction } = useTranslation();
  return direction;
}

/**
 * Get translation function only
 */
export function useT() {
  const { t } = useTranslation();
  return t;
}

/**
 * Get namespaced translation function
 */
export function useTn(namespace: string) {
  const { tn } = useTranslation();
  return useCallback(
    (key: string, variables?: Record<string, string | number>) =>
      tn(namespace, key, variables),
    [tn, namespace]
  );
}

// ============================================
// LOCAL TRANSLATIONS HOOK
// ============================================

/**
 * Hook for using local translations without provider
 * Useful for components that don't need full i18n support
 */
export function useLocalTranslations(
  translations: Record<string, Record<string, string>>,
  language: string = 'en'
) {
  const t = useCallback(
    (key: string, variables?: Record<string, string | number>): string => {
      const langTranslations = translations[language] || translations['en'] || {};
      let value = langTranslations[key];

      if (!value) {
        return key;
      }

      if (variables) {
        for (const [varKey, varValue] of Object.entries(variables)) {
          value = value.replace(
            new RegExp(`\\{\\{\\s*${varKey}\\s*\\}\\}`, 'g'),
            String(varValue)
          );
        }
      }

      return value;
    },
    [translations, language]
  );

  const isRtl = useMemo(() => {
    const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
    return rtlLanguages.includes(language.toLowerCase());
  }, [language]);

  return { t, isRtl, direction: isRtl ? 'rtl' : 'ltr' as const };
}

// ============================================
// EXPORT
// ============================================

export default useTranslation;
