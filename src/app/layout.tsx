import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Forecaster - Weather Planning for Outdoor Activities",
  description: "A weather planning application for outdoor activities. Upload GPX files, analyze weather conditions along your path, and make informed decisions for your outdoor adventures.",
  keywords: ["weather", "GPX", "outdoor", "planning", "forecast", "hiking", "cycling"],
  authors: [{ name: "Forecaster Team" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Forecaster",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Forecaster",
    title: "Forecaster - Weather Planning for Outdoor Activities",
    description: "A weather planning application for outdoor activities. Upload GPX files, analyze weather conditions along your path, and make informed decisions for your outdoor adventures.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Forecaster - Weather Planning for Outdoor Activities",
    description: "A weather planning application for outdoor activities. Upload GPX files, analyze weather conditions along your path, and make informed decisions for your outdoor adventures.",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/next.svg" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body
        className={`${inter.variable} font-sans antialiased min-h-screen bg-background`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="relative flex min-h-screen flex-col">
            <main className="flex-1">{children}</main>
          </div>
          <Toaster />
          <div id="sr-live-region" aria-live="polite" aria-atomic="true" className="sr-only" />
        </ThemeProvider>
      </body>
    </html>
  );
}
