"use client";

import { formatPrice } from "@/lib/utils";
import { ShippingTierBreakdown } from "@/components/ui/FreeDeliveryIndicator";
import { useShippingThreshold } from "@/hooks/useShippingThreshold";
import { motion } from "framer-motion";

export function ShippingPageClient() {
  const { 
    standardFee, 
    reducedFee, 
    midThreshold, 
    regularThreshold,
    bronzeThreshold,
    goldThreshold,
    platinumThreshold,
    isVIP,
    tierInfo,
  } = useShippingThreshold();

  return (
    <div className="container py-8">
      <div className="nk-gap-4 h-16" />

      <div className="max-w-4xl mx-auto">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-heading text-center mb-8"
        >
          Shipping Information
        </motion.h1>
        
        <div className="h-px bg-[var(--color-main-1)]/30 mb-12" />

        <div className="space-y-12">
          {/* Shipping Rates Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-2xl font-heading text-white mb-6">📦 Shipping Rates</h2>
            
            {/* Standard Rates */}
            <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] rounded-lg p-6 mb-6">
              <h3 className="font-heading text-lg mb-4 text-white/80">Standard Delivery (7-14 business days)</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center p-4 bg-[var(--color-dark-3)] rounded-lg">
                  <div>
                    <span className="text-white">Orders under {formatPrice(midThreshold)}</span>
                    <p className="text-xs text-white/50 mt-1">Standard rate</p>
                  </div>
                  <span className="text-xl font-bold text-[var(--color-main-1)]">{formatPrice(standardFee)}</span>
                </div>
                
                <div className="flex justify-between items-center p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <div>
                    <span className="text-white">{formatPrice(midThreshold)} - {formatPrice(regularThreshold - 1)}</span>
                    <p className="text-xs text-amber-400 mt-1">Reduced rate - save {formatPrice(standardFee - reducedFee)}!</p>
                  </div>
                  <span className="text-xl font-bold text-amber-400">{formatPrice(reducedFee)}</span>
                </div>
                
                <div className="flex justify-between items-center p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div>
                    <span className="text-white">{formatPrice(regularThreshold)} and above</span>
                    <p className="text-xs text-green-400 mt-1">Free shipping unlocked!</p>
                  </div>
                  <span className="text-xl font-bold text-green-400">FREE</span>
                </div>
              </div>
            </div>

            {/* VIP Thresholds */}
            <div className="bg-gradient-to-br from-[var(--color-dark-2)] to-purple-900/10 border border-purple-500/20 rounded-lg p-6">
              <h3 className="font-heading text-lg mb-2 flex items-center gap-2">
                <span>👑</span> VIP Free Shipping Benefits
              </h3>
              <p className="text-sm text-white/60 mb-6">
                VIP members unlock lower free shipping thresholds - the higher your tier, the sooner you get free shipping!
              </p>
              
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg text-center">
                  <span className="text-2xl block mb-2">🔥</span>
                  <span className="font-heading text-orange-400">Bronze VIP</span>
                  <p className="text-sm text-white/60 mt-1">Fire Badge</p>
                  <p className="text-lg font-bold text-white mt-2">Free at {formatPrice(bronzeThreshold)}+</p>
                  <p className="text-xs text-orange-400 mt-1">Save {formatPrice(regularThreshold - bronzeThreshold)} on threshold!</p>
                </div>
                
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-center">
                  <span className="text-2xl block mb-2">👑</span>
                  <span className="font-heading text-yellow-400">Gold VIP</span>
                  <p className="text-sm text-white/60 mt-1">Crown Badge</p>
                  <p className="text-lg font-bold text-white mt-2">Free at {formatPrice(goldThreshold)}+</p>
                  <p className="text-xs text-yellow-400 mt-1">Save {formatPrice(regularThreshold - goldThreshold)} on threshold!</p>
                </div>
                
                <div className="p-4 bg-amber-500/10 border border-amber-400/30 rounded-lg text-center">
                  <span className="text-2xl block mb-2">✨</span>
                  <span className="font-heading text-amber-400">Platinum VIP</span>
                  <p className="text-sm text-white/60 mt-1">Gold Frame</p>
                  <p className="text-lg font-bold text-white mt-2">Free at {formatPrice(platinumThreshold)}+</p>
                  <p className="text-xs text-amber-400 mt-1">Save {formatPrice(regularThreshold - platinumThreshold)} on threshold!</p>
                </div>
              </div>

              {isVIP ? (
                <div className={`mt-6 p-4 ${tierInfo.color.replace('text-', 'bg-').replace('400', '500/20')} border border-current rounded-lg text-center`}>
                  <p className={tierInfo.color}>
                    {tierInfo.icon} You&apos;re a <span className="font-bold">{tierInfo.name}</span> member! 
                    Your free shipping threshold is {formatPrice(
                      tierInfo.name.includes("Bronze") ? bronzeThreshold :
                      tierInfo.name.includes("Gold") ? goldThreshold : platinumThreshold
                    )}
                  </p>
                </div>
              ) : (
                <p className="text-center text-sm text-white/60 mt-6">
                  Become a VIP to unlock lower free shipping thresholds!
                </p>
              )}
            </div>
          </motion.section>

          {/* Delivery Areas */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-2xl font-heading text-white mb-4">🌍 Delivery Areas</h2>
            <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] rounded-lg p-6">
              <p className="text-white/70 leading-relaxed">
                We currently ship to all major cities and towns within South Africa. 
                International shipping is available to select countries - please contact us for rates.
              </p>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                {["Gauteng", "Western Cape", "KwaZulu-Natal", "Eastern Cape", "Free State", "Mpumalanga", "Limpopo", "North West"].map((province) => (
                  <div key={province} className="flex items-center gap-2 text-sm">
                    <span className="text-green-400">✓</span>
                    <span className="text-white/60">{province}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.section>

          {/* Processing Time */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-2xl font-heading text-white mb-4">⏱️ Processing Time</h2>
            <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] rounded-lg p-6">
              <p className="text-white/70 leading-relaxed">
                Orders are typically processed within 1-3 business days. During peak periods 
                (Black Friday, holiday seasons), processing may take up to 5-7 business days.
              </p>
              <div className="mt-4 flex flex-wrap gap-4">
                <div className="px-4 py-2 bg-[var(--color-dark-3)] rounded-lg">
                  <span className="text-xs text-white/50">Processing</span>
                  <p className="font-bold">1-3 days</p>
                </div>
                <div className="px-4 py-2 bg-[var(--color-dark-3)] rounded-lg">
                  <span className="text-xs text-white/50">Standard Delivery</span>
                  <p className="font-bold">7-14 days</p>
                </div>
                <div className="px-4 py-2 bg-[var(--color-dark-3)] rounded-lg">
                  <span className="text-xs text-white/50">Total Estimated</span>
                  <p className="font-bold">8-17 days</p>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Order Tracking */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-2xl font-heading text-white mb-4">📍 Order Tracking</h2>
            <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] rounded-lg p-6">
              <p className="text-white/70 leading-relaxed">
                Once your order has been dispatched, you will receive an email with a tracking 
                number. You can use this number to track your package on our courier partner&apos;s website
                or via our <a href="/track-order" className="text-[var(--color-main-1)] hover:underline">Track Order</a> page.
              </p>
            </div>
          </motion.section>

          {/* Delivery Issues */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h2 className="text-2xl font-heading text-white mb-4">⚠️ Delivery Issues</h2>
            <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] rounded-lg p-6">
              <p className="text-white/70 leading-relaxed">
                If your package is lost, damaged, or significantly delayed, please contact our 
                support team within 7 days of the expected delivery date. We will work with our 
                courier partners to resolve the issue promptly.
              </p>
              <div className="mt-4 flex gap-4">
                <a 
                  href="/contact" 
                  className="px-4 py-2 bg-[var(--color-main-1)] text-black font-medium rounded-lg hover:bg-[var(--color-main-1)]/90 transition-colors"
                >
                  Contact Support
                </a>
                <a 
                  href="/faq" 
                  className="px-4 py-2 bg-[var(--color-dark-3)] text-white font-medium rounded-lg hover:bg-[var(--color-dark-4)] transition-colors"
                >
                  View FAQ
                </a>
              </div>
            </div>
          </motion.section>
        </div>
      </div>

      <div className="nk-gap-4 h-16" />
    </div>
  );
}

