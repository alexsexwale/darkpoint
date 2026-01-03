import type { Metadata } from "next";
import { Marcellus_SC, Roboto_Condensed } from "next/font/google";
import { Header, Footer, PageBorder, SideNav, SocialShareButtons, SideButtons } from "@/components/layout";
import { Preloader, BackgroundAudio, BackgroundVideo, PageTransition, EasterEggProvider } from "@/components/effects";
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
    default: "Dark Point | Elite Gaming Gear, Tech & Merchandise",
    template: "%s | Dark Point",
  },
  description:
    "Your ultimate destination for elite gaming equipment, cutting-edge tech, and exclusive merchandise. Level up your setup with premium gear from Dark Point.",
  keywords: ["gaming", "gaming gear", "hardware", "tech", "gadgets", "merchandise", "gaming accessories", "peripherals", "audio", "electronics", "esports"],
  authors: [{ name: "Dark Point" }],
  creator: "Dark Point",
  icons: {
    icon: "/images/favicon.png",
    shortcut: "/images/favicon.png",
    apple: "/images/favicon.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Dark Point",
    title: "Dark Point | Elite Gaming Gear, Tech & Merchandise",
    description: "Your ultimate destination for gaming equipment, tech gadgets, hardware, and merchandise.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dark Point | Elite Gaming Gear, Tech & Merchandise",
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
    <html lang="en" className={`${marcellusSC.variable} ${robotoCondensed.variable}`}>
      <body className="min-h-screen flex flex-col antialiased">
        <AuthProvider>
          {/* Preloader */}
          <Preloader />

          {/* Page Transition Handler */}
          <PageTransition />

          {/* Page Border Decoration */}
          <PageBorder />

          {/* Video Background - Fire/Ember effect */}
          <BackgroundVideo
            youtubeId="UkeDo1LhUqQ"
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
          <BackgroundAudio
            src="/audio/purpleplanetmusic-desolation.mp3"
            loop={true}
          />

          {/* Side Buttons - Bottom Right (Keep in Touch + Audio Toggle) */}
          <SideButtons />
        </AuthProvider>
      </body>
    </html>
  );
}
