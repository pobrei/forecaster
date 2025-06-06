'use client';

import { Inter } from 'next/font/google';
import { I18nProvider, loadTranslations } from '@/lib/i18n';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useEffect, useState } from 'react';
import '../globals.css';

const inter = Inter({ subsets: ['latin'] });

export default function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const [translations, setTranslations] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [locale, setLocale] = useState<string>('en');

  useEffect(() => {
    const loadLocaleTranslations = async () => {
      try {
        const resolvedParams = await params;
        const currentLocale = resolvedParams.locale;
        setLocale(currentLocale);

        const localeTranslations = await loadTranslations(currentLocale as any);
        setTranslations({ [currentLocale]: localeTranslations });
      } catch (error) {
        console.warn(`Failed to load translations, falling back to English`);
        const fallbackTranslations = await loadTranslations('en');
        setTranslations({ en: fallbackTranslations });
      } finally {
        setLoading(false);
      }
    };

    loadLocaleTranslations();
  }, [params]);

  if (loading) {
    return (
      <html lang={locale}>
        <body className={inter.className}>
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <body className={inter.className}>
        <I18nProvider translations={translations}>
          <header className="border-b">
            <div className="container mx-auto px-4 py-2 flex justify-between items-center">
              <h1>Forecaster</h1>
              <LanguageSwitcher />
            </div>
          </header>
          <main>{children}</main>
        </I18nProvider>
      </body>
    </html>
  );
}
