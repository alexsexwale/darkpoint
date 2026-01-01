import { Metadata } from "next";
import { Suspense } from "react";
import { PaymentFailedClient } from "./PaymentFailedClient";

export const metadata: Metadata = {
  title: "Payment Failed",
  description: "Unfortunately, your payment could not be processed. Please try again.",
};

// Loading state for suspense
function PaymentFailedLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-[var(--color-main-1)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/60">Loading...</p>
      </div>
    </div>
  );
}

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={<PaymentFailedLoading />}>
      <PaymentFailedClient />
    </Suspense>
  );
}


