import { Metadata } from "next";
import { Suspense } from "react";
import { MysteryBoxRevealClient } from "./MysteryBoxRevealClient";

export const metadata: Metadata = {
  title: "Reveal Your Mystery Box | Darkpoint",
  description: "See what amazing item you won!",
};

export default function MysteryBoxRevealPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--color-main-1)]" />
      </div>
    }>
      <MysteryBoxRevealClient />
    </Suspense>
  );
}

