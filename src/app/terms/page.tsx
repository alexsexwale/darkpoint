import { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://darkpoint.co.za";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Review Darkpoint's Terms of Service covering user agreements, ordering policies, payment terms, intellectual property rights, and liability limitations for our gaming gear store.",
  openGraph: {
    title: "Terms of Service | Darkpoint",
    description: "Terms and conditions for using Darkpoint's gaming gear and tech store.",
    url: `${BASE_URL}/terms`,
  },
  alternates: {
    canonical: `${BASE_URL}/terms`,
  },
};

export default function TermsPage() {
  return (
    <div className="container py-8">
      <div className="nk-gap-4 h-16" />

      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-heading text-center mb-8">Terms of Service</h1>
        
        <div className="h-px bg-[var(--color-main-1)]/30 mb-12" />

        <div className="prose prose-invert prose-lg max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-heading text-white mb-4">1. Acceptance of Terms</h2>
            <p className="text-white/70 leading-relaxed">
              By accessing and using Darkpoint, you accept and agree to be bound by the terms 
              and provision of this agreement. If you do not agree to abide by these terms, 
              please do not use this service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-heading text-white mb-4">2. Use of Service</h2>
            <p className="text-white/70 leading-relaxed">
              You agree to use our service only for lawful purposes and in accordance with these 
              Terms. You agree not to use the service in any way that violates any applicable 
              national or international law or regulation.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-heading text-white mb-4">3. Products and Pricing</h2>
            <p className="text-white/70 leading-relaxed">
              All prices are displayed in South African Rands (ZAR) and include VAT where applicable. 
              We reserve the right to modify prices at any time without prior notice. Product 
              availability is subject to change without notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-heading text-white mb-4">4. Orders and Payment</h2>
            <p className="text-white/70 leading-relaxed">
              When you place an order, you are making an offer to purchase. We reserve the right 
              to accept or decline your order. Payment must be received in full before your order 
              is processed and shipped.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-heading text-white mb-4">5. Intellectual Property</h2>
            <p className="text-white/70 leading-relaxed">
              All content on this website, including text, graphics, logos, images, and software, 
              is the property of Darkpoint and is protected by South African and international 
              copyright laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-heading text-white mb-4">6. Limitation of Liability</h2>
            <p className="text-white/70 leading-relaxed">
              Darkpoint shall not be liable for any indirect, incidental, special, consequential, 
              or punitive damages resulting from your use of or inability to use the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-heading text-white mb-4">7. Governing Law</h2>
            <p className="text-white/70 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of 
              South Africa, without regard to its conflict of law provisions.
            </p>
          </section>

          <p className="text-white/50 text-sm mt-12">
            Last updated: December 2024
          </p>
        </div>
      </div>

      <div className="nk-gap-4 h-16" />
    </div>
  );
}


