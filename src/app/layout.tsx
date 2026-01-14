import type { Metadata } from "next";
import { Marcellus_SC, Roboto_Condensed } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { Header, Footer, PageBorder, LazyComponents } from "@/components/layout";
import { Preloader, BackgroundVideo, PageTransition, EasterEggProvider, ScrollToTop } from "@/components/effects";
import { EmailVerificationBanner } from "@/components/auth";
import { DailyRewardProvider } from "@/components/gamification";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { OrganizationJsonLd, WebSiteJsonLd } from "@/components/seo";
import "@/styles/globals.scss";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://darkpoint.co.za";

const marcellusSC = Marcellus_SC({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const robotoCondensed = Roboto_Condensed({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Darkpoint | Elite Gaming Gear, Tech & Merchandise",
    template: "%s | Darkpoint",
  },
  description:
    "Your ultimate destination for elite gaming equipment, cutting-edge tech, and exclusive merchandise. Level up your setup with premium gear from Darkpoint.",
  keywords: ["gaming", "gaming gear", "hardware", "tech", "gadgets", "merchandise", "gaming accessories", "peripherals", "audio", "electronics", "esports", "South Africa", "gaming store"],
  authors: [{ name: "Darkpoint" }],
  creator: "Darkpoint",
  publisher: "Darkpoint",
  icons: {
    icon: "/images/favicon.png",
    shortcut: "/images/favicon.png",
    apple: "/images/favicon.png",
  },
  openGraph: {
    type: "website",
    locale: "en_ZA",
    url: BASE_URL,
    siteName: "Darkpoint",
    title: "Darkpoint | Elite Gaming Gear, Tech & Merchandise",
    description: "Your ultimate destination for gaming equipment, tech gadgets, hardware, and merchandise.",
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Darkpoint - Elite Gaming Gear, Tech & Merchandise",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Darkpoint | Elite Gaming Gear, Tech & Merchandise",
    description: "Your ultimate destination for elite gaming equipment, cutting-edge tech, and exclusive merchandise.",
    images: ["/images/og-image.jpg"],
    creator: "@darkpoint",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // Add your verification codes here when you have them
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
  },
  alternates: {
    canonical: BASE_URL,
  },
  category: "E-commerce",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html 
      lang="en" 
      className={`${marcellusSC.variable} ${robotoCondensed.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Preconnect to CJ Dropshipping for product images */}
        <link rel="preconnect" href="https://cf.cjdropshipping.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://img.cjdropshipping.com" crossOrigin="anonymous" />
        {/* DNS prefetch for external resources */}
        <link rel="dns-prefetch" href="https://cf.cjdropshipping.com" />
        <link rel="dns-prefetch" href="https://img.cjdropshipping.com" />
        {/* Structured Data for SEO */}
        <OrganizationJsonLd />
        <WebSiteJsonLd />
      </head>
      <body className="min-h-screen flex flex-col antialiased" suppressHydrationWarning>
        <AuthProvider>
          {/* Scroll to top on route change */}
          <ScrollToTop />

          {/* Preloader */}
          <Preloader />

          {/* Page Transition Handler */}
          <PageTransition />

          {/* Page Border Decoration */}
          <PageBorder />

          {/* Video Background - Fire/Ember effect */}
          <BackgroundVideo
            src="/video/Background.mp4"
            posterImage="/images/page-background.jpg"
            opacity={0.5}
            muted={true}
            loop={true}
          />

          {/* Header */}
          <Header />

          {/* Email Verification Banner (shows for unverified logged-in users) */}
          <EmailVerificationBanner />

          {/* Lazy loaded components (modals, gamification, side nav, etc.) */}
          <LazyComponents />

          {/* Main Content with Daily Reward Auto-Popup and Easter Eggs */}
          <EasterEggProvider>
            <DailyRewardProvider>
              <main className="flex-1">{children}</main>
            </DailyRewardProvider>
          </EasterEggProvider>

          {/* Footer */}
          <Footer />

          {/* Vercel Speed Insights */}
          <SpeedInsights />

          {/* Vercel Analytics */}
          <Analytics />
        </AuthProvider>
      </body>
    </html>
  );
}
