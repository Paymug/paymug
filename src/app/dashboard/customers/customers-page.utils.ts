import type { CustomerAccount } from "@/lib/customer-auth.types";
import type { StoreCustomerEmailPreference } from "@/lib/customer-email-preferences";
import type {
  FeatureRecord,
  FeatureRecordValue,
} from "@/lib/feature-records.types";
import {
  parseLicenseActivations,
  parseLicenseSeatLimit,
} from "@/lib/license-activations.utils";
import { resolveCustomerAvatarUrl } from "@/lib/customer-avatar";
import { normalizeLegacySubscriptionInterval } from "@/lib/product-billing";
import type { Order } from "@/lib/types";
import type {
  CustomerEmailStatus,
  CustomerLicenseSummary,
  CustomerOrderSummary,
  CustomerSubscriptionSummary,
  CustomerSummary,
  CustomerTimelineEvent,
} from "./customers.types";

export interface BuildCustomerSummariesInput {
  orders: Order[];
  subscriptions: FeatureRecord[];
  licenses: FeatureRecord[];
  subscribers: FeatureRecord[];
  accounts: CustomerAccount[];
  storeEmailPreferences: StoreCustomerEmailPreference[];
  /** Customers with linked storefront visits on two or more distinct days. */
  returningEmails: string[];
  defaultCurrency: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function asString(value: FeatureRecordValue | undefined): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNumber(value: FeatureRecordValue | undefined): number | undefined {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getSubscriptionInterval(subscription: FeatureRecord) {
  const intervalUnit = asString(subscription.data.intervalUnit);
  const intervalCount = asNumber(subscription.data.intervalCount) ?? 1;
  return intervalUnit
    ? { unit: intervalUnit, count: intervalCount }
    : normalizeLegacySubscriptionInterval(subscription.data.interval);
}

function subscriptionMonthlyCents(subscription: FeatureRecord): number {
  const amountMajor = asNumber(subscription.data.amount) ?? 0;
  const { unit, count } = getSubscriptionInterval(subscription);
  const monthsPerPeriod =
    unit === "week"
      ? (count * 7) / 30.4375
      : unit === "year"
        ? count * 12
        : count;
  if (monthsPerPeriod <= 0) return 0;
  return Math.round((amountMajor / monthsPerPeriod) * 100);
}

function subscriptionIntervalLabel(
  subscription: FeatureRecord,
): string | undefined {
  const { unit, count } = getSubscriptionInterval(subscription);
  if (count === 1) {
    return unit === "week" ? "Weekly" : unit === "year" ? "Yearly" : "Monthly";
  }
  return `Every ${count} ${unit}s`;
}

function resolveEmailStatus(
  email: string,
  subscriberStatusByEmail: Map<string, string>,
  marketingDisabled: Set<string>,
): CustomerEmailStatus {
  if (marketingDisabled.has(email)) return "unsubscribed";
  if (subscriberStatusByEmail.get(email) === "unsubscribed") {
    return "unsubscribed";
  }
  return "subscribed";
}

function groupByEmail<T>(
  records: T[],
  getEmail: (record: T) => string | undefined,
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const record of records) {
    const email = getEmail(record);
    if (!email) continue;
    const normalized = normalizeEmail(email);
    if (!normalized) continue;
    const list = grouped.get(normalized) ?? [];
    list.push(record);
    grouped.set(normalized, list);
  }
  return grouped;
}

function timeValue(value: string | undefined): number {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildOrders(orders: Order[], currency: string): CustomerOrderSummary[] {
  return [...orders]
    .sort((left, right) => timeValue(right.createdAt) - timeValue(left.createdAt))
    .map((order) => ({
      id: order.id,
      productName: order.productName,
      amount: order.amount,
      currency: order.currency || currency,
      status: order.status,
      gateway: order.gateway,
      createdAt: order.createdAt,
      paidAt: order.paidAt,
      discountCode: order.discountCode,
      discountAmount: order.discountAmount,
    }));
}

function buildSubscriptions(
  subscriptions: FeatureRecord[],
  currency: string,
): CustomerSubscriptionSummary[] {
  return [...subscriptions]
    .sort(
      (left, right) => timeValue(right.createdAt) - timeValue(left.createdAt),
    )
    .map((subscription) => ({
      id: subscription.id,
      plan: subscription.title,
      status: subscription.status,
      amount: Math.round((asNumber(subscription.data.amount) ?? 0) * 100),
      currency: asString(subscription.data.currency) ?? currency,
      intervalLabel: subscriptionIntervalLabel(subscription),
      updatedAt: subscription.updatedAt,
    }));
}

function buildLicenses(licenses: FeatureRecord[]): CustomerLicenseSummary[] {
  return [...licenses]
    .sort((left, right) => timeValue(right.createdAt) - timeValue(left.createdAt))
    .map((license) => ({
      id: license.id,
      key: license.title,
      product: asString(license.data.product) ?? "License",
      status: license.status,
      seatLimit: parseLicenseSeatLimit(license.data.seatLimit),
      issuedAt: asString(license.data.issuedAt) ?? license.createdAt,
      orderId: asString(license.data.orderId),
      activations: parseLicenseActivations(license.data.appActivations),
    }));
}

function buildTimeline(input: {
  orders: Order[];
  subscriptions: FeatureRecord[];
  licenses: FeatureRecord[];
  subscriber?: FeatureRecord;
  account?: CustomerAccount;
  marketingDisabledPreference?: StoreCustomerEmailPreference;
}): CustomerTimelineEvent[] {
  const events: CustomerTimelineEvent[] = [];
  const push = (event: Omit<CustomerTimelineEvent, "id">) => {
    events.push({ ...event, id: `${event.kind}-${event.at}-${events.length}` });
  };

  for (const order of input.orders) {
    push({
      kind: "order",
      title: "Order created",
      description: order.productName,
      at: order.createdAt,
    });
    if (order.status === "paid" && order.paidAt) {
      push({
        kind: "payment",
        title: "Payment received",
        description: order.productName,
        amount: order.amount,
        currency: order.currency,
        at: order.paidAt,
      });
    } else if (order.status === "refunded") {
      push({
        kind: "refund",
        title: "Order refunded",
        description: order.productName,
        amount: order.amount,
        currency: order.currency,
        at: order.paidAt || order.createdAt,
      });
    } else if (order.status === "failed") {
      push({
        kind: "payment_failed",
        title: "Payment failed",
        description: order.productName,
        at: order.createdAt,
      });
    }
  }

  for (const subscription of input.subscriptions) {
    push({
      kind: "subscription",
      title: "Subscription started",
      description: subscription.title,
      at: subscription.createdAt,
    });
    const history = Array.isArray(subscription.data.paypalPaymentHistory)
      ? subscription.data.paypalPaymentHistory
      : [];
    for (const entry of history) {
      if (!entry || typeof entry !== "object") continue;
      const payment = entry as Record<string, unknown>;
      const date = typeof payment.date === "string" ? payment.date : undefined;
      const amount =
        typeof payment.amount === "number" ? payment.amount : Number.NaN;
      if (!date || !Number.isFinite(amount)) continue;
      push({
        kind: "payment",
        title: "Subscription payment",
        description: subscription.title,
        amount: Math.round(amount * 100),
        currency:
          typeof payment.currency === "string"
            ? payment.currency
            : asString(subscription.data.currency),
        at: date,
      });
    }
    const failedAt = asString(subscription.data.lastPaymentFailedAt);
    if (failedAt) {
      push({
        kind: "payment_failed",
        title: "Subscription payment failed",
        description: subscription.title,
        at: failedAt,
      });
    }
  }

  for (const license of input.licenses) {
    push({
      kind: "license",
      title: "License issued",
      description: asString(license.data.product) ?? license.title,
      at: asString(license.data.issuedAt) ?? license.createdAt,
    });
  }

  if (input.account) {
    push({
      kind: "account",
      title: "Account created",
      at: input.account.createdAt,
    });
  }

  const subscriber = input.subscriber;
  if (subscriber) {
    push({
      kind: "email",
      title: "Subscribed to emails",
      at: subscriber.createdAt,
    });
    const unsubscribedAt = asString(subscriber.data.unsubscribedAt);
    if (subscriber.status === "unsubscribed" || unsubscribedAt) {
      push({
        kind: "email",
        title: "Unsubscribed from emails",
        at: unsubscribedAt ?? subscriber.updatedAt,
      });
    }
  }

  const preference = input.marketingDisabledPreference;
  if (preference && !preference.marketingEnabled) {
    push({
      kind: "email",
      title: "Marketing emails disabled",
      at: preference.updatedAt,
    });
  }

  return events
    .sort((left, right) => timeValue(right.at) - timeValue(left.at))
    .slice(0, 200);
}

export function buildCustomerSummaries(
  input: BuildCustomerSummariesInput,
): CustomerSummary[] {
  const accountByEmail = new Map(
    input.accounts.map((account) => [normalizeEmail(account.email), account]),
  );
  const returningEmails = new Set(
    input.returningEmails.map((email) => normalizeEmail(email)),
  );
  const marketingDisabled = new Set(
    input.storeEmailPreferences
      .filter((preference) => !preference.marketingEnabled)
      .map((preference) => normalizeEmail(preference.email)),
  );
  const preferenceByEmail = new Map(
    input.storeEmailPreferences.map((preference) => [
      normalizeEmail(preference.email),
      preference,
    ]),
  );
  const subscriberStatusByEmail = new Map<string, string>();
  const subscriberByEmail = new Map<string, FeatureRecord>();
  for (const record of input.subscribers) {
    const email = normalizeEmail(record.title);
    if (!subscriberStatusByEmail.has(email)) {
      subscriberStatusByEmail.set(email, record.status);
      subscriberByEmail.set(email, record);
    }
  }

  const ordersByEmail = groupByEmail(input.orders, (order) => order.customerEmail);
  const subscriptionsByEmail = groupByEmail(
    input.subscriptions,
    (record) => record.subtitle,
  );
  const licensesByEmail = groupByEmail(
    input.licenses,
    (record) => asString(record.data.customerEmail) ?? record.subtitle,
  );

  const emails = new Set<string>([
    ...ordersByEmail.keys(),
    ...subscriptionsByEmail.keys(),
    ...licensesByEmail.keys(),
  ]);

  return [...emails]
    .map((email) => {
      const orders = ordersByEmail.get(email) ?? [];
      const subscriptions = subscriptionsByEmail.get(email) ?? [];
      const licenses = licensesByEmail.get(email) ?? [];
      const account = accountByEmail.get(email);
      const paidOrders = orders.filter((order) => order.status === "paid");
      const currency =
        paidOrders[0]?.currency ?? orders[0]?.currency ?? input.defaultCurrency;
      const firstSeen = [
        ...orders.map((order) => order.createdAt),
        ...subscriptions.map((subscription) => subscription.createdAt),
        ...licenses.map(
          (license) => asString(license.data.issuedAt) ?? license.createdAt,
        ),
        account?.createdAt,
      ]
        .filter((value): value is string => Boolean(value))
        .sort((left, right) => timeValue(left) - timeValue(right))[0];

      const name =
        orders.find((order) => order.status === "paid" && order.customerName)
          ?.customerName ||
        orders.find((order) => order.customerName)?.customerName ||
        account?.name ||
        email.split("@")[0];

      const summary: CustomerSummary = {
        email,
        name,
        avatarUrl: resolveCustomerAvatarUrl({
          email,
          avatarImageUrl: account?.avatarImageUrl,
        }),
        firstSeen: firstSeen ?? new Date().toISOString(),
        emailStatus: resolveEmailStatus(
          email,
          subscriberStatusByEmail,
          marketingDisabled,
        ),
        subscriptionsCount: subscriptions.length,
        ordersCount: paidOrders.length,
        mrr: subscriptions
          .filter((subscription) => subscription.status === "active")
          .reduce(
            (total, subscription) =>
              total + subscriptionMonthlyCents(subscription),
            0,
          ),
        revenue: paidOrders.reduce((total, order) => total + order.amount, 0),
        isReturning: returningEmails.has(email),
        currency,
        orders: buildOrders(orders, currency),
        subscriptions: buildSubscriptions(subscriptions, currency),
        licenses: buildLicenses(licenses),
        timeline: buildTimeline({
          orders,
          subscriptions,
          licenses,
          subscriber: subscriberByEmail.get(email),
          account,
          marketingDisabledPreference: preferenceByEmail.get(email),
        }),
      };
      return summary;
    })
    .sort((left, right) => timeValue(right.firstSeen) - timeValue(left.firstSeen));
}
