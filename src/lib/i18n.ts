'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import React from 'react';

// Translation type definitions
export type TranslationKey = string;
export type TranslationParams = Record<string, string | number>;
export type Locale = 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh';

// Translation context
interface I18nContextType {
  locale: Locale;
  t: (key: TranslationKey, params?: TranslationParams) => string;
  changeLocale: (locale: Locale) => void;
  formatDate: (date: Date) => string;
  formatNumber: (number: number) => string;
  formatCurrency: (amount: number, currency?: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Translation function
export const useTranslation = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
};

// Get nested translation value
const getNestedTranslation = (obj: any, path: string): string => {
  return path.split('.').reduce((current, key) => current?.[key], obj) || path;
};

// Replace parameters in translation
const replaceParams = (text: string, params?: TranslationParams): string => {
  if (!params) return text;
  
  return Object.entries(params).reduce((result, [key, value]) => {
    return result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }, text);
};

// i18n Provider component
interface I18nProviderProps {
  children: ReactNode;
  translations: Record<string, any>;
}

export const I18nProvider = ({ children, translations }: I18nProviderProps) => {
  const [locale, setLocale] = useState<Locale>('en');

  useEffect(() => {
    // Get locale from localStorage or browser language
    const savedLocale = localStorage.getItem('locale') as Locale;
    const browserLocale = navigator.language.split('-')[0] as Locale;
    const supportedLocales: Locale[] = ['en', 'es', 'fr', 'de', 'ja', 'zh'];

    const initialLocale = savedLocale ||
      (supportedLocales.includes(browserLocale) ? browserLocale : 'en');

    setLocale(initialLocale);
  }, []);

  const t = (key: TranslationKey, params?: TranslationParams): string => {
    const translation = getNestedTranslation(translations[locale], key);
    return replaceParams(translation, params);
  };

  const changeLocale = (newLocale: Locale) => {
    setLocale(newLocale);
    localStorage.setItem('locale', newLocale);
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const formatNumber = (number: number): string => {
    return new Intl.NumberFormat(locale).format(number);
  };

  const formatCurrency = (amount: number, currency = 'USD'): string => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const value: I18nContextType = {
    locale,
    t,
    changeLocale,
    formatDate,
    formatNumber,
    formatCurrency,
  };

  return React.createElement(I18nContext.Provider, { value }, children);
};

// Utility function to load translations
export const loadTranslations = async (locale: Locale) => {
  try {
    const translations = await import(`../../locales/${locale}.json`);
    return translations.default;
  } catch (error) {
    console.warn(`Failed to load translations for locale: ${locale}`);
    // Fallback to English
    const fallback = await import('../../locales/en.json');
    return fallback.default;
  }
};

// Server-side translation function
export const getServerSideTranslations = async (locale: string, namespaces: string[] = []) => {
  const translations = await loadTranslations(locale as Locale);
  
  if (namespaces.length === 0) {
    return { [locale]: translations };
  }
  
  const filteredTranslations: any = {};
  namespaces.forEach(namespace => {
    if (translations[namespace]) {
      filteredTranslations[namespace] = translations[namespace];
    }
  });
  
  return { [locale]: filteredTranslations };
};

// Static translation function for server components
export const createStaticTranslator = (translations: any, locale: string) => {
  return (key: TranslationKey, params?: TranslationParams): string => {
    const translation = getNestedTranslation(translations, key);
    return replaceParams(translation, params);
  };
};
