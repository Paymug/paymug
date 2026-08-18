import { pctChange } from "@/lib/analytics.utils";
import type { FeatureRecord } from "@/lib/feature-records.types";
import type { Order } from "@/lib/types";
import { addDays } from "./dashboard-filter.utils";
import type {
  BuildDashboardOverviewInput,
  DashboardInterval,
  DashboardMetricSeries,
  DashboardOverviewData,
  DashboardSeriesBucket,
  PayPalPaymentHistoryItem,
} from "./dashboard-overview.types";

function toDate(value: string) {
  return new Date(`${value.slice(0, 10)}T12:00:00Z`);
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function daysBetween(startDate: string, endDate: string) {
  return Math.max(
    0,
    Math.round(
      (toDate(endDate).getTime() - toDate(startDate).getTime()) / 86_400_000
    )
  );
}

function formatBucketLabel(
  startDate: string,
  endDate: string,
  interval: DashboardInterval
) {
  if (interval === "monthly") {
    return toDate(startDate).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  const start = toDate(startDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  if (startDate === endDate) return start;
  const end = toDate(endDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return `${start}–${end}`;
}

function createBuckets(
  startDate: string,
  endDate: string,
  interval: DashboardInterval
): DashboardSeriesBucket[] {
  const buckets: DashboardSeriesBucket[] = [];
  let cursor = toDate(startDate);
  const end = toDate(endDate);

  while (cursor <= end) {
    const bucketStart = toDateKey(cursor);
    let candidateEnd: Date;
    if (interval === "monthly") {
      candidateEnd = new Date(
        Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0, 12)
      );
    } else {
      candidateEnd = addDays(cursor, interval === "weekly" ? 6 : 0);
    }
    const bucketEnd = candidateEnd > end ? end : candidateEnd;
    const bucketEndKey = toDateKey(bucketEnd);
    buckets.push({
      startDate: bucketStart,
      endDate: bucketEndKey,
      label: formatBucketLabel(bucketStart, bucketEndKey, interval),
      value: 0,
    });
    cursor = addDays(bucketEnd, 1);
  }
  return buckets;
}

function addValueToBucket(
  buckets: DashboardSeriesBucket[],
  date: string,
  value: number
) {
  const dateKey = date.slice(0, 10);
  const bucket = buckets.find(
    (candidate) =>
      dateKey >= candidate.startDate && dateKey <= candidate.endDate
  );
  if (bucket) bucket.value += value;
}

function toChartPoints(buckets: DashboardSeriesBucket[]) {
  return [...buckets]
    .sort((left, right) => left.startDate.localeCompare(right.startDate))
    .map((bucket) => ({
      label: bucket.label,
      value: bucket.value,
      date: bucket.startDate,
    }));
}

function getPreviousRange(startDate: string, endDate: string) {
  const duration = daysBetween(startDate, endDate) + 1;
  const previousEnd = addDays(toDate(startDate), -1);
  const previousStart = addDays(previousEnd, -(duration - 1));
  return {
    startDate: toDateKey(previousStart),
    endDate: toDateKey(previousEnd),
  };
}

function filterOrders(
  orders: Order[],
  productId: string
) {
  return productId === "all"
    ? orders
    : orders.filter((order) => order.productId === productId);
}

function buildOrderBuckets(
  orders: Order[],
  startDate: string,
  endDate: string,
  interval: DashboardInterval,
  kind: "revenue" | "refunds" | "net"
) {
  const buckets = createBuckets(startDate, endDate, interval);
  for (const order of orders) {
    const date = (order.paidAt || order.createdAt).slice(0, 10);
    if (date < startDate || date > endDate) continue;
    const revenue = order.status === "paid" ? order.amount : 0;
    const refunds = order.status === "refunded" ? order.amount : 0;
    const value =
      kind === "revenue"
        ? revenue
        : kind === "refunds"
          ? refunds
          : revenue - refunds;
    if (value) addValueToBucket(buckets, date, value);
  }
  return buckets;
}

function buildOrderValueBuckets(
  orders: Order[],
  startDate: string,
  endDate: string,
  interval: DashboardInterval,
  getValue: (order: Order) => number
) {
  const buckets = createBuckets(startDate, endDate, interval);
  for (const order of orders) {
    const date = (order.paidAt || order.createdAt).slice(0, 10);
    if (date < startDate || date > endDate) continue;
    const value = getValue(order);
    if (value) addValueToBucket(buckets, date, value);
  }
  return buckets;
}

function buildAverageBuckets(
  revenueBuckets: DashboardSeriesBucket[],
  orderBuckets: DashboardSeriesBucket[]
) {
  return revenueBuckets.map((bucket, index) => ({
    ...bucket,
    value: orderBuckets[index]?.value
      ? Math.round(bucket.value / orderBuckets[index].value)
      : 0,
  }));
}

function buildRateBuckets(
  numeratorBuckets: DashboardSeriesBucket[],
  denominatorBuckets: DashboardSeriesBucket[]
) {
  return numeratorBuckets.map((bucket, index) => ({
    ...bucket,
    value: denominatorBuckets[index]?.value
      ? (bucket.value / denominatorBuckets[index].value) * 100
      : 0,
  }));
}

function buildReturningCustomerBuckets(
  orders: Order[],
  startDate: string,
  endDate: string,
  interval: DashboardInterval
) {
  const buckets = createBuckets(startDate, endDate, interval);
  const seenCustomers = new Set<string>();
  const customersByBucket = buckets.map(() => new Set<string>());
  const returningByBucket = buckets.map(() => new Set<string>());
  const paidOrders = orders
    .filter((order) => order.status === "paid")
    .sort((left, right) =>
      (left.paidAt || left.createdAt).localeCompare(
        right.paidAt || right.createdAt
      )
    );

  for (const order of paidOrders) {
    const date = (order.paidAt || order.createdAt).slice(0, 10);
    const customer = order.customerEmail.trim().toLowerCase();
    const bucketIndex = buckets.findIndex(
      (bucket) => date >= bucket.startDate && date <= bucket.endDate
    );
    if (bucketIndex >= 0) {
      customersByBucket[bucketIndex].add(customer);
      if (seenCustomers.has(customer)) {
        returningByBucket[bucketIndex].add(customer);
      }
    }
    if (date <= endDate) seenCustomers.add(customer);
  }

  return buckets.map((bucket, index) => ({
    ...bucket,
    value: customersByBucket[index].size
      ? (returningByBucket[index].size / customersByBucket[index].size) * 100
      : 0,
  }));
}

function getReturningCustomerRate(
  orders: Order[],
  startDate: string,
  endDate: string
) {
  const seenCustomers = new Set<string>();
  const periodCustomers = new Set<string>();
  const returningCustomers = new Set<string>();
  const paidOrders = orders
    .filter((order) => order.status === "paid")
    .sort((left, right) =>
      (left.paidAt || left.createdAt).localeCompare(
        right.paidAt || right.createdAt
      )
    );

  for (const order of paidOrders) {
    const date = (order.paidAt || order.createdAt).slice(0, 10);
    const customer = order.customerEmail.trim().toLowerCase();
    if (date >= startDate && date <= endDate) {
      periodCustomers.add(customer);
      if (seenCustomers.has(customer)) returningCustomers.add(customer);
    }
    if (date <= endDate) seenCustomers.add(customer);
  }

  return periodCustomers.size
    ? (returningCustomers.size / periodCustomers.size) * 100
    : 0;
}

function buildFeatureBuckets(
  records: FeatureRecord[],
  startDate: string,
  endDate: string,
  interval: DashboardInterval,
  getValue: (record: FeatureRecord) => number,
  getDate: (record: FeatureRecord) => string = (record) => record.createdAt
) {
  const buckets = createBuckets(startDate, endDate, interval);
  for (const record of records) {
    const date = getDate(record).slice(0, 10);
    if (date < startDate || date > endDate) continue;
    const value = getValue(record);
    if (value) addValueToBucket(buckets, date, value);
  }
  return buckets;
}

function getCampaignDate(record: FeatureRecord) {
  return String(record.data.sentAt || record.createdAt);
}

function getPaymentHistory(
  subscriptions: FeatureRecord[]
): PayPalPaymentHistoryItem[] {
  return subscriptions.flatMap((subscription) => {
    const history = Array.isArray(subscription.data.paypalPaymentHistory)
      ? subscription.data.paypalPaymentHistory
      : [];
    const parsedHistory = history.flatMap((entry) => {
      if (
        typeof entry !== "object" ||
        entry === null ||
        Array.isArray(entry)
      ) {
        return [];
      }
      const id = typeof entry.id === "string" ? entry.id : "";
      const date = typeof entry.date === "string" ? entry.date : "";
      const amount =
        typeof entry.amount === "number"
          ? entry.amount
          : Number(entry.amount || 0);
      const currency =
        typeof entry.currency === "string" ? entry.currency : undefined;
      return id && date
        ? [{ id, date, amount, currency }]
        : [];
    });
    if (parsedHistory.length) return parsedHistory;

    const id =
      typeof subscription.data.lastPaymentId === "string"
        ? subscription.data.lastPaymentId
        : "";
    const date =
      typeof subscription.data.lastPaymentAt === "string"
        ? subscription.data.lastPaymentAt
        : "";
    const amount = Number(subscription.data.lastPaymentAmount || 0);
    const currency =
      typeof subscription.data.lastPaymentCurrency === "string"
        ? subscription.data.lastPaymentCurrency
        : undefined;
    return id && date ? [{ id, date, amount, currency }] : [];
  });
}

function buildPaymentBuckets(
  payments: PayPalPaymentHistoryItem[],
  startDate: string,
  endDate: string,
  interval: DashboardInterval
) {
  const buckets = createBuckets(startDate, endDate, interval);
  for (const payment of payments) {
    const date = payment.date.slice(0, 10);
    if (date >= startDate && date <= endDate) {
      addValueToBucket(buckets, date, Math.round(payment.amount * 100));
    }
  }
  return buckets;
}

function getMrrAt(
  subscriptions: FeatureRecord[],
  date: string
) {
  return subscriptions.reduce((total, subscription) => {
    if (subscription.createdAt.slice(0, 10) > date) return total;
    if (
      subscription.status !== "active" &&
      subscription.status !== "trialing"
    ) {
      return total;
    }
    const trialEndsAt = String(subscription.data.trialEndsAt || "");
    if (
      subscription.status === "trialing" ||
      (trialEndsAt && trialEndsAt.slice(0, 10) > date)
    ) {
      return total;
    }
    const amount = Number(subscription.data.amount || 0);
    const monthlyAmount =
      subscription.data.interval === "yearly" ? amount / 12 : amount;
    return total + Math.round(monthlyAmount * 100);
  }, 0);
}

function getChurnRateAt(
  subscriptions: FeatureRecord[],
  date: string
) {
  const eligible = subscriptions.filter(
    (subscription) => subscription.createdAt.slice(0, 10) <= date
  );
  if (!eligible.length) return 0;
  const churned = eligible.filter((subscription) =>
    ["cancelled", "expired"].includes(subscription.status)
  ).length;
  return (churned / eligible.length) * 100;
}

function getTrialConversionRateAt(
  subscriptions: FeatureRecord[],
  date: string
) {
  const eligible = subscriptions.filter((subscription) => {
    if (Number(subscription.data.trialDays || 0) <= 0) return false;
    const trialStartedAt = String(
      subscription.data.trialStartedAt ||
        subscription.data.approvedAt ||
        subscription.createdAt
    );
    return trialStartedAt.slice(0, 10) <= date;
  });
  if (!eligible.length) return 0;
  const converted = eligible.filter((subscription) => {
    const paymentHistory = Array.isArray(
      subscription.data.paypalPaymentHistory
    )
      ? subscription.data.paypalPaymentHistory
      : [];
    if (
      paymentHistory.some(
        (payment) =>
          typeof payment === "object" &&
          payment !== null &&
          "date" in payment &&
          typeof payment.date === "string" &&
          payment.date.slice(0, 10) <= date
      )
    ) {
      return true;
    }
    const lastPaymentAt = String(subscription.data.lastPaymentAt || "");
    return Boolean(lastPaymentAt && lastPaymentAt.slice(0, 10) <= date);
  }).length;
  return (converted / eligible.length) * 100;
}

function getSubscriberCountAt(
  subscribers: FeatureRecord[],
  date: string
) {
  return subscribers.filter(
    (subscriber) =>
      subscriber.createdAt.slice(0, 10) <= date &&
      subscriber.status !== "unsubscribed"
  ).length;
}

function sumBuckets(buckets: DashboardSeriesBucket[]) {
  return buckets.reduce((total, bucket) => total + bucket.value, 0);
}

function metric(
  key: string,
  label: string,
  format: DashboardMetricSeries["format"],
  currentBuckets: DashboardSeriesBucket[],
  previousBuckets: DashboardSeriesBucket[],
  value = sumBuckets(currentBuckets),
  previousValue = sumBuckets(previousBuckets)
): DashboardMetricSeries {
  return {
    key,
    label,
    format,
    value,
    previousValue,
    delta: pctChange(value, previousValue),
    data: toChartPoints(currentBuckets),
    comparisonData: previousBuckets.map((bucket, index) => ({
      label: currentBuckets[index]?.label || bucket.label,
      value: bucket.value,
      date: bucket.startDate,
    })),
  };
}

export function buildDashboardOverview(
  input: BuildDashboardOverviewInput
): DashboardOverviewData {
  const previous = getPreviousRange(input.startDate, input.endDate);
  const orders = filterOrders(input.orders, input.productId);
  const subscriptions =
    input.productId === "all"
      ? input.subscriptions
      : input.subscriptions.filter(
          (subscription) => subscription.data.productId === input.productId
        );
  const marketplaceOrderData = orders.filter(
    (order) => order.transactionFeeAmount > 0
  );
  const currentRevenue = buildOrderBuckets(
    orders,
    input.startDate,
    input.endDate,
    input.interval,
    "revenue"
  );
  const previousRevenue = buildOrderBuckets(
    orders,
    previous.startDate,
    previous.endDate,
    input.interval,
    "revenue"
  );
  const currentMarketplaceRevenue = buildOrderValueBuckets(
    marketplaceOrderData,
    input.startDate,
    input.endDate,
    input.interval,
    (order) => (order.status === "paid" ? order.amount : 0)
  );
  const previousMarketplaceRevenue = buildOrderValueBuckets(
    marketplaceOrderData,
    previous.startDate,
    previous.endDate,
    input.interval,
    (order) => (order.status === "paid" ? order.amount : 0)
  );
  const currentRefunds = buildOrderBuckets(
    orders,
    input.startDate,
    input.endDate,
    input.interval,
    "refunds"
  );
  const previousRefunds = buildOrderBuckets(
    orders,
    previous.startDate,
    previous.endDate,
    input.interval,
    "refunds"
  );
  const currentNet = buildOrderBuckets(
    orders,
    input.startDate,
    input.endDate,
    input.interval,
    "net"
  );
  const previousNet = buildOrderBuckets(
    orders,
    previous.startDate,
    previous.endDate,
    input.interval,
    "net"
  );
  const currentOrderCount = buildOrderValueBuckets(
    orders,
    input.startDate,
    input.endDate,
    input.interval,
    (order) => (order.status === "paid" ? 1 : 0)
  );
  const previousOrderCount = buildOrderValueBuckets(
    orders,
    previous.startDate,
    previous.endDate,
    input.interval,
    (order) => (order.status === "paid" ? 1 : 0)
  );
  const currentMarketplaceOrderCount = buildOrderValueBuckets(
    marketplaceOrderData,
    input.startDate,
    input.endDate,
    input.interval,
    (order) => (order.status === "paid" ? 1 : 0)
  );
  const previousMarketplaceOrderCount = buildOrderValueBuckets(
    marketplaceOrderData,
    previous.startDate,
    previous.endDate,
    input.interval,
    (order) => (order.status === "paid" ? 1 : 0)
  );
  const currentAverageOrder = buildAverageBuckets(
    currentRevenue,
    currentOrderCount
  );
  const previousAverageOrder = buildAverageBuckets(
    previousRevenue,
    previousOrderCount
  );
  const currentAbandonedCartRevenue = buildOrderValueBuckets(
    orders,
    input.startDate,
    input.endDate,
    input.interval,
    (order) =>
      order.status === "pending" || order.status === "failed"
        ? order.amount
        : 0
  );
  const previousAbandonedCartRevenue = buildOrderValueBuckets(
    orders,
    previous.startDate,
    previous.endDate,
    input.interval,
    (order) =>
      order.status === "pending" || order.status === "failed"
        ? order.amount
        : 0
  );
  const currentReturnCustomerRate = buildReturningCustomerBuckets(
    orders,
    input.startDate,
    input.endDate,
    input.interval
  );
  const previousReturnCustomerRate = buildReturningCustomerBuckets(
    orders,
    previous.startDate,
    previous.endDate,
    input.interval
  );
  const payments = getPaymentHistory(subscriptions);
  const currentRenewals = buildPaymentBuckets(
    payments,
    input.startDate,
    input.endDate,
    input.interval
  );
  const previousRenewals = buildPaymentBuckets(
    payments,
    previous.startDate,
    previous.endDate,
    input.interval
  );
  const currentTemplate = createBuckets(
    input.startDate,
    input.endDate,
    input.interval
  );
  const previousTemplate = createBuckets(
    previous.startDate,
    previous.endDate,
    input.interval
  );
  const currentNewSubscriptions = buildFeatureBuckets(
    subscriptions,
    input.startDate,
    input.endDate,
    input.interval,
    () => 1
  );
  const previousNewSubscriptions = buildFeatureBuckets(
    subscriptions,
    previous.startDate,
    previous.endDate,
    input.interval,
    () => 1
  );
  const mrr = getMrrAt(subscriptions, input.endDate);
  const previousMrr = getMrrAt(subscriptions, previous.endDate);
  const churn = getChurnRateAt(subscriptions, input.endDate);
  const previousChurn = getChurnRateAt(
    subscriptions,
    previous.endDate
  );
  const trialConversion = getTrialConversionRateAt(
    subscriptions,
    input.endDate
  );
  const previousTrialConversion = getTrialConversionRateAt(
    subscriptions,
    previous.endDate
  );
  const subscriberCount = getSubscriberCountAt(
    input.subscribers,
    input.endDate
  );
  const previousSubscriberCount = getSubscriberCountAt(
    input.subscribers,
    previous.endDate
  );
  const mrrSeries = currentTemplate.map((bucket) => ({
    ...bucket,
    value: getMrrAt(subscriptions, bucket.endDate),
  }));
  const previousMrrSeries = previousTemplate.map((bucket) => ({
    ...bucket,
    value: getMrrAt(subscriptions, bucket.endDate),
  }));
  const arrSeries = mrrSeries.map((bucket) => ({
    ...bucket,
    value: bucket.value * 12,
  }));
  const previousArrSeries = previousMrrSeries.map((bucket) => ({
    ...bucket,
    value: bucket.value * 12,
  }));
  const churnSeries = currentTemplate.map((bucket) => ({
    ...bucket,
    value: getChurnRateAt(subscriptions, bucket.endDate),
  }));
  const previousChurnSeries = previousTemplate.map((bucket) => ({
    ...bucket,
    value: getChurnRateAt(subscriptions, bucket.endDate),
  }));
  const trialConversionSeries = currentTemplate.map((bucket) => ({
    ...bucket,
    value: getTrialConversionRateAt(subscriptions, bucket.endDate),
  }));
  const previousTrialConversionSeries = previousTemplate.map((bucket) => ({
    ...bucket,
    value: getTrialConversionRateAt(subscriptions, bucket.endDate),
  }));
  const subscriberSeries = currentTemplate.map((bucket) => ({
    ...bucket,
    value: getSubscriberCountAt(input.subscribers, bucket.endDate),
  }));
  const previousSubscriberSeries = previousTemplate.map((bucket) => ({
    ...bucket,
    value: getSubscriberCountAt(input.subscribers, bucket.endDate),
  }));

  const currentAffiliateRevenue = buildOrderValueBuckets(
    orders,
    input.startDate,
    input.endDate,
    input.interval,
    (order) =>
      order.status === "paid" && order.affiliateId ? order.amount : 0
  );
  const previousAffiliateRevenue = buildOrderValueBuckets(
    orders,
    previous.startDate,
    previous.endDate,
    input.interval,
    (order) =>
      order.status === "paid" && order.affiliateId ? order.amount : 0
  );
  const currentAffiliateClicks = buildFeatureBuckets(
    input.affiliateClicks,
    input.startDate,
    input.endDate,
    input.interval,
    () => 1,
    (record) => String(record.data.clickedAt || record.createdAt)
  );
  const previousAffiliateClicks = buildFeatureBuckets(
    input.affiliateClicks,
    previous.startDate,
    previous.endDate,
    input.interval,
    () => 1,
    (record) => String(record.data.clickedAt || record.createdAt)
  );
  const currentAffiliateReferrals = buildFeatureBuckets(
    input.affiliateReferrals,
    input.startDate,
    input.endDate,
    input.interval,
    (record) => (record.status === "rejected" ? 0 : 1)
  );
  const previousAffiliateReferrals = buildFeatureBuckets(
    input.affiliateReferrals,
    previous.startDate,
    previous.endDate,
    input.interval,
    (record) => (record.status === "rejected" ? 0 : 1)
  );
  const currentAffiliateConversion = buildRateBuckets(
    currentAffiliateReferrals,
    currentAffiliateClicks
  );
  const previousAffiliateConversion = buildRateBuckets(
    previousAffiliateReferrals,
    previousAffiliateClicks
  );
  const currentAffiliatePayouts = buildFeatureBuckets(
    input.affiliatePayouts,
    input.startDate,
    input.endDate,
    input.interval,
    (record) =>
      ["failed", "rejected"].includes(record.status)
        ? 0
        : Math.round(Number(record.data.amount || 0) * 100),
    (record) => String(record.data.paidAt || record.createdAt)
  );
  const previousAffiliatePayouts = buildFeatureBuckets(
    input.affiliatePayouts,
    previous.startDate,
    previous.endDate,
    input.interval,
    (record) =>
      ["failed", "rejected"].includes(record.status)
        ? 0
        : Math.round(Number(record.data.amount || 0) * 100),
    (record) => String(record.data.paidAt || record.createdAt)
  );

  const currentEmailSends = buildFeatureBuckets(
    input.campaigns,
    input.startDate,
    input.endDate,
    input.interval,
    (record) => Number(record.data.recipientCount || 0),
    getCampaignDate
  );
  const previousEmailSends = buildFeatureBuckets(
    input.campaigns,
    previous.startDate,
    previous.endDate,
    input.interval,
    (record) => Number(record.data.recipientCount || 0),
    getCampaignDate
  );
  const currentEmailOpens = buildFeatureBuckets(
    input.campaigns,
    input.startDate,
    input.endDate,
    input.interval,
    (record) => Number(record.data.openCount || record.data.opens || 0),
    getCampaignDate
  );
  const previousEmailOpens = buildFeatureBuckets(
    input.campaigns,
    previous.startDate,
    previous.endDate,
    input.interval,
    (record) => Number(record.data.openCount || record.data.opens || 0),
    getCampaignDate
  );
  const currentEmailClicks = buildFeatureBuckets(
    input.campaigns,
    input.startDate,
    input.endDate,
    input.interval,
    (record) => Number(record.data.clickCount || record.data.clicks || 0),
    getCampaignDate
  );
  const previousEmailClicks = buildFeatureBuckets(
    input.campaigns,
    previous.startDate,
    previous.endDate,
    input.interval,
    (record) => Number(record.data.clickCount || record.data.clicks || 0),
    getCampaignDate
  );
  const currentEmailOpenRate = buildRateBuckets(
    currentEmailOpens,
    currentEmailSends
  );
  const previousEmailOpenRate = buildRateBuckets(
    previousEmailOpens,
    previousEmailSends
  );
  const currentEmailClickRate = buildRateBuckets(
    currentEmailClicks,
    currentEmailSends
  );
  const previousEmailClickRate = buildRateBuckets(
    previousEmailClicks,
    previousEmailSends
  );

  const allRevenue = metric(
    "all-revenue",
    "All revenue",
    "money",
    currentRevenue,
    previousRevenue
  );
  const currency =
    orders.find((order) => order.status === "paid")?.currency ||
    input.orders[0]?.currency ||
    "USD";

  const marketplaceRevenue = metric(
    "marketplace-revenue",
    "Marketplace revenue",
    "money",
    currentMarketplaceRevenue,
    previousMarketplaceRevenue
  );
  const netRevenue = metric(
    "net-revenue",
    "Net revenue",
    "money",
    currentNet,
    previousNet
  );
  const newOrders = metric(
    "new-orders",
    "New orders",
    "number",
    currentOrderCount,
    previousOrderCount
  );
  const marketplaceOrders = metric(
    "marketplace-orders",
    "Marketplace orders",
    "number",
    currentMarketplaceOrderCount,
    previousMarketplaceOrderCount
  );
  const newOrderRevenue = metric(
    "new-order-revenue",
    "New order revenue",
    "money",
    currentRevenue,
    previousRevenue
  );
  const currentOrderCountValue = sumBuckets(currentOrderCount);
  const previousOrderCountValue = sumBuckets(previousOrderCount);
  const avgOrderRevenue = metric(
    "avg-order-revenue",
    "Avg. order revenue",
    "money",
    currentAverageOrder,
    previousAverageOrder,
    currentOrderCountValue
      ? Math.round(sumBuckets(currentRevenue) / currentOrderCountValue)
      : 0,
    previousOrderCountValue
      ? Math.round(sumBuckets(previousRevenue) / previousOrderCountValue)
      : 0
  );
  const abandonedCartRevenue = metric(
    "abandoned-cart-revenue",
    "Abandoned cart revenue",
    "money",
    currentAbandonedCartRevenue,
    previousAbandonedCartRevenue
  );
  const returnCustomerRate = metric(
    "return-customer-rate",
    "Return customer rate",
    "percent",
    currentReturnCustomerRate,
    previousReturnCustomerRate,
    getReturningCustomerRate(orders, input.startDate, input.endDate),
    getReturningCustomerRate(
      orders,
      previous.startDate,
      previous.endDate
    )
  );
  const refunds = metric(
    "refunds",
    "Refunds",
    "money",
    currentRefunds,
    previousRefunds
  );
  const newSubscriptions = metric(
    "new-subscriptions",
    "New subscriptions",
    "number",
    currentNewSubscriptions,
    previousNewSubscriptions
  );
  const subscriptionRenewals = metric(
    "subscription-renewals",
    "Subscription renewals revenue",
    "money",
    currentRenewals,
    previousRenewals
  );
  const cumulativeMrr = metric(
    "cumulative-mrr",
    "Cumulative MRR",
    "money",
    mrrSeries,
    previousMrrSeries,
    mrr,
    previousMrr
  );
  const monthlyRecurringRevenue = metric(
    "monthly-recurring-revenue",
    "Monthly recurring revenue",
    "money",
    mrrSeries,
    previousMrrSeries,
    mrr,
    previousMrr
  );
  const cumulativeArr = metric(
    "cumulative-arr",
    "Cumulative ARR",
    "money",
    arrSeries,
    previousArrSeries,
    mrr * 12,
    previousMrr * 12
  );
  const annualRecurringRevenue = metric(
    "annual-recurring-revenue",
    "Annual recurring revenue",
    "money",
    arrSeries,
    previousArrSeries,
    mrr * 12,
    previousMrr * 12
  );
  const subscriptionChurn = metric(
    "subscription-churn",
    "Subscription churn rate",
    "percent",
    churnSeries,
    previousChurnSeries,
    churn,
    previousChurn
  );
  const trialConversionRate = metric(
    "trial-conversion-rate",
    "Trial conversion rate",
    "percent",
    trialConversionSeries,
    previousTrialConversionSeries,
    trialConversion,
    previousTrialConversion
  );
  const affiliateRevenue = metric(
    "affiliate-revenue",
    "Affiliate revenue",
    "money",
    currentAffiliateRevenue,
    previousAffiliateRevenue
  );
  const affiliateClicks = metric(
    "affiliate-clicks",
    "Affiliate clicks",
    "number",
    currentAffiliateClicks,
    previousAffiliateClicks
  );
  const affiliateReferrals = metric(
    "affiliate-referrals",
    "Affiliate referrals",
    "number",
    currentAffiliateReferrals,
    previousAffiliateReferrals
  );
  const affiliateConversionRate = metric(
    "affiliate-conversion-rate",
    "Affiliate conversion rate",
    "percent",
    currentAffiliateConversion,
    previousAffiliateConversion,
    sumBuckets(currentAffiliateClicks)
      ? (sumBuckets(currentAffiliateReferrals) /
          sumBuckets(currentAffiliateClicks)) *
        100
      : 0,
    sumBuckets(previousAffiliateClicks)
      ? (sumBuckets(previousAffiliateReferrals) /
          sumBuckets(previousAffiliateClicks)) *
        100
      : 0
  );
  const affiliatePayouts = metric(
    "affiliate-payouts",
    "Affiliate payouts",
    "money",
    currentAffiliatePayouts,
    previousAffiliatePayouts
  );
  const emailSubscribers = metric(
    "email-subscribers",
    "Email subscribers",
    "number",
    subscriberSeries,
    previousSubscriberSeries,
    subscriberCount,
    previousSubscriberCount
  );
  const emailSends = metric(
    "email-sends",
    "Email sends",
    "number",
    currentEmailSends,
    previousEmailSends
  );
  const emailOpenRate = metric(
    "email-open-rate",
    "Email open rate",
    "percent",
    currentEmailOpenRate,
    previousEmailOpenRate,
    sumBuckets(currentEmailSends)
      ? (sumBuckets(currentEmailOpens) / sumBuckets(currentEmailSends)) * 100
      : 0,
    sumBuckets(previousEmailSends)
      ? (sumBuckets(previousEmailOpens) / sumBuckets(previousEmailSends)) * 100
      : 0
  );
  const emailClickRate = metric(
    "email-click-rate",
    "Email click rate",
    "percent",
    currentEmailClickRate,
    previousEmailClickRate,
    sumBuckets(currentEmailSends)
      ? (sumBuckets(currentEmailClicks) / sumBuckets(currentEmailSends)) * 100
      : 0,
    sumBuckets(previousEmailSends)
      ? (sumBuckets(previousEmailClicks) / sumBuckets(previousEmailSends)) * 100
      : 0
  );

  return {
    currency,
    primary: allRevenue,
    metricGroups: [
      {
        key: "revenue",
        label: "Revenue",
        defaultMetricKey: "all-revenue",
        metrics: [allRevenue, marketplaceRevenue, netRevenue],
      },
      {
        key: "orders",
        label: "Orders",
        defaultMetricKey: "new-orders",
        metrics: [
          newOrders,
          marketplaceOrders,
          newOrderRevenue,
          avgOrderRevenue,
          abandonedCartRevenue,
          returnCustomerRate,
          refunds,
        ],
      },
      {
        key: "subscriptions",
        label: "Subscriptions",
        defaultMetricKey: "cumulative-mrr",
        metrics: [
          newSubscriptions,
          subscriptionRenewals,
          cumulativeMrr,
          monthlyRecurringRevenue,
          cumulativeArr,
          annualRecurringRevenue,
          subscriptionChurn,
          trialConversionRate,
        ],
      },
      {
        key: "affiliates",
        label: "Affiliates",
        defaultMetricKey: "affiliate-revenue",
        metrics: [
          affiliateRevenue,
          affiliateClicks,
          affiliateReferrals,
          affiliateConversionRate,
          affiliatePayouts,
        ],
      },
      {
        key: "email",
        label: "Email",
        defaultMetricKey: "email-subscribers",
        metrics: [
          emailSubscribers,
          emailSends,
          emailOpenRate,
          emailClickRate,
        ],
      },
    ],
  };
}
