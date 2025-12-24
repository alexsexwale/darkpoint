"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AccountLayout, ReturnRequestModal, type ReturnRequestData } from "@/components/account";
import { Button } from "@/components/ui";
import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/stores";

interface OrderItem {
  id: string;
  name: string;
  image: string;
  quantity: number;
  price: number;
  variant?: string;
}

interface OrderDetails {
  id: string;
  orderNumber: string;
  date: string;
  status: "Processing" | "Shipped" | "Delivered" | "Cancelled" | "Refunded";
  paymentMethod: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  shippingAddress: {
    name: string;
    address1: string;
    address2?: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
    phone?: string;
  };
  billingAddress: {
    name: string;
    address1: string;
    address2?: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };
  trackingNumber?: string;
  trackingUrl?: string;
}

// Mock order data - in a real app this would come from an API
const mockOrders: Record<string, OrderDetails> = {
  "24": {
    id: "24",
    orderNumber: "24",
    date: "2024-12-15T10:30:00Z",
    status: "Processing",
    paymentMethod: "Credit Card (Visa ending in 4242)",
    items: [
      {
        id: "1",
        name: "Wireless Earbuds Pro",
        image: "/images/product-1-sm.png",
        quantity: 2,
        price: 499.99,
        variant: "Black",
      },
      {
        id: "2",
        name: "Smart Watch Ultra",
        image: "/images/product-2-sm.png",
        quantity: 1,
        price: 50.01,
      },
    ],
    subtotal: 1049.99,
    shipping: 0,
    tax: 157.50,
    total: 1207.49,
    shippingAddress: {
      name: "John Doe",
      address1: "123 Main Street",
      city: "Cape Town",
      province: "Western Cape",
      postalCode: "8001",
      country: "South Africa",
      phone: "+27 21 123 4567",
    },
    billingAddress: {
      name: "John Doe",
      address1: "123 Main Street",
      city: "Cape Town",
      province: "Western Cape",
      postalCode: "8001",
      country: "South Africa",
    },
  },
  "18": {
    id: "18",
    orderNumber: "18",
    date: "2024-12-10T14:20:00Z",
    status: "Shipped",
    paymentMethod: "PayPal",
    items: [
      {
        id: "3",
        name: "Premium Bluetooth Speaker",
        image: "/images/product-3-sm.png",
        quantity: 1,
        price: 2500.0,
      },
    ],
    subtotal: 2500.0,
    shipping: 0,
    tax: 375.0,
    total: 2875.0,
    shippingAddress: {
      name: "John Doe",
      address1: "456 Delivery Lane",
      address2: "Unit 5",
      city: "Johannesburg",
      province: "Gauteng",
      postalCode: "2000",
      country: "South Africa",
    },
    billingAddress: {
      name: "John Doe",
      address1: "123 Main Street",
      city: "Cape Town",
      province: "Western Cape",
      postalCode: "8001",
      country: "South Africa",
    },
    trackingNumber: "ZA123456789",
    trackingUrl: "https://track.example.com/ZA123456789",
  },
  "12": {
    id: "12",
    orderNumber: "12",
    date: "2024-11-28T09:15:00Z",
    status: "Delivered",
    paymentMethod: "Credit Card (Mastercard ending in 5555)",
    items: [
      {
        id: "4",
        name: "USB-C Charging Hub",
        image: "/images/product-4-sm.png",
        quantity: 2,
        price: 449.50,
      },
    ],
    subtotal: 899.0,
    shipping: 50.0,
    tax: 142.35,
    total: 1091.35,
    shippingAddress: {
      name: "John Doe",
      address1: "123 Main Street",
      city: "Cape Town",
      province: "Western Cape",
      postalCode: "8001",
      country: "South Africa",
    },
    billingAddress: {
      name: "John Doe",
      address1: "123 Main Street",
      city: "Cape Town",
      province: "Western Cape",
      postalCode: "8001",
      country: "South Africa",
    },
    trackingNumber: "ZA987654321",
  },
};

