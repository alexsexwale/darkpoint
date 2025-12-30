import { ReferralLandingPageClient } from "./ReferralLandingPageClient";

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { code } = await params;
  return {
    title: `Join DarkPoint - Referral ${code}`,
    description: "Join DarkPoint with a friend's referral and get bonus XP rewards!",
  };
}

export default async function ReferralLandingPage({ params }: PageProps) {
  const { code } = await params;
  return <ReferralLandingPageClient code={code} />;
}

