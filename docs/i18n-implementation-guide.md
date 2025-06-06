# 3.4 Internationalization (i18n)

## Justification
Internationalization enables global reach and accessibility:
- **Market Expansion**: Reach users in different countries and languages
- **User Experience**: Provide native language support for better usability
- **Accessibility**: Support right-to-left languages and cultural preferences
- **SEO Benefits**: Improved search rankings in different regions
- **Compliance**: Meet local regulations and standards

## Implementation Plan

### Week 1-2: Next.js i18n Setup
1. Configure Next.js built-in i18n support
2. Set up routing for different locales
3. Create translation file structure

### Week 3-4: Component Internationalization
1. Implement translation hooks and providers
2. Translate UI components and messages
3. Handle date, number, and currency formatting

### Week 5-6: Advanced Features
1. Dynamic content translation
2. Language detection and switching
3. SEO optimization for multiple languages

## Next.js i18n Configuration

### next.config.ts (Enhanced)
```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Existing configuration...
  
  i18n: {
    locales: ['en', 'es', 'fr', 'de', 'ja', 'zh'],
    defaultLocale: 'en',
    localeDetection: true,
    domains: [
      {
        domain: 'forecaster.com',
        defaultLocale: 'en',
      },
      {
        domain: 'forecaster.es',
        defaultLocale: 'es',
      },
      {
        domain: 'forecaster.fr',
        defaultLocale: 'fr',
      },
    ],
  },
  
  // Webpack configuration for translation files
  webpack: (config, { isServer }) => {
    // Handle translation file imports
    config.module.rules.push({
      test: /\.json$/,
      type: 'json',
    });
    
    return config;
  },
};

export default nextConfig;
```

## Translation Files Structure

### locales/en.json
```json
{
  "common": {
    "loading": "Loading...",
    "error": "Error",
    "success": "Success",
    "cancel": "Cancel",
    "save": "Save",
    "delete": "Delete",
    "edit": "Edit",
    "close": "Close",
    "back": "Back",
    "next": "Next",
    "previous": "Previous"
  },
  "navigation": {
    "home": "Home",
    "about": "About",
    "contact": "Contact",
    "settings": "Settings",
    "help": "Help"
  },
  "weather": {
    "title": "Weather Forecast",
    "temperature": "Temperature",
    "humidity": "Humidity",
    "pressure": "Pressure",
    "windSpeed": "Wind Speed",
    "windDirection": "Wind Direction",
    "precipitation": "Precipitation",
    "feelsLike": "Feels Like",
    "visibility": "Visibility",
    "uvIndex": "UV Index"
  },
  "gpx": {
    "upload": "Upload GPX File",
    "uploadDescription": "Select a GPX file to analyze your route",
    "processing": "Processing GPX file...",
    "success": "GPX file processed successfully",
    "error": "Error processing GPX file",
    "invalidFile": "Invalid GPX file format",
    "fileTooLarge": "File size exceeds maximum limit",
    "noRouteFound": "No route data found in GPX file"
  },
  "map": {
    "title": "Route Map",
    "zoomIn": "Zoom In",
    "zoomOut": "Zoom Out",
    "resetView": "Reset View",
    "fullscreen": "Fullscreen",
    "layers": "Map Layers",
    "satellite": "Satellite",
    "terrain": "Terrain",
    "street": "Street Map"
  },
  "charts": {
    "title": "Weather Charts",
    "temperatureChart": "Temperature Chart",
    "precipitationChart": "Precipitation Chart",
    "windChart": "Wind Chart",
    "atmosphericChart": "Atmospheric Conditions",
    "noData": "No weather data available",
    "clickToSelect": "Click on chart points to view details"
  },
  "export": {
    "title": "Export Report",
    "pdf": "Export as PDF",
    "csv": "Export as CSV",
    "json": "Export as JSON",
    "generating": "Generating report...",
    "success": "Report generated successfully",
    "error": "Error generating report"
  },
  "settings": {
    "title": "Settings",
    "language": "Language",
    "units": "Units",
    "metric": "Metric",
    "imperial": "Imperial",
    "theme": "Theme",
    "light": "Light",
    "dark": "Dark",
    "auto": "Auto"
  },
  "errors": {
    "generic": "An unexpected error occurred",
    "network": "Network connection error",
    "timeout": "Request timeout",
    "unauthorized": "Unauthorized access",
    "forbidden": "Access forbidden",
    "notFound": "Resource not found",
    "serverError": "Internal server error",
    "rateLimited": "Too many requests. Please try again later."
  },
  "validation": {
    "required": "This field is required",
    "invalidEmail": "Invalid email address",
    "invalidUrl": "Invalid URL format",
    "fileTooLarge": "File size is too large",
    "invalidFileType": "Invalid file type"
  }
}
```

