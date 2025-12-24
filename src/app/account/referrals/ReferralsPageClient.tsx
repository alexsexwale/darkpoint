"use client";

import { AccountLayout } from "@/components/account";
import { ReferralDashboard } from "@/components/gamification";

export function ReferralsPageClient() {
  return (
    <AccountLayout title="Referral Program">
      <ReferralDashboard />
    </AccountLayout>
  );
}

