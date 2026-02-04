import { Suspense } from "react";
import { AuthCallbackClient } from "./AuthCallbackClient";

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[var(--color-dark-1)] flex items-center justify-center p-4">
          <div className="w-16 h-16 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin" />
        </main>
      }
    >
      <AuthCallbackClient />
    </Suspense>
  );
}
