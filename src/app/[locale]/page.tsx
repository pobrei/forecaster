import { Metadata } from 'next';
import { loadTranslations } from '@/lib/i18n';
import ForecastPage from '../page';

interface Props {
  params: { locale: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const translations = await loadTranslations(params.locale as any);
  
  return {
    title: translations.meta?.title || 'Forecaster - Weather Planning App',
    description: translations.meta?.description || 'Plan your routes with accurate weather forecasts',
    keywords: translations.meta?.keywords || 'weather, forecast, route planning, GPX',
    openGraph: {
      title: translations.meta?.title || 'Forecaster',
      description: translations.meta?.description || 'Weather planning made easy',
      locale: params.locale,
      alternateLocale: ['en', 'es', 'fr', 'de', 'ja', 'zh'].filter(l => l !== params.locale),
    },
  };
}

export default function LocalePage({ params }: Props) {
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