### locales/es.json
```json
{
  "common": {
    "loading": "Cargando...",
    "error": "Error",
    "success": "Éxito",
    "cancel": "Cancelar",
    "save": "Guardar",
    "delete": "Eliminar",
    "edit": "Editar",
    "close": "Cerrar",
    "back": "Atrás",
    "next": "Siguiente",
    "previous": "Anterior"
  },
  "navigation": {
    "home": "Inicio",
    "about": "Acerca de",
    "contact": "Contacto",
    "settings": "Configuración",
    "help": "Ayuda"
  },
  "weather": {
    "title": "Pronóstico del Tiempo",
    "temperature": "Temperatura",
    "humidity": "Humedad",
    "pressure": "Presión",
    "windSpeed": "Velocidad del Viento",
    "windDirection": "Dirección del Viento",
    "precipitation": "Precipitación",
    "feelsLike": "Sensación Térmica",
    "visibility": "Visibilidad",
    "uvIndex": "Índice UV"
  },
  "gpx": {
    "upload": "Subir Archivo GPX",
    "uploadDescription": "Selecciona un archivo GPX para analizar tu ruta",
    "processing": "Procesando archivo GPX...",
    "success": "Archivo GPX procesado exitosamente",
    "error": "Error al procesar archivo GPX",
    "invalidFile": "Formato de archivo GPX inválido",
    "fileTooLarge": "El tamaño del archivo excede el límite máximo",
    "noRouteFound": "No se encontraron datos de ruta en el archivo GPX"
  },
  "map": {
    "title": "Mapa de Ruta",
    "zoomIn": "Acercar",
    "zoomOut": "Alejar",
    "resetView": "Restablecer Vista",
    "fullscreen": "Pantalla Completa",
    "layers": "Capas del Mapa",
    "satellite": "Satélite",
    "terrain": "Terreno",
    "street": "Mapa de Calles"
  },
  "charts": {
    "title": "Gráficos del Tiempo",
    "temperatureChart": "Gráfico de Temperatura",
    "precipitationChart": "Gráfico de Precipitación",
    "windChart": "Gráfico de Viento",
    "atmosphericChart": "Condiciones Atmosféricas",
    "noData": "No hay datos meteorológicos disponibles",
    "clickToSelect": "Haz clic en los puntos del gráfico para ver detalles"
  },
  "export": {
    "title": "Exportar Reporte",
    "pdf": "Exportar como PDF",
    "csv": "Exportar como CSV",
    "json": "Exportar como JSON",
    "generating": "Generando reporte...",
    "success": "Reporte generado exitosamente",
    "error": "Error al generar reporte"
  },
  "settings": {
    "title": "Configuración",
    "language": "Idioma",
    "units": "Unidades",
    "metric": "Métrico",
    "imperial": "Imperial",
    "theme": "Tema",
    "light": "Claro",
    "dark": "Oscuro",
    "auto": "Automático"
  },
  "errors": {
    "generic": "Ocurrió un error inesperado",
    "network": "Error de conexión de red",
    "timeout": "Tiempo de espera agotado",
    "unauthorized": "Acceso no autorizado",
    "forbidden": "Acceso prohibido",
    "notFound": "Recurso no encontrado",
    "serverError": "Error interno del servidor",
    "rateLimited": "Demasiadas solicitudes. Inténtalo de nuevo más tarde."
  },
  "validation": {
    "required": "Este campo es obligatorio",
    "invalidEmail": "Dirección de correo electrónico inválida",
    "invalidUrl": "Formato de URL inválido",
    "fileTooLarge": "El tamaño del archivo es demasiado grande",
    "invalidFileType": "Tipo de archivo inválido"
  }
}
```

## i18n Hook and Provider

