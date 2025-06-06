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
  params: { locale: string };
}) {
  const [translations, setTranslations] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLocaleTranslations = async () => {
      try {
        const localeTranslations = await loadTranslations(params.locale as any);
        setTranslations({ [params.locale]: localeTranslations });
      } catch (error) {
        console.warn(`Failed to load translations for ${params.locale}, falling back to English`);
        const fallbackTranslations = await loadTranslations('en');
        setTranslations({ [params.locale]: fallbackTranslations });
      } finally {
        setLoading(false);
      }
    };

    loadLocaleTranslations();
  }, [params.locale]);

  if (loading) {
    return (
      <html lang={params.locale}>
        <body className={inter.className}>
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang={params.locale} dir={params.locale === 'ar' ? 'rtl' : 'ltr'}>
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
