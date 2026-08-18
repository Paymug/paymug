import type { CustomerPortalPurchase } from "@/lib/customer-portal.types";

export function getCustomerStatusClass(status: string): string {
  const normalized = status.toLowerCase();
  if (
    ["paid", "active", "invited", "existing", "completed"].includes(
      normalized
    )
  ) {
    return "bg-emerald-50 text-emerald-700";
  }
  if (
    ["failed", "refunded", "revoked", "cancelled", "expired"].includes(
      normalized
    )
  ) {
    return "bg-red-50 text-red-700";
  }
  return "bg-amber-50 text-amber-700";
}

export function formatCustomerPortalDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function getCustomerPaymentReference(
  purchase: CustomerPortalPurchase,
): string {
  return (
    purchase.paypalCaptureId ||
    purchase.paypalOrderId ||
    purchase.stripePaymentIntentId ||
    purchase.stripeCheckoutSessionId ||
    purchase.id
  );
}

export function isCustomerPortalNavItemActive(
  pathname: string,
  href: string,
): boolean {
  return pathname === href;
}
