"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AccountLayout } from "@/components/account";
import { Button } from "@/components/ui";
import { useAccountStore } from "@/stores";
import type { OrderStatus } from "@/types/database";

const statusColors: Record<OrderStatus, string> = {
  pending: "text-gray-400 bg-gray-400/10",
  processing: "text-yellow-500 bg-yellow-500/10",
  shipped: "text-blue-400 bg-blue-400/10",
  delivered: "text-green-500 bg-green-500/10",
  cancelled: "text-red-400 bg-red-400/10",
  refunded: "text-purple-400 bg-purple-400/10",
};

const statusLabels: Record<OrderStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatCurrency(amount: number): string {
  return `R${amount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function OrdersPageClient() {
  const { orders, isLoadingOrders, fetchOrders } = useAccountStore();

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <AccountLayout title="Orders">
      {isLoadingOrders ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[var(--color-dark-2)] p-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-[var(--color-dark-3)] rounded w-20" />
                  <div className="h-3 bg-[var(--color-dark-3)] rounded w-32" />
                </div>
                <div className="space-y-2 text-right">
                  <div className="h-4 bg-[var(--color-dark-3)] rounded w-24 ml-auto" />
                  <div className="h-3 bg-[var(--color-dark-3)] rounded w-16 ml-auto" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : orders.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-dark-3)]">
                <th className="text-left py-4 px-4 text-sm font-medium text-white/60 uppercase tracking-wider">Order</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-white/60 uppercase tracking-wider">Date</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-white/60 uppercase tracking-wider">Status</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-white/60 uppercase tracking-wider">Total</th>
                <th className="text-right py-4 px-4 text-sm font-medium text-white/60 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-[var(--color-dark-3)] hover:bg-[var(--color-dark-2)] transition-colors">
                  <td className="py-4 px-4">
                    <span className="font-medium">#{order.order_number}</span>
                  </td>
                  <td className="py-4 px-4 text-white/70">
                    {formatDate(order.created_at)}
                  </td>
                  <td className="py-4 px-4">
                    <span className={`text-xs px-2 py-1 rounded ${statusColors[order.status]}`}>
                      {statusLabels[order.status]}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-medium">
                    {formatCurrency(order.total)}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <Link href={`/account/orders/${order.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 bg-[var(--color-dark-2)]">
          <svg className="w-16 h-16 mx-auto text-white/20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <h3 className="text-lg font-medium mb-2">No orders yet</h3>
          <p className="text-white/60 mb-6">
            When you place orders, they will appear here.
          </p>
          <Link href="/store">
            <Button variant="primary">Start Shopping</Button>
          </Link>
        </div>
      )}
    </AccountLayout>
  );
}
