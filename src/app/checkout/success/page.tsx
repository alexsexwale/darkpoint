import { Metadata } from "next";
import { Suspense } from "react";
import { PaymentSuccessClient } from "./PaymentSuccessClient";

export const metadata: Metadata = {
  title: "Payment Successful",
  description: "Your payment has been processed successfully. Thank you for your order!",
};

// Loading state for suspense
function PaymentSuccessLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-[var(--color-main-1)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/60">Loading order details...</p>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<PaymentSuccessLoading />}>
      <PaymentSuccessClient />
    </Suspense>
  );
}


