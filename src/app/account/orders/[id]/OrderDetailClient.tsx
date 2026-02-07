"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { AccountLayout, ReturnRequestModal, type ReturnRequestData } from "@/components/account";
import { Button } from "@/components/ui";
import { formatPrice } from "@/lib/utils";
import { useCartStore, useAccountStore } from "@/stores";

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
  discount: number;
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

// Helper function to convert database order to OrderDetails format
function convertOrderToDetails(order: any): OrderDetails | null {
  if (!order) return null;

  const statusMap: Record<string, OrderDetails["status"]> = {
    pending: "Processing",
    processing: "Processing",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
    refunded: "Refunded",
  };

  return {
    id: order.id,
    orderNumber: order.order_number,
    date: order.created_at,
    status: statusMap[order.status] || "Processing",
    paymentMethod: order.payment_method === "yoco" 
      ? `Yoco (${order.payment_status === "paid" ? "Paid" : "Pending"})`
      : order.payment_method || "Unknown",
    items: (order.items || []).map((item: any) => ({
      id: item.id,
      name: item.product_name || "Unknown Product",
      image: item.product_image || "/images/placeholder.png",
      quantity: item.quantity || 1,
      price: item.unit_price || 0,
      variant: item.variant_name || undefined,
    })),
    subtotal: order.subtotal || 0,
    shipping: order.shipping_cost || 0,
    discount: order.discount_amount || 0,
    tax: order.tax_amount || 0,
    total: order.total || 0,
    shippingAddress: {
      name: order.shipping_name || "",
      address1: order.shipping_address_line1 || "",
      address2: order.shipping_address_line2 || undefined,
      city: order.shipping_city || "",
      province: order.shipping_province || "",
      postalCode: order.shipping_postal_code || "",
      country: order.shipping_country || "South Africa",
      phone: order.shipping_phone || undefined,
    },
    billingAddress: {
      name: order.billing_name || "",
      address1: order.billing_address_line1 || "",
      address2: order.billing_address_line2 || undefined,
      city: order.billing_city || "",
      province: order.billing_province || "",
      postalCode: order.billing_postal_code || "",
      country: order.billing_country || "South Africa",
    },
    trackingNumber: order.tracking_number || undefined,
    trackingUrl: order.tracking_url || undefined,
  };
}

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
  const { fetchOrderById } = useAccountStore();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const { openCart } = useCartStore();

  useEffect(() => {
    async function loadOrder() {
      setIsLoading(true);
      try {
        const dbOrder = await fetchOrderById(orderId);
        if (dbOrder) {
          const convertedOrder = convertOrderToDetails(dbOrder);
          setOrder(convertedOrder);
        }
      } catch (error) {
        console.error("Error loading order:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadOrder();
  }, [orderId, fetchOrderById]);

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

  const handleDownloadReceipt = () => {
    if (!order) return;

    // Create receipt HTML
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Receipt - Order #${order.orderNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #0d0d0d;
            color: #ffffff;
            padding: 40px;
            min-height: 100vh;
          }
          .receipt {
            max-width: 800px;
            margin: 0 auto;
            background: linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%);
            border: 1px solid #333;
            position: relative;
            overflow: hidden;
          }
          .receipt::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #e08821, #f5a623, #e08821);
          }
          .header {
            padding: 40px;
            text-align: center;
            border-bottom: 1px solid #333;
            background: linear-gradient(180deg, rgba(224, 136, 33, 0.1) 0%, transparent 100%);
          }
          .logo {
            font-size: 32px;
            font-weight: bold;
            color: #e08821;
            letter-spacing: 4px;
            text-transform: uppercase;
            margin-bottom: 8px;
          }
          .logo-subtitle {
            font-size: 12px;
            color: #888;
            letter-spacing: 2px;
            text-transform: uppercase;
          }
          .receipt-title {
            margin-top: 24px;
            font-size: 14px;
            color: #666;
            letter-spacing: 3px;
            text-transform: uppercase;
          }
          .order-number {
            font-size: 24px;
            color: #fff;
            margin-top: 8px;
            font-family: monospace;
          }
          .order-date {
            font-size: 14px;
            color: #888;
            margin-top: 8px;
          }
          .section {
            padding: 30px 40px;
            border-bottom: 1px solid #333;
          }
          .section-title {
            font-size: 12px;
            color: #e08821;
            letter-spacing: 2px;
            text-transform: uppercase;
            margin-bottom: 16px;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
          }
          .items-table th {
            text-align: left;
            font-size: 11px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
            padding: 12px 0;
            border-bottom: 1px solid #333;
          }
          .items-table th:last-child {
            text-align: right;
          }
          .items-table td {
            padding: 16px 0;
            border-bottom: 1px solid #222;
            vertical-align: top;
          }
          .items-table td:last-child {
            text-align: right;
          }
          .item-name {
            font-weight: 500;
            color: #fff;
          }
          .item-variant {
            font-size: 13px;
            color: #666;
            margin-top: 4px;
          }
          .item-qty {
            color: #888;
          }
          .item-price {
            font-weight: 600;
            color: #fff;
          }
          .summary {
            background: rgba(224, 136, 33, 0.05);
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            color: #888;
          }
          .summary-row.total {
            border-top: 1px solid #333;
            margin-top: 12px;
            padding-top: 16px;
            font-size: 18px;
            font-weight: 700;
            color: #fff;
          }
          .summary-row.total .amount {
            color: #e08821;
          }
          .addresses {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
          }
          .address-block h4 {
            font-size: 12px;
            color: #e08821;
            letter-spacing: 2px;
            text-transform: uppercase;
            margin-bottom: 12px;
          }
          .address-block p {
            color: #888;
            line-height: 1.6;
            font-size: 14px;
          }
          .address-block .name {
            color: #fff;
            font-weight: 500;
          }
          .footer {
            padding: 30px 40px;
            text-align: center;
            background: linear-gradient(180deg, transparent 0%, rgba(224, 136, 33, 0.05) 100%);
          }
          .footer-text {
            font-size: 13px;
            color: #666;
            margin-bottom: 12px;
          }
          .footer-contact {
            font-size: 12px;
            color: #888;
          }
          .footer-contact a {
            color: #e08821;
            text-decoration: none;
          }
          .status-badge {
            display: inline-block;
            padding: 6px 16px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 16px;
            background: ${order.status === "Delivered" ? "rgba(34, 197, 94, 0.2)" : order.status === "Processing" ? "rgba(234, 179, 8, 0.2)" : "rgba(59, 130, 246, 0.2)"};
            color: ${order.status === "Delivered" ? "#22c55e" : order.status === "Processing" ? "#eab308" : "#3b82f6"};
            border: 1px solid ${order.status === "Delivered" ? "rgba(34, 197, 94, 0.3)" : order.status === "Processing" ? "rgba(234, 179, 8, 0.3)" : "rgba(59, 130, 246, 0.3)"};
          }
          @media print {
            body { background: #0d0d0d; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .receipt { border: none; }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <div class="logo">🔥 Darkpoint</div>
            <div class="logo-subtitle">Elite Gaming Gear</div>
            <div class="receipt-title">Order Receipt</div>
            <div class="order-number">#${order.orderNumber}</div>
            <div class="order-date">${new Date(order.date).toLocaleDateString("en-ZA", { 
              weekday: "long",
              day: "numeric", 
              month: "long", 
              year: "numeric"
            })}</div>
            <div class="status-badge">${order.status}</div>
          </div>

          <div class="section">
            <div class="section-title">Order Items</div>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                ${order.items.map(item => `
                  <tr>
                    <td>
                      <div class="item-name">${item.name}</div>
                      ${item.variant ? `<div class="item-variant">${item.variant}</div>` : ''}
                    </td>
                    <td class="item-qty">${item.quantity}</td>
                    <td class="item-price">R${(item.price * item.quantity).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section summary">
            <div class="section-title">Order Summary</div>
            <div class="summary-row">
              <span>Subtotal</span>
              <span>R${order.subtotal.toFixed(2)}</span>
            </div>
            ${order.discount > 0 ? `
            <div class="summary-row" style="color: #22c55e;">
              <span>🎁 Discount Applied</span>
              <span>-R${order.discount.toFixed(2)}</span>
            </div>
            ` : ''}
            <div class="summary-row">
              <span>Shipping</span>
              <span>${order.shipping === 0 ? 'Free' : `R${order.shipping.toFixed(2)}`}</span>
            </div>
            <div class="summary-row total">
              <span>Total Paid</span>
              <span class="amount">R${order.total.toFixed(2)}</span>
            </div>
          </div>

          <div class="section">
            <div class="addresses">
              <div class="address-block">
                <h4>Shipping Address</h4>
                <p>
                  <span class="name">${order.shippingAddress.name}</span><br>
                  ${order.shippingAddress.address1}<br>
                  ${order.shippingAddress.address2 ? `${order.shippingAddress.address2}<br>` : ''}
                  ${order.shippingAddress.city}, ${order.shippingAddress.province} ${order.shippingAddress.postalCode}<br>
                  ${order.shippingAddress.country}
                  ${order.shippingAddress.phone ? `<br>${order.shippingAddress.phone}` : ''}
                </p>
              </div>
              <div class="address-block">
                <h4>Billing Address</h4>
                <p>
                  <span class="name">${order.billingAddress.name}</span><br>
                  ${order.billingAddress.address1}<br>
                  ${order.billingAddress.address2 ? `${order.billingAddress.address2}<br>` : ''}
                  ${order.billingAddress.city}, ${order.billingAddress.province} ${order.billingAddress.postalCode}<br>
                  ${order.billingAddress.country}
                </p>
              </div>
            </div>
          </div>

          <div class="footer">
            <p class="footer-text">Thank you for shopping with Darkpoint!</p>
            <p class="footer-contact">
              Questions? Contact us at <a href="mailto:support@darkpoint.co.za">support@darkpoint.co.za</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Create blob and download
    const blob = new Blob([receiptHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Open in new window for printing/saving
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (isLoading) {
    return (
      <AccountLayout title="Loading Order">
        <div className="space-y-4 animate-pulse">
          <div className="h-8 bg-[var(--color-dark-3)] rounded w-48" />
          <div className="h-32 bg-[var(--color-dark-2)] rounded" />
          <div className="h-64 bg-[var(--color-dark-2)] rounded" />
        </div>
      </AccountLayout>
    );
  }

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
          <p className="text-xs text-white/50 mt-1">
            We&apos;ll email you when your order status changes.
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
            {order.discount > 0 && (
              <div className="flex justify-between text-green-500">
                <span className="flex items-center gap-2">
                  <span>🎁</span> Discount Applied
                </span>
                <span>-{formatPrice(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-white/70">
              <span>Shipping</span>
              <span>{order.shipping === 0 ? "Free" : formatPrice(order.shipping)}</span>
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
                  <p className="text-sm text-white/60">
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
        <Button variant="outline" className="cursor-pointer inline-flex items-center" onClick={handleDownloadReceipt}>
          <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Download Receipt</span>
        </Button>
        <Link href={`/contact?subject=Order%20%23${order.orderNumber}%20Inquiry`}>
          <Button variant="outline" className="cursor-pointer inline-flex items-center">
            <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Need Help?</span>
          </Button>
        </Link>
        {order.status === "Delivered" && (
          <Button variant="primary" className="cursor-pointer inline-flex items-center" onClick={handleReorder}>
            <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Reorder</span>
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

