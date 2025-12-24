"use client";

import { AccountLayout, OrdersTable, type Order } from "@/components/account";

// Mock orders data - in a real app this would come from an API
const mockOrders: Order[] = [
  {
    id: "24",
    orderNumber: "24",
    date: "2024-12-15",
    status: "Processing",
    total: 1049.99,
  },
  {
    id: "18",
    orderNumber: "18",
    date: "2024-12-10",
    status: "Shipped",
    total: 2500.0,
  },
  {
    id: "12",
    orderNumber: "12",
    date: "2024-11-28",
    status: "Delivered",
    total: 899.0,
  },
];

export function OrdersPageClient() {
  return (
    <AccountLayout title="Orders">
      <OrdersTable orders={mockOrders} />
    </AccountLayout>
  );
}


