"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

export default function NewsletterPage() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement actual newsletter subscription
    setSubscribed(true);
  };

  return (
    <div className="container py-8">
      <div className="nk-gap-4 h-16" />

      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-heading mb-8">Join Our Newsletter</h1>
        
        <div className="h-px bg-[var(--color-main-1)]/30 mb-12 max-w-xs mx-auto" />

        {!subscribed ? (
          <>
            <p className="text-white/70 text-lg mb-8 leading-relaxed">
              Subscribe to our newsletter and be the first to know about new products, 
              exclusive deals, and tech tips. Plus, get <span className="text-[var(--color-main-1)] font-semibold">10% off</span> your 
              first order!
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto items-stretch">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="nk-form-control flex-1"
                />
                <Button type="submit" variant="primary" className="sm:flex-shrink-0">
                  Subscribe
                </Button>
              </div>
            </form>

            <p className="text-white/40 text-sm mt-6">
              We respect your privacy. Unsubscribe at any time.
            </p>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[var(--color-main-1)]/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-[var(--color-main-1)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                </div>
                <h3 className="font-heading text-white mb-2">Exclusive Deals</h3>
                <p className="text-white/50 text-sm">Subscriber-only discounts and early access to sales</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[var(--color-main-1)]/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-[var(--color-main-1)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="font-heading text-white mb-2">New Arrivals</h3>
                <p className="text-white/50 text-sm">Be first to know about the latest tech products</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[var(--color-main-1)]/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-[var(--color-main-1)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="font-heading text-white mb-2">Tech Tips</h3>
                <p className="text-white/50 text-sm">Helpful guides and product recommendations</p>
              </div>
            </div>
          </>
        ) : (
          <div className="py-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-heading text-white mb-4">You&apos;re Subscribed!</h2>
            <p className="text-white/70 mb-8">
              Thanks for subscribing! Check your inbox for your 10% discount code.
            </p>
            <a href="/store">
              <Button variant="primary" size="lg">
                Start Shopping
              </Button>
            </a>
          </div>
        )}
      </div>

      <div className="nk-gap-4 h-16" />
    </div>
  );
}


