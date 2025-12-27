import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Authentication Error | Dark Point",
  description: "An error occurred during authentication",
};

export default function AuthErrorPage() {
  return (
    <main className="min-h-screen bg-[var(--color-dark-1)] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
          <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        
        <h1 className="text-3xl font-heading text-white mb-4">Authentication Error</h1>
        
        <p className="text-[var(--muted-foreground)] mb-8">
          There was a problem signing you in. This could be due to an expired or invalid link.
          Please try signing in again.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/"
            className="nk-btn nk-btn-outline"
          >
            <span className="nk-btn-inner" />
            <span className="nk-btn-content">Go Home</span>
          </Link>
          <Link 
            href="/?signin=true"
            className="nk-btn nk-btn-default"
          >
            <span className="nk-btn-inner" />
            <span className="nk-btn-content">Try Again</span>
          </Link>
        </div>
      </div>
    </main>
  );
}

