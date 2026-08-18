import type { NotificationType } from "@/lib/notifications.types";

export function formatNotificationAge(createdAt: string) {
  const elapsed = Date.now() - new Date(createdAt).getTime();
  const minutes = Math.max(0, Math.floor(elapsed / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function getNotificationAccentClass(type: NotificationType) {
  if (type === "payment_failed" || type === "payment_refunded") {
    return "bg-[#f14e76]";
  }
  if (
    type === "payment_received" ||
    type === "order_completed" ||
    type === "subscription_renewed"
  ) {
    return "bg-[#27a56d]";
  }
  if (type === "affiliate_applied") return "bg-[#e6932f]";
  return "bg-accent";
}

export async function markNotificationsRead() {
  const response = await fetch("/api/notifications", { method: "PATCH" });
  return response.ok;
}
