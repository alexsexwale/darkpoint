import { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://darkpoint.co.za";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Read Darkpoint's Privacy Policy to understand how we collect, use, and protect your personal data. Learn about your rights regarding cookies, data security, and information sharing.",
  openGraph: {
    title: "Privacy Policy | Darkpoint",
    description: "How we collect, use, and protect your personal data at Darkpoint.",
    url: `${BASE_URL}/privacy`,
  },
  alternates: {
    canonical: `${BASE_URL}/privacy`,
  },
};

export default function PrivacyPage() {
  return (
    <div className="container py-8">
      <div className="nk-gap-4 h-16" />

      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-heading text-center mb-8">Privacy Policy</h1>
        
        <div className="h-px bg-[var(--color-main-1)]/30 mb-12" />

        <div className="prose prose-invert prose-lg max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-heading text-white mb-4">1. Information We Collect</h2>
            <p className="text-white/70 leading-relaxed">
              We collect information you provide directly to us, such as when you create an account, 
              make a purchase, subscribe to our newsletter, or contact us for support. This information 
              may include your name, email address, postal address, phone number, and payment information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-heading text-white mb-4">2. How We Use Your Information</h2>
            <p className="text-white/70 leading-relaxed">
              We use the information we collect to process transactions, send you order confirmations, 
              respond to your comments and questions, send you marketing communications (with your consent), 
              and improve our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-heading text-white mb-4">3. Information Sharing</h2>
            <p className="text-white/70 leading-relaxed">
              We do not sell, trade, or otherwise transfer your personal information to third parties 
              without your consent, except to trusted third parties who assist us in operating our 
              website, conducting our business, or servicing you.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-heading text-white mb-4">4. Data Security</h2>
            <p className="text-white/70 leading-relaxed">
              We implement a variety of security measures to maintain the safety of your personal 
              information. Your personal information is contained behind secured networks and is only 
              accessible by a limited number of persons who have special access rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-heading text-white mb-4">5. Cookies</h2>
            <p className="text-white/70 leading-relaxed">
              We use cookies to help us remember and process the items in your shopping cart, 
              understand and save your preferences for future visits, and compile aggregate data 
              about site traffic and site interaction.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-heading text-white mb-4">6. Your Rights</h2>
            <p className="text-white/70 leading-relaxed">
              You have the right to access, correct, or delete your personal information. You may 
              also opt out of receiving marketing communications from us at any time by clicking 
              the unsubscribe link in our emails or contacting us directly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-heading text-white mb-4">7. Contact Us</h2>
            <p className="text-white/70 leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at 
              support@darkpoint.co.za or through our contact page.
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


