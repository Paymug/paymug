import { findCustomerByEmail } from "@/lib/customer-accounts";
import { resolveCustomerAvatarUrl } from "@/lib/customer-avatar";
import { listFeatureRecords } from "@/lib/feature-records";
import type { Order } from "@/lib/types";
import { getLicenseEntitlementSummary } from "@/lib/license-entitlements";
import { getOrderCustomerOrigin } from "@/lib/customer-origin.utils";
import type { OriginVisit } from "@/lib/customer-origin.types";
import type { DashboardOrderItem } from "./OrdersWorkspace.types";

function resolveProductPrice(order: Order): number {
  if (typeof order.productPrice === "number") return order.productPrice;
  return Math.max(
    0,
    order.amount + order.discountAmount - order.transactionFeeAmount
  );
}

function timeValue(value: string | undefined): number {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function groupOrders(items: DashboardOrderItem[]): DashboardOrderItem[] {
  const groups = new Map<string, DashboardOrderItem[]>();
  for (const item of items) {
    const key = `${item.customerEmail.trim().toLowerCase()}|${item.productId}`;
    const list = groups.get(key);
    if (list) list.push(item);
    else groups.set(key, [item]);
  }

  const merged: DashboardOrderItem[] = [];
  for (const list of groups.values()) {
    // Walk the attempts oldest → newest. A paid order closes the group, so any
    // activity after a payment starts a new group.
    const sorted = [...list].sort(
      (a, b) => timeValue(a.createdAt) - timeValue(b.createdAt),
    );
    let current: DashboardOrderItem[] = [];
    const flush = () => {
      if (current.length === 0) return;
      const paidOrders = current.filter((order) => order.status === "paid");
      const representative = paidOrders.length
        ? paidOrders[paidOrders.length - 1]
        : [...current]
            .reverse()
            .find((order) => order.status === "pending") ??
          current[current.length - 1];
      const timeline = current.map((order) => ({
        id: order.id,
        status: order.status,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
        amount: order.amount,
        currency: order.currency,
        gateway: order.gateway,
        paymentFailureDetails: order.paymentFailureDetails,
      }));
      merged.push({ ...representative, orderCount: current.length, timeline });
      current = [];
    };
    for (const order of sorted) {
      current.push(order);
      if (order.status === "paid") flush();
    }
    flush();
  }

  return merged.sort(
    (a, b) => timeValue(b.createdAt) - timeValue(a.createdAt),
  );
}

export async function buildDashboardOrderItems(
  userId: string,
  orders: Order[],
  originVisitsByEmail: Map<string, OriginVisit[]>,
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

  const items = orders.map((order): DashboardOrderItem => {
    const email = order.customerEmail.trim().toLowerCase();
    const customer = customerByEmail.get(email);
    const hasGithub =
      Boolean(order.githubRepoOwner && order.githubRepoName) ||
      order.githubAccessStatus !== "not_required";

    return {
      id: order.id,
      productId: order.productId,
      productName: order.productName,
      productDescription: order.productDescription,
      productPrice: resolveProductPrice(order),
      amount: order.amount,
      currency: order.currency,
      status: order.status,
      customerEmail: order.customerEmail,
      ...getOrderCustomerOrigin(originVisitsByEmail.get(email) ?? [], order.createdAt),
      customerName:
        customer?.name ||
        order.customerName ||
        order.customerEmail.split("@")[0] ||
        order.customerEmail,
      customerAvatarUrl: resolveCustomerAvatarUrl({
        email,
        avatarImageUrl: customer?.avatarImageUrl,
      }),
      customerNote:
        typeof order.custom.note === "string" && order.custom.note.trim()
          ? order.custom.note.trim()
          : undefined,
      discountCode: order.discountCode,
      discountAmount: order.discountAmount,
      transactionFeeAmount: order.transactionFeeAmount,
      gateway: order.gateway,
      environment: order.environment,
      createdAt: order.createdAt,
      paidAt: order.paidAt,
      paymentFailureDetails: order.paymentFailureDetails ?? undefined,
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

  return groupOrders(items);
}