const statusConfig: Record<
  OrderDetails["status"],
  { color: string; bgColor: string; icon: React.ReactNode }
> = {
  Processing: {
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  Shipped: {
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
      </svg>
    ),
  },
  Delivered: {
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  Cancelled: {
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
  Refunded: {
    color: "text-gray-400",
    bgColor: "bg-gray-400/10",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
      </svg>
    ),
  },
};

interface OrderDetailClientProps {
  orderId: string;
}

export function OrderDetailClient({ orderId }: OrderDetailClientProps) {
  const order = mockOrders[orderId];
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const { openCart } = useCartStore();

  // Check if return is eligible (within 30 days of delivery)
  const isReturnEligible = () => {
    if (order?.status !== "Delivered") return false;
    const deliveryDate = new Date(order.date);
    const now = new Date();
    const daysSinceDelivery = Math.floor((now.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceDelivery <= 30;
  };

  const daysLeftForReturn = () => {
    if (!order) return 0;
    const deliveryDate = new Date(order.date);
    const now = new Date();
    const daysSinceDelivery = Math.floor((now.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, 30 - daysSinceDelivery);
  };

  const handleReturnSubmit = (returnData: ReturnRequestData) => {
    console.log("Return request submitted:", returnData);
    // In a real app, this would send to an API
  };

  const handleReorder = () => {
    // In a real app, this would add all items from the order to cart
    // For now, we'll show a message and redirect to cart
    alert("Items have been added to your cart!");
    openCart();
  };

  if (!order) {
    return (
      <AccountLayout title="Order Not Found">
        <div className="text-center py-12">
          <svg
            className="w-16 h-16 mx-auto text-[var(--color-dark-4)] mb-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-[var(--muted-foreground)] mb-6">
            We couldn&apos;t find an order with ID #{orderId}
          </p>
          <Link href="/account/orders">
            <Button variant="outline">Back to Orders</Button>
          </Link>
        </div>
      </AccountLayout>
    );
  }

  const statusInfo = statusConfig[order.status];
  const orderDate = new Date(order.date);

  return (
    <AccountLayout title={`Order #${order.orderNumber}`}>
      {/* Back Link */}
      <Link
        href="/account/orders"
        className="inline-flex items-center gap-2 text-[var(--muted-foreground)] hover:text-white transition-colors mb-6"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Orders
      </Link>

      {/* Order Status Banner */}
      <div className={`${statusInfo.bgColor} p-4 mb-8 flex items-center gap-4`}>
        <div className={`${statusInfo.color}`}>{statusInfo.icon}</div>
        <div className="flex-1">
          <p className={`font-semibold ${statusInfo.color}`}>{order.status}</p>
          <p className="text-sm text-white/60">
            Placed on {orderDate.toLocaleDateString("en-ZA", { 
              weekday: "long",
              day: "numeric", 
              month: "long", 
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        {order.trackingNumber && (
          <div className="text-right">
            <p className="text-sm text-white/60">Tracking Number</p>
            {order.trackingUrl ? (
              <a
                href={order.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-main-1)] hover:underline font-mono"
              >
                {order.trackingNumber}
              </a>
            ) : (
              <p className="font-mono">{order.trackingNumber}</p>
            )}
          </div>
        )}
      </div>

      {/* Order Items */}
      <div className="bg-[var(--color-dark-2)] p-6 mb-6">
        <h3 className="font-heading text-xl mb-4">Order Items</h3>
        <div className="space-y-4">
          {order.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 py-4 border-b border-white/5 last:border-0"
            >
              <div className="relative w-20 h-20 bg-[var(--color-dark-3)] flex-shrink-0">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-contain p-2"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold truncate">{item.name}</h4>
                {item.variant && (
                  <p className="text-sm text-white/60">Variant: {item.variant}</p>
                )}
                <p className="text-sm text-white/60">Qty: {item.quantity}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatPrice(item.price * item.quantity)}</p>
                {item.quantity > 1 && (
                  <p className="text-sm text-white/60">{formatPrice(item.price)} each</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Order Summary & Addresses */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Order Summary */}
        <div className="bg-[var(--color-dark-2)] p-6">
          <h3 className="font-heading text-xl mb-4">Order Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-white/70">
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-white/70">
              <span>Shipping</span>
              <span>{order.shipping === 0 ? "Free" : formatPrice(order.shipping)}</span>
            </div>
            <div className="flex justify-between text-white/70">
              <span>VAT (15%)</span>
              <span>{formatPrice(order.tax)}</span>
            </div>
            <div className="h-px bg-white/10 my-2" />
            <div className="flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span className="text-[var(--color-main-1)]">{formatPrice(order.total)}</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-sm text-white/60">Payment Method</p>
            <p>{order.paymentMethod}</p>
          </div>
        </div>

        {/* Addresses */}
        <div className="space-y-6">
          {/* Shipping Address */}
          <div className="bg-[var(--color-dark-2)] p-6">
            <h3 className="font-heading text-lg mb-3">Shipping Address</h3>
            <div className="text-white/70 space-y-1">
              <p className="text-white">{order.shippingAddress.name}</p>
              <p>{order.shippingAddress.address1}</p>
              {order.shippingAddress.address2 && <p>{order.shippingAddress.address2}</p>}
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.province}{" "}
                {order.shippingAddress.postalCode}
              </p>
              <p>{order.shippingAddress.country}</p>
              {order.shippingAddress.phone && <p>{order.shippingAddress.phone}</p>}
            </div>
          </div>

          {/* Billing Address */}
          <div className="bg-[var(--color-dark-2)] p-6">
            <h3 className="font-heading text-lg mb-3">Billing Address</h3>
            <div className="text-white/70 space-y-1">
              <p className="text-white">{order.billingAddress.name}</p>
              <p>{order.billingAddress.address1}</p>
              {order.billingAddress.address2 && <p>{order.billingAddress.address2}</p>}
              <p>
                {order.billingAddress.city}, {order.billingAddress.province}{" "}
                {order.billingAddress.postalCode}
              </p>
              <p>{order.billingAddress.country}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Return Eligibility Banner */}
      {order.status === "Delivered" && (
        <div className={`mb-6 p-4 ${isReturnEligible() ? "bg-green-500/10 border border-green-500/20" : "bg-[var(--color-dark-2)]"}`}>
          <div className="flex items-center gap-3">
            {isReturnEligible() ? (
              <>
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="font-semibold text-green-500">Eligible for Return</p>
                  <p className="text-sm text-white/60">
                    You have <span className="text-green-400 font-semibold">{daysLeftForReturn()} days</span> left to request a return for this order.
                  </p>
                </div>
                <Button variant="outline" onClick={() => setIsReturnModalOpen(true)}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  Request Return
                </Button>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 text-white/40 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-semibold text-white/60">Return Period Expired</p>
                  <p className="text-sm text-white/40">
                    The 30-day return window for this order has passed. Contact support if you need assistance.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-4">
        <Button variant="outline" className="cursor-pointer" onClick={() => window.print()}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print Order
        </Button>
        <Link href={`/contact?subject=Order%20%23${order.orderNumber}%20Inquiry`}>
          <Button variant="outline" className="cursor-pointer">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Need Help?
          </Button>
        </Link>
        {order.status === "Delivered" && (
          <Button variant="primary" className="cursor-pointer" onClick={handleReorder}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reorder
          </Button>
        )}
      </div>

      {/* Return Request Modal */}
      <ReturnRequestModal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        orderId={order.id}
        orderNumber={order.orderNumber}
        items={order.items}
        onSubmit={handleReturnSubmit}
      />
    </AccountLayout>
  );
}

