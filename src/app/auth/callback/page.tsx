import { Suspense } from "react";
import { AuthCallbackClient } from "./AuthCallbackClient";

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[var(--color-dark-1)] flex items-center justify-center p-4">
          <div className="w-24 h-24 rounded-full border-2 border-[var(--color-dark-4)] border-t-[var(--color-main-1)] animate-spin" />
        </main>
      }
    >
      <AuthCallbackClient />
    </Suspense>
  );
}