### src/lib/i18n.ts
```typescript
import { useRouter } from 'next/router';
import { createContext, useContext, ReactNode } from 'react';

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
  const router = useRouter();
  const locale = (router.locale || 'en') as Locale;

  const t = (key: TranslationKey, params?: TranslationParams): string => {
    const translation = getNestedTranslation(translations[locale], key);
    return replaceParams(translation, params);
  };

  const changeLocale = (newLocale: Locale) => {
    router.push(router.asPath, router.asPath, { locale: newLocale });
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

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
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
```

## Language Switcher Component

### src/components/ui/LanguageSwitcher.tsx
```typescript
'use client';

import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
];

export function LanguageSwitcher() {
  const { locale, changeLocale, t } = useTranslation();

  const currentLanguage = languages.find(lang => lang.code === locale);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">
            {currentLanguage?.flag} {currentLanguage?.name}
          </span>
          <span className="sm:hidden">{currentLanguage?.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => changeLocale(language.code as any)}
            className={locale === language.code ? 'bg-accent' : ''}
          >
            <span className="mr-2">{language.flag}</span>
            {language.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

## App Integration

### src/app/layout.tsx (Enhanced)
```typescript
import { Inter } from 'next/font/google';
import { I18nProvider, loadTranslations } from '@/lib/i18n';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export default async function RootLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const translations = await loadTranslations(locale as any);

  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <body className={inter.className}>
        <I18nProvider translations={{ [locale]: translations }}>
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
```

### Component Usage Example
```typescript
'use client';

import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function WeatherCard({ temperature, humidity }: { temperature: number; humidity: number }) {
  const { t, formatNumber } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('weather.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div>
            <span className="font-medium">{t('weather.temperature')}:</span>
            <span className="ml-2">{formatNumber(temperature)}°C</span>
          </div>
          <div>
            <span className="font-medium">{t('weather.humidity')}:</span>
            <span className="ml-2">{formatNumber(humidity)}%</span>
          </div>
        </div>
        <Button className="mt-4">
          {t('common.save')}
        </Button>
      </CardContent>
    </Card>
  );
}
```

## SEO and Metadata

### src/app/[locale]/page.tsx
```typescript
import { Metadata } from 'next';
import { loadTranslations } from '@/lib/i18n';

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

export default function HomePage({ params }: Props) {
  return (
    <div>
      {/* Page content */}
    </div>
  );
}
```

## Benefits Summary

### Technical Benefits
- **SEO Optimization**: Better search rankings in different regions
- **Performance**: Efficient translation loading and caching
- **Maintainability**: Centralized translation management
- **Type Safety**: TypeScript support for translation keys

### Business Benefits
- **Global Reach**: Access to international markets
- **User Experience**: Native language support
- **Competitive Advantage**: Localized features and content
- **Compliance**: Meet regional requirements and standards

## App Integration

### src/app/layout.tsx (Enhanced)
```typescript
import { Inter } from 'next/font/google';
import { I18nProvider, loadTranslations } from '@/lib/i18n';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export default async function RootLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const translations = await loadTranslations(locale as any);

  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <body className={inter.className}>
        <I18nProvider translations={{ [locale]: translations }}>
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
```

### Component Usage Example
```typescript
'use client';

import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function WeatherCard({ temperature, humidity }: { temperature: number; humidity: number }) {
  const { t, formatNumber } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('weather.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div>
            <span className="font-medium">{t('weather.temperature')}:</span>
            <span className="ml-2">{formatNumber(temperature)}°C</span>
          </div>
          <div>
            <span className="font-medium">{t('weather.humidity')}:</span>
            <span className="ml-2">{formatNumber(humidity)}%</span>
          </div>
        </div>
        <Button className="mt-4">
          {t('common.save')}
        </Button>
      </CardContent>
    </Card>
  );
}
```

## SEO and Metadata

### src/app/[locale]/page.tsx
```typescript
import { Metadata } from 'next';
import { loadTranslations } from '@/lib/i18n';

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

export default function HomePage({ params }: Props) {
  return (
    <div>
      {/* Page content */}
    </div>
  );
}
```

## Benefits Summary

### Technical Benefits
- **SEO Optimization**: Better search rankings in different regions
- **Performance**: Efficient translation loading and caching
- **Maintainability**: Centralized translation management
- **Type Safety**: TypeScript support for translation keys

### Business Benefits
- **Global Reach**: Access to international markets
- **User Experience**: Native language support
- **Competitive Advantage**: Localized features and content
- **Compliance**: Meet regional requirements and standards
