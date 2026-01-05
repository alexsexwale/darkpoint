import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shipping Information",
  description: "Shipping rates, delivery times, and policies for Darkpoint orders.",
};

export default function ShippingPage() {
  return (
    <div className="container py-8">
      <div className="nk-gap-4 h-16" />

      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-heading text-center mb-8">Shipping Information</h1>
        
        <div className="h-px bg-[var(--color-main-1)]/30 mb-12" />

        <div className="prose prose-invert prose-lg max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-heading text-white mb-4">Delivery Areas</h2>
            <p className="text-white/70 leading-relaxed">
              We currently ship to all major cities and towns within South Africa. 
              International shipping is available to select countries - please contact us for rates.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-heading text-white mb-4">Shipping Rates</h2>
            <div className="bg-white/5 rounded-lg p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <span className="text-white">Standard Delivery (5-7 business days)</span>
                <span className="text-[var(--color-main-1)] font-semibold">R 75.00</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <span className="text-white">Express Delivery (2-3 business days)</span>
                <span className="text-[var(--color-main-1)] font-semibold">R 150.00</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <span className="text-white">Same Day Delivery (Major cities only)</span>
                <span className="text-[var(--color-main-1)] font-semibold">R 250.00</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white">FREE Shipping on orders over</span>
                <span className="text-[var(--color-main-1)] font-semibold">R 500.00</span>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-heading text-white mb-4">Processing Time</h2>
            <p className="text-white/70 leading-relaxed">
              Orders are typically processed within 1-2 business days. During peak periods 
              (Black Friday, holiday seasons), processing may take up to 3-4 business days.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-heading text-white mb-4">Order Tracking</h2>
            <p className="text-white/70 leading-relaxed">
              Once your order has been dispatched, you will receive an email with a tracking 
              number. You can use this number to track your package on our courier partner&apos;s website.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-heading text-white mb-4">Delivery Issues</h2>
            <p className="text-white/70 leading-relaxed">
              If your package is lost, damaged, or significantly delayed, please contact our 
              support team within 7 days of the expected delivery date. We will work with our 
              courier partners to resolve the issue promptly.
            </p>
          </section>
        </div>
      </div>

      <div className="nk-gap-4 h-16" />
    </div>
  );
}


