import type { OrderStatus } from "@/lib/types";

export function formatOrderNumber(orderId: string): string {
  const short = orderId.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `#${short}`;
}

export function formatOrderListDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatOrderDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function getOrderStatusBadgeVariant(
  status: OrderStatus
): "success" | "warning" | "danger" | "muted" {
  if (status === "paid") return "success";
  if (status === "pending") return "warning";
  if (status === "failed") return "danger";
  return "muted";
}

export function getCustomerInitials(name: string, email: string): string {
  const source = name.trim() || email.trim();
  if (!source) return "?";
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}
