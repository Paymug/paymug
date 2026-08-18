import { getOrderLicense } from "@/lib/commerce-features";
import { findOrderById, findProductById } from "@/lib/db";
import { jsonError } from "@/lib/utils";
import { getLicenseEntitlementSummary } from "@/lib/license-entitlements";

type Ctx = { params: Promise<{ id: string }> };

/** Public order lookup for checkout success page (limited fields). */
export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const order = await findOrderById(id);
  if (!order) return jsonError("Not found", 404);

  const [product, license] =
    order.status === "paid"
      ? await Promise.all([
          findProductById(order.productId),
          getOrderLicense(order.userId, order.id),
        ])
      : [null, null];
  const licenseEntitlement = license
    ? getLicenseEntitlementSummary(license)
    : undefined;

  return Response.json({
    order: {
      id: order.id,
      status: order.status,
      productName: order.productName,
      amount: order.amount,
      currency: order.currency,
      customerEmail: order.customerEmail,
      deliveryContent:
        licenseEntitlement?.perpetual && licenseEntitlement.updatesActive
          ? product?.deliveryContent || order.deliveryContent
          : order.deliveryContent || product?.deliveryContent,
      licenseKey: license?.title,
      licenseType: licenseEntitlement?.type,
      licenseUsageActive: licenseEntitlement?.usageActive,
      licenseUpdatesExpireAt: licenseEntitlement?.updatesExpireAt,
      licenseUpdatesActive: licenseEntitlement?.updatesActive,
      githubUsername: order.githubUsername,
      githubAccessStatus: order.githubAccessStatus,
      githubAccessError: order.githubAccessError,
      paidAt: order.paidAt,
      paypalOrderId: order.paypalOrderId,
      stripeCheckoutSessionId: order.stripeCheckoutSessionId,
      stripePaymentIntentId: order.stripePaymentIntentId,
    },
  });
}
