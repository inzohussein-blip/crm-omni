/**
 * OMNI-CRM Multi-language Support System
 * Internationalization (i18n) Service
 * 
 * Features:
 * - Translation management with database persistence
 * - Language management (CRUD operations)
 * - RTL (Right-to-Left) support detection
 * - Translation key management with namespaces
 * - Variable interpolation
 * - Fallback language support
 * - Caching for performance
 */

import { db } from './db';

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
  createdAt: Date;
  updatedAt: Date;
}

export interface Translation {
  id: string;
  languageCode: string;
  namespace: string;
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TranslationKey {
  namespace: string;
  key: string;
  value: string;
}

export interface TranslationsByNamespace {
  [namespace: string]: {
    [key: string]: string;
  };
}

export interface LanguageStats {
  code: string;
  name: string;
  totalTranslations: number;
  namespaces: string[];
  completionPercentage: number;
}

// ============================================
// TRANSLATION SERVICE CLASS
// ============================================

export class TranslationService {
  private cache: Map<string, TranslationsByNamespace> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly cacheTTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get all active languages
   */
  async getLanguages(): Promise<Language[]> {
    const languages = await db.language.findMany({
      where: { isActive: true },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
    return languages;
  }

  /**
   * Get all languages including inactive
   */
  async getAllLanguages(): Promise<Language[]> {
    const languages = await db.language.findMany({
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
    return languages;
  }

  /**
   * Get default language
   */
  async getDefaultLanguage(): Promise<Language | null> {
    const language = await db.language.findFirst({
      where: { isDefault: true, isActive: true },
    });
    return language;
  }

  /**
   * Get language by code
   */
  async getLanguageByCode(code: string): Promise<Language | null> {
    const language = await db.language.findUnique({
      where: { code },
    });
    return language;
  }

  /**
   * Create a new language
   */
  async createLanguage(data: {
    code: string;
    name: string;
    nativeName: string;
    isRtl?: boolean;
    isDefault?: boolean;
  }): Promise<Language> {
    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await db.language.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const language = await db.language.create({
      data: {
        code: data.code.toLowerCase(),
        name: data.name,
        nativeName: data.nativeName,
        isRtl: data.isRtl ?? false,
        isDefault: data.isDefault ?? false,
        isActive: true,
      },
    });

    return language;
  }

  /**
   * Update language
   */
  async updateLanguage(
    code: string,
    data: Partial<{
      name: string;
      nativeName: string;
      isRtl: boolean;
      isDefault: boolean;
      isActive: boolean;
    }>
  ): Promise<Language | null> {
    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await db.language.updateMany({
        where: { isDefault: true, code: { not: code } },
        data: { isDefault: false },
      });
    }

    const language = await db.language.update({
      where: { code },
      data,
    });

    // Clear cache for this language
    this.clearCache(code);

    return language;
  }

  /**
   * Delete language (soft delete by setting inactive)
   */
  async deleteLanguage(code: string): Promise<boolean> {
    const language = await db.language.findUnique({
      where: { code },
    });

    if (!language) return false;

    // Cannot delete default language
    if (language.isDefault) {
      throw new Error('Cannot delete default language');
    }

    await db.language.update({
      where: { code },
      data: { isActive: false },
    });

    // Clear cache
    this.clearCache(code);

    return true;
  }

  /**
   * Check if language is RTL
   */
  isRtlLanguage(language: Language | null): boolean {
    return language?.isRtl ?? false;
  }

  /**
   * Get text direction for language
   */
  getTextDirection(language: Language | null): 'rtl' | 'ltr' {
    return this.isRtlLanguage(language) ? 'rtl' : 'ltr';
  }

  /**
   * Get all RTL language codes
   */
  async getRtlLanguageCodes(): Promise<string[]> {
    const languages = await db.language.findMany({
      where: { isRtl: true, isActive: true },
      select: { code: true },
    });
    return languages.map((l) => l.code);
  }

  /**
   * Get translations for a language and namespace
   */
  async getTranslations(
    languageCode: string,
    namespace: string = 'common'
  ): Promise<Record<string, string>> {
    const cacheKey = `${languageCode}:${namespace}`;

    // Check cache
    if (this.isCacheValid(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (cached) return cached[namespace] || {};
    }

    const translations = await db.translation.findMany({
      where: { languageCode, namespace },
    });

    const result: Record<string, string> = {};
    for (const t of translations) {
      result[t.key] = t.value;
    }

    // Update cache
    if (!this.cache.has(cacheKey)) {
      this.cache.set(cacheKey, {});
    }
    const cached = this.cache.get(cacheKey)!;
    cached[namespace] = result;
    this.cacheExpiry.set(cacheKey, Date.now() + this.cacheTTL);

    return result;
  }

  /**
   * Get all translations for a language (all namespaces)
   */
  async getAllTranslations(languageCode: string): Promise<TranslationsByNamespace> {
    const translations = await db.translation.findMany({
      where: { languageCode },
    });

    const result: TranslationsByNamespace = {};
    for (const t of translations) {
      if (!result[t.namespace]) {
        result[t.namespace] = {};
      }
      result[t.namespace][t.key] = t.value;
    }

    return result;
  }

  /**
   * Get a single translation
   */
  async getTranslation(
    languageCode: string,
    namespace: string,
    key: string
  ): Promise<string | null> {
    const translation = await db.translation.findUnique({
      where: {
        languageCode_namespace_key: {
          languageCode,
          namespace,
          key,
        },
      },
    });

    return translation?.value ?? null;
  }

  /**
   * Set a translation (create or update)
   */
  async setTranslation(
    languageCode: string,
    namespace: string,
    key: string,
    value: string
  ): Promise<Translation> {
    const translation = await db.translation.upsert({
      where: {
        languageCode_namespace_key: {
          languageCode,
          namespace,
          key,
        },
      },
      create: {
        languageCode,
        namespace,
        key,
        value,
      },
      update: {
        value,
      },
    });

    // Clear cache for this language
    this.clearCache(languageCode);

    return translation;
  }

  /**
   * Set multiple translations at once
   */
  async setTranslations(
    languageCode: string,
    namespace: string,
    translations: Record<string, string>
  ): Promise<number> {
    const operations = Object.entries(translations).map(([key, value]) =>
      db.translation.upsert({
        where: {
          languageCode_namespace_key: {
            languageCode,
            namespace,
            key,
          },
        },
        create: {
          languageCode,
          namespace,
          key,
          value,
        },
        update: {
          value,
        },
      })
    );

    await Promise.all(operations);

    // Clear cache
    this.clearCache(languageCode);

    return operations.length;
  }

  /**
   * Delete a translation
   */
  async deleteTranslation(
    languageCode: string,
    namespace: string,
    key: string
  ): Promise<boolean> {
    try {
      await db.translation.delete({
        where: {
          languageCode_namespace_key: {
            languageCode,
            namespace,
            key,
          },
        },
      });

      // Clear cache
      this.clearCache(languageCode);

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete all translations for a namespace
   */
  async deleteNamespaceTranslations(
    languageCode: string,
    namespace: string
  ): Promise<number> {
    const result = await db.translation.deleteMany({
      where: { languageCode, namespace },
    });

    // Clear cache
    this.clearCache(languageCode);

    return result.count;
  }

  /**
   * Translate a key with variable interpolation
   * Supports {{variable}} syntax
   */
  translate(
    key: string,
    translations: Record<string, string>,
    variables?: Record<string, string | number>
  ): string {
    let value = translations[key];

    if (!value) {
      // Return key as fallback
      return key;
    }

    // Interpolate variables
    if (variables) {
      for (const [varKey, varValue] of Object.entries(variables)) {
        value = value.replace(new RegExp(`\\{\\{\\s*${varKey}\\s*\\}\\}`, 'g'), String(varValue));
      }
    }

    return value;
  }

  /**
   * Translate with fallback
   */
  async translateWithFallback(
    key: string,
    languageCode: string,
    fallbackCode: string = 'en',
    namespace: string = 'common',
    variables?: Record<string, string | number>
  ): Promise<string> {
    // Try primary language
    let value = await this.getTranslation(languageCode, namespace, key);

    // Fallback to default language
    if (!value && languageCode !== fallbackCode) {
      value = await this.getTranslation(fallbackCode, namespace, key);
    }

    // Return key if no translation found
    if (!value) {
      return key;
    }

    // Interpolate variables
    if (variables) {
      for (const [varKey, varValue] of Object.entries(variables)) {
        value = value.replace(new RegExp(`\\{\\{\\s*${varKey}\\s*\\}\\}`, 'g'), String(varValue));
      }
    }

    return value;
  }

  /**
   * Get language statistics
   */
  async getLanguageStats(languageCode: string): Promise<LanguageStats | null> {
    const language = await this.getLanguageByCode(languageCode);
    if (!language) return null;

    const translations = await db.translation.findMany({
      where: { languageCode },
      select: { namespace: true, key: true },
    });

    // Get all unique namespaces
    const namespaces = [...new Set(translations.map((t) => t.namespace))];

    // Get reference language (default) for completion percentage
    const defaultLanguage = await this.getDefaultLanguage();
    let completionPercentage = 100;

    if (defaultLanguage && defaultLanguage.code !== languageCode) {
      const defaultTranslations = await db.translation.count({
        where: { languageCode: defaultLanguage.code },
      });

      if (defaultTranslations > 0) {
        completionPercentage = Math.round((translations.length / defaultTranslations) * 100);
      }
    }

    return {
      code: language.code,
      name: language.name,
      totalTranslations: translations.length,
      namespaces,
      completionPercentage,
    };
  }

  /**
   * Get all language statistics
   */
  async getAllLanguageStats(): Promise<LanguageStats[]> {
    const languages = await this.getLanguages();
    const stats = await Promise.all(
      languages.map((lang) => this.getLanguageStats(lang.code))
    );
    return stats.filter((s): s is LanguageStats => s !== null);
  }

  /**
   * Import translations from JSON
   */
  async importTranslations(
    languageCode: string,
    translations: TranslationsByNamespace,
    clearExisting: boolean = false
  ): Promise<{ namespaces: number; keys: number }> {
    // Verify language exists
    const language = await this.getLanguageByCode(languageCode);
    if (!language) {
      throw new Error(`Language not found: ${languageCode}`);
    }

    // Clear existing translations if requested
    if (clearExisting) {
      await db.translation.deleteMany({
        where: { languageCode },
      });
    }

    let namespaces = 0;
    let keys = 0;

    for (const [namespace, nsTranslations] of Object.entries(translations)) {
      namespaces++;
      for (const [key, value] of Object.entries(nsTranslations)) {
        await this.setTranslation(languageCode, namespace, key, value);
        keys++;
      }
    }

    // Clear cache
    this.clearCache(languageCode);

    return { namespaces, keys };
  }

  /**
   * Export translations to JSON
   */
  async exportTranslations(languageCode: string): Promise<TranslationsByNamespace> {
    return this.getAllTranslations(languageCode);
  }

  /**
   * Get missing translations (compare to reference language)
   */
  async getMissingTranslations(
    languageCode: string,
    referenceCode: string = 'en'
  ): Promise<TranslationKey[]> {
    const referenceTranslations = await db.translation.findMany({
      where: { languageCode: referenceCode },
    });

    const languageTranslations = await db.translation.findMany({
      where: { languageCode },
    });

    const existingKeys = new Set(
      languageTranslations.map((t) => `${t.namespace}:${t.key}`)
    );

    const missing: TranslationKey[] = [];

    for (const ref of referenceTranslations) {
      const key = `${ref.namespace}:${ref.key}`;
      if (!existingKeys.has(key)) {
        missing.push({
          namespace: ref.namespace,
          key: ref.key,
          value: ref.value,
        });
      }
    }

    return missing;
  }

  /**
   * Copy translations from one language to another
   */
  async copyTranslations(
    sourceCode: string,
    targetCode: string,
    namespace?: string
  ): Promise<number> {
    const where: { languageCode: string; namespace?: string } = { languageCode: sourceCode };
    if (namespace) {
      where.namespace = namespace;
    }

    const sourceTranslations = await db.translation.findMany({ where });

    const operations = sourceTranslations.map((t) =>
      db.translation.upsert({
        where: {
          languageCode_namespace_key: {
            languageCode: targetCode,
            namespace: t.namespace,
            key: t.key,
          },
        },
        create: {
          languageCode: targetCode,
          namespace: t.namespace,
          key: t.key,
          value: t.value,
        },
        update: {
          value: t.value,
        },
      })
    );

    await Promise.all(operations);

    // Clear cache
    this.clearCache(targetCode);

    return operations.length;
  }

  // ============================================
  // CACHE MANAGEMENT
  // ============================================

  private isCacheValid(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    return expiry ? Date.now() < expiry : false;
  }

  private clearCache(languageCode?: string): void {
    if (languageCode) {
      // Clear cache for specific language
      for (const key of this.cache.keys()) {
        if (key.startsWith(languageCode)) {
          this.cache.delete(key);
          this.cacheExpiry.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.cache.clear();
      this.cacheExpiry.clear();
    }
  }

  /**
   * Clear all translation cache
   */
  clearAllCache(): void {
    this.clearCache();
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const translationService = new TranslationService();

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get text direction for a language code
 */
export function getTextDirection(code: string): 'rtl' | 'ltr' {
  const rtlLanguages = ['ar', 'he', 'fa', 'ur', 'ku', 'ps', 'sd'];
  return rtlLanguages.includes(code.toLowerCase()) ? 'rtl' : 'ltr';
}

/**
 * Check if language is RTL
 */
export function isRtl(code: string): boolean {
  return getTextDirection(code) === 'rtl';
}

/**
 * Format number for locale
 */
export function formatNumber(
  value: number,
  languageCode: string,
  options?: Intl.NumberFormatOptions
): string {
  try {
    return new Intl.NumberFormat(languageCode, options).format(value);
  } catch {
    return String(value);
  }
}

/**
 * Format currency for locale
 */
export function formatCurrency(
  value: number,
  currency: string,
  languageCode: string
): string {
  try {
    return new Intl.NumberFormat(languageCode, {
      style: 'currency',
      currency,
    }).format(value);
  } catch {
    return `${currency} ${value}`;
  }
}

/**
 * Format date for locale
 */
export function formatDate(
  date: Date | string,
  languageCode: string,
  options?: Intl.DateTimeFormatOptions
): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(languageCode, options).format(d);
  } catch {
    return String(date);
  }
}

/**
 * Format relative time for locale
 */
export function formatRelativeTime(
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  languageCode: string
): string {
  try {
    return new Intl.RelativeTimeFormat(languageCode, {
      numeric: 'auto',
    }).format(value, unit);
  } catch {
    return `${value} ${unit}`;
  }
}

/**
 * Get all available locales in the system
 */
export function getAvailableLocales(): string[] {
  return ['en', 'ar', 'fr', 'es', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko'];
}
