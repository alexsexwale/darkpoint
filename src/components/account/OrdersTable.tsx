"use client";

import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui";

export interface Order {
  id: string;
  orderNumber: string;
  date: string;
  status: "Processing" | "Shipped" | "Delivered" | "Cancelled" | "Refunded";
  total: number;
}

interface OrdersTableProps {
  orders: Order[];
  emptyMessage?: string;
}

const statusColors: Record<Order["status"], string> = {
  Processing: "text-yellow-500",
  Shipped: "text-blue-400",
  Delivered: "text-green-500",
  Cancelled: "text-red-500",
  Refunded: "text-gray-400",
};

export function OrdersTable({ orders, emptyMessage = "No orders found." }: OrdersTableProps) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--muted-foreground)]">{emptyMessage}</p>
        <Link href="/store" className="inline-block mt-4">
          <Button variant="outline">Browse Products</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left py-3 px-4 font-heading text-sm uppercase tracking-wider">
              Order
            </th>
            <th className="text-left py-3 px-4 font-heading text-sm uppercase tracking-wider">
              Date
            </th>
            <th className="text-left py-3 px-4 font-heading text-sm uppercase tracking-wider">
              Status
            </th>
            <th className="text-left py-3 px-4 font-heading text-sm uppercase tracking-wider">
              Total
            </th>
            <th className="py-3 px-4">&nbsp;</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
              <td className="py-4 px-4">
                <Link
                  href={`/account/orders/${order.id}`}
                  className="text-[var(--color-main-1)] hover:underline"
                >
                  #{order.orderNumber}
                </Link>
              </td>
              <td className="py-4 px-4 text-white/70">
                <time dateTime={order.date}>
                  {new Date(order.date).toLocaleDateString("en-ZA", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </time>
              </td>
              <td className={`py-4 px-4 ${statusColors[order.status]}`}>
                {order.status}
              </td>
              <td className="py-4 px-4">{formatPrice(order.total)}</td>
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
  );
}


