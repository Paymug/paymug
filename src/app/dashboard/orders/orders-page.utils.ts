import { findCustomerByEmail } from "@/lib/customer-accounts";
import { listFeatureRecords } from "@/lib/feature-records";
import type { Order } from "@/lib/types";
import { getLicenseEntitlementSummary } from "@/lib/license-entitlements";
import type { DashboardOrderItem } from "./OrdersWorkspace.types";

function resolveProductPrice(order: Order): number {
  if (typeof order.productPrice === "number") return order.productPrice;
  return Math.max(
    0,
    order.amount + order.discountAmount - order.transactionFeeAmount
  );
}

export async function buildDashboardOrderItems(
  userId: string,
  orders: Order[]
): Promise<DashboardOrderItem[]> {
  const uniqueEmails = [
    ...new Set(
      orders.map((order) => order.customerEmail.trim().toLowerCase())
    ),
  ];
  const [licenses, customers] = await Promise.all([
    listFeatureRecords(userId, "licenses"),
    Promise.all(
      uniqueEmails.map(async (email) => {
        const customer = await findCustomerByEmail(email);
        return [email, customer] as const;
      })
    ),
  ]);

  const customerByEmail = new Map(customers);
  const licensesByOrderId = new Map(
    licenses
      .map((license) => {
        const orderId =
          typeof license.data.orderId === "string"
            ? license.data.orderId
            : "";
        if (!orderId) return null;
        const entitlement = getLicenseEntitlementSummary(license);
        return [
          orderId,
          {
            key: license.title,
            status: license.status,
            expiresAt:
              typeof license.data.expiresAt === "string"
                ? license.data.expiresAt
                : undefined,
            type: entitlement.type,
            perpetual: entitlement.perpetual,
            updatesExpireAt: entitlement.updatesExpireAt,
            updatesActive: entitlement.updatesActive,
          },
        ] as const;
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
  );

  return orders.map((order): DashboardOrderItem => {
    const email = order.customerEmail.trim().toLowerCase();
    const customer = customerByEmail.get(email);
    const hasGithub =
      Boolean(order.githubRepoOwner && order.githubRepoName) ||
      order.githubAccessStatus !== "not_required";

    return {
      id: order.id,
      productName: order.productName,
      productDescription: order.productDescription,
      productPrice: resolveProductPrice(order),
      amount: order.amount,
      currency: order.currency,
      status: order.status,
      customerEmail: order.customerEmail,
      customerName:
        customer?.name ||
        order.customerName ||
        order.customerEmail.split("@")[0] ||
        order.customerEmail,
      customerAvatarUrl: customer?.avatarImageUrl,
      discountCode: order.discountCode,
      discountAmount: order.discountAmount,
      transactionFeeAmount: order.transactionFeeAmount,
      gateway: order.gateway,
      environment: order.environment,
      createdAt: order.createdAt,
      paidAt: order.paidAt,
      deliveryContent:
        order.status === "paid" ? order.deliveryContent : undefined,
      productFiles: order.status === "paid" ? order.productFiles : [],
      license: licensesByOrderId.get(order.id),
      githubRepository:
        order.githubRepoOwner && order.githubRepoName
          ? `${order.githubRepoOwner}/${order.githubRepoName}`
          : undefined,
      githubUsername: order.githubUsername,
      githubAccessStatus: hasGithub ? order.githubAccessStatus : undefined,
    };
  });
}
