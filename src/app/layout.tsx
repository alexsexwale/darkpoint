import type { Metadata } from "next";
import { Marcellus_SC, Roboto_Condensed } from "next/font/google";
import { Header, Footer, PageBorder, SideNav, SocialShareButtons, SideButtons } from "@/components/layout";
import { Preloader, BackgroundAudio, BackgroundVideo, PageTransition, EasterEggProvider, ScrollToTop } from "@/components/effects";
import { CartDrawer, SearchModal, SignInModal, ForgotPasswordModal } from "@/components/ui";
import { EmailVerificationBanner } from "@/components/auth";
import {
  LevelUpModal,
  AchievementUnlockModal,
  DailyRewardModal,
  DailyRewardProvider,
  StreakMilestoneModal,
  XPGainPopup,
  NotificationStack,
  FloatingXPMultiplier,
} from "@/components/gamification";
import { ExitIntentPopup } from "@/components/marketing";
import { AuthProvider } from "@/components/providers/AuthProvider";
import "@/styles/globals.scss";

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
  title: {
    default: "Darkpoint | Elite Gaming Gear, Tech & Merchandise",
    template: "%s | Darkpoint",
  },
  description:
    "Your ultimate destination for elite gaming equipment, cutting-edge tech, and exclusive merchandise. Level up your setup with premium gear from Darkpoint.",
  keywords: ["gaming", "gaming gear", "hardware", "tech", "gadgets", "merchandise", "gaming accessories", "peripherals", "audio", "electronics", "esports"],
  authors: [{ name: "Darkpoint" }],
  creator: "Darkpoint",
  icons: {
    icon: "/images/favicon.png",
    shortcut: "/images/favicon.png",
    apple: "/images/favicon.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Darkpoint",
    title: "Darkpoint | Elite Gaming Gear, Tech & Merchandise",
    description: "Your ultimate destination for gaming equipment, tech gadgets, hardware, and merchandise.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Darkpoint | Elite Gaming Gear, Tech & Merchandise",
    description: "Your ultimate destination for elite gaming equipment, cutting-edge tech, and exclusive merchandise.",
  },
  robots: {
    index: true,
    follow: true,
  },
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

          {/* Side Navigation */}
          <SideNav />

          {/* Cart Drawer */}
          <CartDrawer />

          {/* Search Modal */}
          <SearchModal />

          {/* Sign In Modal */}
          <SignInModal />

          {/* Forgot Password Modal */}
          <ForgotPasswordModal />

          {/* Gamification Modals */}
          <LevelUpModal />
          <AchievementUnlockModal />
          <DailyRewardModal />
          <StreakMilestoneModal />

          {/* Gamification Notifications */}
          <XPGainPopup />
          <NotificationStack />

          {/* Floating XP Multiplier for Mobile */}
          <FloatingXPMultiplier />

          {/* Marketing - Exit Intent Popup */}
          <ExitIntentPopup discount={10} />

          {/* Social Share Buttons - Left Side */}
          <SocialShareButtons />

          {/* Main Content with Daily Reward Auto-Popup and Easter Eggs */}
          <EasterEggProvider>
            <DailyRewardProvider>
              <main className="flex-1">{children}</main>
            </DailyRewardProvider>
          </EasterEggProvider>

          {/* Footer */}
          <Footer />

          {/* Background Audio - auto-plays if user hasn't muted, persists mute state */}
          <BackgroundAudio loop={true} />

          {/* Side Buttons - Bottom Right (Keep in Touch + Audio Toggle) */}
          <SideButtons />
        </AuthProvider>
      </body>
    </html>
  );
}
