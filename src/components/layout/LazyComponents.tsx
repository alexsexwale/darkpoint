"use client";

import dynamic from "next/dynamic";

// Lazy load modals - not needed on initial render
const CartDrawer = dynamic(() => import("@/components/ui/CartDrawer").then(m => ({ default: m.CartDrawer })), { ssr: false });
const SearchModal = dynamic(() => import("@/components/ui/SearchModal").then(m => ({ default: m.SearchModal })), { ssr: false });
const SignInModal = dynamic(() => import("@/components/ui/SignInModal").then(m => ({ default: m.SignInModal })), { ssr: false });
const ForgotPasswordModal = dynamic(() => import("@/components/ui/ForgotPasswordModal").then(m => ({ default: m.ForgotPasswordModal })), { ssr: false });

// Lazy load gamification modals - triggered by user actions
const LevelUpModal = dynamic(() => import("@/components/gamification/LevelUpModal").then(m => ({ default: m.LevelUpModal })), { ssr: false });
const AchievementUnlockModal = dynamic(() => import("@/components/gamification/AchievementUnlockModal").then(m => ({ default: m.AchievementUnlockModal })), { ssr: false });
const DailyRewardModal = dynamic(() => import("@/components/gamification/DailyRewardModal").then(m => ({ default: m.DailyRewardModal })), { ssr: false });
const StreakMilestoneModal = dynamic(() => import("@/components/gamification/StreakMilestoneModal").then(m => ({ default: m.StreakMilestoneModal })), { ssr: false });
const XPGainPopup = dynamic(() => import("@/components/gamification/XPGainPopup").then(m => ({ default: m.XPGainPopup })), { ssr: false });
const NotificationStack = dynamic(() => import("@/components/gamification/NotificationStack").then(m => ({ default: m.NotificationStack })), { ssr: false });
const FloatingXPMultiplier = dynamic(() => import("@/components/gamification/FloatingXPMultiplier").then(m => ({ default: m.FloatingXPMultiplier })), { ssr: false });

// Lazy load marketing popup
const ExitIntentPopup = dynamic(() => import("@/components/marketing/ExitIntentPopup").then(m => ({ default: m.ExitIntentPopup })), { ssr: false });

// Lazy load side components
const SideNav = dynamic(() => import("@/components/layout/SideNav").then(m => ({ default: m.SideNav })), { ssr: false });
const SocialShareButtons = dynamic(() => import("@/components/layout/SocialShareButtons").then(m => ({ default: m.SocialShareButtons })), { ssr: false });
const SideButtons = dynamic(() => import("@/components/layout/SideButtons").then(m => ({ default: m.SideButtons })), { ssr: false });

// Lazy load audio - not critical for initial render
const BackgroundAudio = dynamic(() => import("@/components/effects/BackgroundAudio").then(m => ({ default: m.BackgroundAudio })), { ssr: false });

export function LazyComponents() {
  return (
    <>
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

      {/* Background Audio */}
      <BackgroundAudio loop={true} />

      {/* Side Buttons */}
      <SideButtons />
    </>
  );
}

