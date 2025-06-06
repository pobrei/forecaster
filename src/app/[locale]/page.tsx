import { Metadata } from 'next';
import { loadTranslations } from '@/lib/i18n';
import ForecastPage from '../page';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const translations = await loadTranslations(resolvedParams.locale as any);

  return {
    title: translations.meta?.title || 'Forecaster - Weather Planning App',
    description: translations.meta?.description || 'Plan your routes with accurate weather forecasts',
    keywords: translations.meta?.keywords || 'weather, forecast, route planning, GPX',
    openGraph: {
      title: translations.meta?.title || 'Forecaster',
      description: translations.meta?.description || 'Weather planning made easy',
      locale: resolvedParams.locale,
      alternateLocale: ['en', 'es', 'fr', 'de', 'ja', 'zh'].filter(l => l !== resolvedParams.locale),
    },
  };
}

export default function LocalePage({ params }: Props) {
  // params is not used in this component, just pass through to ForecastPage
  return <ForecastPage />;
}

export async function generateStaticParams() {
  return [
    { locale: 'en' },
    { locale: 'es' },
    { locale: 'fr' },
    { locale: 'de' },
    { locale: 'ja' },
    { locale: 'zh' },
  ];
}
