"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import Confetti from "react-confetti";
import { formatPrice } from "@/lib/utils";
import { useGamificationStore, useAuthStore, useRewardsStore } from "@/stores";
import { supabase } from "@/lib/supabase";

interface OrderData {
  orderNumber: string;
  orderId: string;
  email: string;
  total: number;
  items: number;
  estimatedDelivery: string;
  shippingAddress: string;
}

export function PaymentSuccessClient() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order") || "Unknown";
  
  const [showConfetti, setShowConfetti] = useState(true);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [rewardsProcessed, setRewardsProcessed] = useState(false);
  const [orderData, setOrderData] = useState<OrderData>({
    orderNumber: orderNumber,
    orderId: "",
    email: "",
    total: 0,
    items: 0,
    estimatedDelivery: "5-7 business days",
    shippingAddress: "",
  });

  const { checkAchievements, fetchUserProfile } = useGamificationStore();
  const { user, session } = useAuthStore();
  const { fetchRewards } = useRewardsStore();

  // Process purchase rewards
  const processRewards = useCallback(async (orderId: string, userId: string) => {
    if (rewardsProcessed || !session?.access_token) return;

    try {
      const response = await fetch("/api/orders/process-rewards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ orderId, userId }),
      });

      const result = await response.json();
      if (result.success) {
        setRewardsProcessed(true);
        // Refresh profile and rewards after processing
        await fetchUserProfile();
        await checkAchievements();
        await fetchRewards(); // Refresh rewards to hide used ones
      }
    } catch (error) {
      console.error("Failed to process rewards:", error);
    }
  }, [rewardsProcessed, session?.access_token, fetchUserProfile, checkAchievements, fetchRewards]);

  useEffect(() => {
    // Set window size for confetti
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });

    // Stop confetti after 5 seconds
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    
    // Check achievements after purchase (delayed to allow webhook to process)
    const achievementTimer = setTimeout(async () => {
      await fetchUserProfile(); // Refresh user stats first
      await checkAchievements(); // Then check for new achievements
      await fetchRewards(); // Refresh rewards to hide used ones
    }, 2000);

    return () => {
      clearTimeout(timer);
      clearTimeout(achievementTimer);
    };
  }, [checkAchievements, fetchUserProfile, fetchRewards]);

  // Fetch order details and process rewards
  useEffect(() => {
    if (orderNumber && orderNumber !== "Unknown") {
      setOrderData(prev => ({ ...prev, orderNumber }));

      // Fetch order details and process rewards
      const fetchAndProcess = async () => {
        const { data: order } = await supabase
          .from("orders")
          .select("id, user_id, total, payment_status, rewards_processed")
          .eq("order_number", orderNumber)
          .single();

        if (order) {
          setOrderData(prev => ({ ...prev, orderId: order.id, total: order.total }));

          // If order is paid and rewards not processed, trigger processing
          if (order.payment_status === "paid" && !order.rewards_processed && order.user_id && user?.id === order.user_id) {
            // Wait a bit for webhook to potentially finish
            setTimeout(() => {
              processRewards(order.id, order.user_id);
            }, 3000);
          }
        }
      };

      fetchAndProcess();
    }
  }, [orderNumber, user?.id, processRewards]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Confetti Effect */}
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={200}
          colors={["#e87b35", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"]}
        />
      )}

      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[var(--color-main-1)]/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-16 pb-32 relative z-10">
        <div className="max-w-2xl mx-auto">
          {/* Success Animation */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.6, bounce: 0.4 }}
            className="text-center mb-8"
          >
            <div className="w-32 h-32 mx-auto mb-6 relative">
              {/* Animated Circle */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="absolute inset-0 rounded-full bg-gradient-to-br from-green-500 to-emerald-600"
              />
              {/* Pulse Effect */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0.5 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute inset-0 rounded-full bg-green-500"
              />
              {/* Checkmark */}
              <motion.svg
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="absolute inset-0 w-full h-full p-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <motion.path
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </motion.svg>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <h1 className="text-4xl md:text-5xl font-heading uppercase tracking-wider mb-4">
                Payment Successful!
              </h1>
              <p className="text-xl text-white/70">
                Thank you for your order! 🎮
              </p>
            </motion.div>
          </motion.div>

          {/* Order Details Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-[var(--color-dark-2)] border border-[var(--color-dark-4)] p-8 mb-6"
          >
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-[var(--color-dark-4)]">
              <div>
                <p className="text-sm text-white/50 mb-1">Order Number</p>
                <p className="text-2xl font-heading text-[var(--color-main-1)]">
                  {orderData.orderNumber}
                </p>
              </div>
              {orderData.total > 0 && (
                <div className="text-right">
                  <p className="text-sm text-white/50 mb-1">Total Paid</p>
                  <p className="text-2xl font-bold">{formatPrice(orderData.total)}</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-white/50">Confirmation Email</p>
                  <p className="font-medium">Check your inbox for order details</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-white/50">Estimated Delivery</p>
                  <p className="font-medium">{orderData.estimatedDelivery}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-white/50">Payment Status</p>
                  <p className="font-medium text-green-400">✓ Confirmed</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* What's Next Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="bg-gradient-to-r from-[var(--color-main-1)]/10 to-purple-500/10 border border-[var(--color-main-1)]/20 p-6 mb-8"
          >
            <h3 className="font-heading text-lg uppercase tracking-wider mb-4 flex items-center gap-2">
              <span>🚀</span> What happens next?
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[var(--color-main-1)] flex items-center justify-center text-xs font-bold flex-shrink-0">
                  1
                </div>
                <p className="text-white/70">
                  You&apos;ll receive an email confirmation with your order details
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[var(--color-main-1)] flex items-center justify-center text-xs font-bold flex-shrink-0">
                  2
                </div>
                <p className="text-white/70">
                  We&apos;ll prepare your items and ship them within 1-2 business days
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[var(--color-main-1)] flex items-center justify-center text-xs font-bold flex-shrink-0">
                  3
                </div>
                <p className="text-white/70">
                  You&apos;ll get tracking information once your order ships
                </p>
              </div>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Link href="/account/orders" className="flex-1">
              <button className="nk-btn nk-btn-primary w-full">
                <span className="nk-btn-inner" />
                <span className="nk-btn-content flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  View Order
                </span>
              </button>
            </Link>
            <Link href="/store" className="flex-1">
              <button className="nk-btn nk-btn-outline w-full">
                <span className="nk-btn-inner" />
                <span className="nk-btn-content flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  Continue Shopping
                </span>
              </button>
            </Link>
          </motion.div>

          {/* Support Link */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
            className="text-center text-white/50 text-sm mt-8"
          >
            Questions about your order?{" "}
            <Link href="/contact" className="text-[var(--color-main-1)] hover:underline">
              Contact our support team
            </Link>
          </motion.p>
        </div>
      </div>
    </div>
  );
}

