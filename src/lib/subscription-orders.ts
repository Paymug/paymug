import "server-only";

import {
  createOrder,
  findOrderById,
  findOrderByPaypalCaptureId,
  findProductById,
  updateOrder,
} from "./db";
import { completeCommerceFeatures } from "./commerce-features";
import { isPerpetualLicenseProduct } from "./license-entitlements";
import { uid } from "./utils";
import type { FeatureRecord } from "./feature-records.types";
import type { Order, Product } from "./types";
import type {
  ActivateSubscriptionTrialOrderInput,
  CreatePendingSubscriptionOrderInput,
  RecordSubscriptionPaymentOrderInput,
} from "./subscription-orders.types";

export async function createPendingSubscriptionOrder(
  input: CreatePendingSubscriptionOrderInput
): Promise<Order> {
  const existing = await findOrderById(input.orderId);
  if (existing) return existing;

  const order: Order = {
    id: input.orderId,
    userId: input.product.userId,
    storeId: input.product.storeId,
    productId: input.product.id,
    productName: input.product.name,
    productDescription: input.product.description,
    productPrice: input.product.price,
    deliveryContent: input.product.deliveryContent,
    productFiles: input.product.productFiles,
    githubRepoOwner: input.product.githubRepoOwner,
    githubRepoName: input.product.githubRepoName,
    amount: input.amount,
    currency: input.product.currency,
    status: "pending",
    customerEmail: input.customerEmail,
    customerName: input.customerName,
    discountCode: input.discountCode,
    discountAmount: input.discountAmount,
    transactionFeeAmount: input.transactionFeeAmount,
    affiliateId: input.affiliateId,
    environment: input.environment,
    paypalOrderId: input.paypalSubscriptionId,
    gateway: "paypal",
    createdAt: new Date().toISOString(),
    githubUsername: input.githubUsername,
    githubAccessStatus:
      input.product.githubRepoOwner && input.product.githubRepoName
        ? "pending"
        : "not_required",
    githubAccessManaged: false,
  };
  try {
    return await createOrder(order);
  } catch (error) {
    const concurrentlyCreated = await findOrderById(input.orderId);
    if (concurrentlyCreated) return concurrentlyCreated;
    throw error;
  }
}

export async function ensurePendingSubscriptionOrder(
  subscription: FeatureRecord
): Promise<Order | undefined> {
  const orderId = getSubscriptionOrderId(subscription);
  if (!orderId) return undefined;

  const existing = await findOrderById(orderId);
  if (existing) return existing;
  const productId =
    typeof subscription.data.productId === "string"
      ? subscription.data.productId
      : undefined;
  const paypalSubscriptionId =
    typeof subscription.data.paypalSubscriptionId === "string"
      ? subscription.data.paypalSubscriptionId
      : undefined;
  if (!productId || !paypalSubscriptionId || !subscription.subtitle) {
    return undefined;
  }
  const product = await findProductById(productId);
  if (!product) return undefined;

  return createPendingSubscriptionOrder({
    orderId,
    product,
    amount: Math.max(
      0,
      Math.round(Number(subscription.data.amount || 0) * 100)
    ),
    customerEmail: subscription.subtitle,
    customerName:
      typeof subscription.data.customerName === "string"
        ? subscription.data.customerName
        : undefined,
    discountCode:
      typeof subscription.data.discountCode === "string"
        ? subscription.data.discountCode
        : undefined,
    discountAmount: Number(subscription.data.discountAmount || 0),
    transactionFeeAmount: Number(
      subscription.data.transactionFeeAmount || 0
    ),
    affiliateId:
      typeof subscription.data.affiliateId === "string"
        ? subscription.data.affiliateId
        : undefined,
    environment: subscription.environment,
    paypalSubscriptionId,
    githubUsername:
      typeof subscription.data.githubUsername === "string"
        ? subscription.data.githubUsername
        : undefined,
  });
}

function getSubscriptionOrderId(
  subscription: FeatureRecord
): string | undefined {
  return typeof subscription.data.orderId === "string"
    ? subscription.data.orderId
    : undefined;
}

function getSubscriptionProductId(
  input: RecordSubscriptionPaymentOrderInput
): string | undefined {
  return typeof input.subscription.data.productId === "string"
    ? input.subscription.data.productId
    : undefined;
}

function getSubscriptionPaymentAmount(
  input: RecordSubscriptionPaymentOrderInput
): number {
  const paymentAmount = Math.round(input.amount * 100);
  if (paymentAmount > 0) return paymentAmount;
  return Math.max(
    0,
    Math.round(Number(input.subscription.data.amount || 0) * 100)
  );
}

function createPaidSubscriptionOrder(
  input: RecordSubscriptionPaymentOrderInput,
  product: Product,
  orderId: string
): Order {
  const data = input.subscription.data;
  const currency =
    input.currency ||
    (typeof data.currency === "string" ? data.currency : product.currency);
  const discountPeriods = Math.max(0, Number(data.discountPeriods || 0));
  const paymentNumber =
    input.paymentNumber || Number(data.paymentsReceived || 0) + 1;
  const discountApplies =
    Boolean(data.discountCode) &&
    (discountPeriods === 0 || paymentNumber <= discountPeriods);

  return {
    id: orderId,
    userId: input.subscription.userId,
    storeId:
      typeof data.storeId === "string" ? data.storeId : product.storeId,
    productId: product.id,
    productName: product.name,
    productDescription: product.description,
    productPrice: product.price,
    deliveryContent: product.deliveryContent,
    productFiles: product.productFiles,
    githubRepoOwner: product.githubRepoOwner,
    githubRepoName: product.githubRepoName,
    amount: getSubscriptionPaymentAmount(input),
    currency,
    status: "paid",
    customerEmail: input.subscription.subtitle || "",
    customerName:
      typeof data.customerName === "string" ? data.customerName : undefined,
    discountCode:
      typeof data.discountCode === "string" ? data.discountCode : undefined,
    discountAmount: discountApplies ? Number(data.discountAmount || 0) : 0,
    transactionFeeAmount: discountApplies
      ? Number(data.transactionFeeAmount || 0)
      : Number(
          data.regularTransactionFeeAmount || data.transactionFeeAmount || 0
        ),
    affiliateId:
      typeof data.affiliateId === "string" ? data.affiliateId : undefined,
    environment: input.subscription.environment,
    paypalOrderId:
      typeof data.paypalSubscriptionId === "string"
        ? data.paypalSubscriptionId
        : undefined,
    paypalCaptureId: input.paymentId,
    gateway: "paypal",
    createdAt: input.paidAt,
    paidAt: input.paidAt,
    githubUsername:
      typeof data.githubUsername === "string" ? data.githubUsername : undefined,
    githubAccessStatus:
      product.githubRepoOwner && product.githubRepoName
        ? "pending"
        : "not_required",
    githubAccessManaged: false,
  };
}

async function fulfillSubscriptionPaymentOrder(
  order: Order,
  input: RecordSubscriptionPaymentOrderInput,
  product?: Product
): Promise<Order> {
  const resolvedProduct = product || (await findProductById(order.productId));
  const renewsPerpetualUpdates = Boolean(
    input.isRenewal &&
      resolvedProduct &&
      isPerpetualLicenseProduct(resolvedProduct)
  );
  await completeCommerceFeatures(order, resolvedProduct, {
    provisionBenefits: input.provisionBenefits || renewsPerpetualUpdates,
    recordDiscount: !input.isRenewal,
  });
  return order;
}

export async function activateSubscriptionTrialOrder(
  input: ActivateSubscriptionTrialOrderInput
): Promise<Order | undefined> {
  const orderId =
    typeof input.subscription.data.orderId === "string"
      ? input.subscription.data.orderId
      : undefined;
  if (!orderId) return undefined;

  const initialOrder = await findOrderById(orderId);
  if (!initialOrder) return undefined;
  const order =
    initialOrder.status === "pending"
      ? await updateOrder(initialOrder.id, {
          status: "paid",
          amount: 0,
          paidAt: input.activatedAt,
        })
      : initialOrder;
  if (!order) return undefined;

  const product = await findProductById(order.productId);
  await completeCommerceFeatures(order, product, {
    recordDiscount: false,
    recordAffiliate: false,
  });
  return order;
}

export async function recordSubscriptionPaymentOrder(
  input: RecordSubscriptionPaymentOrderInput
): Promise<Order | undefined> {
  const environment = input.subscription.environment;
  const existingPayment = await findOrderByPaypalCaptureId(
    input.paymentId,
    environment
  );
  if (existingPayment) {
    return fulfillSubscriptionPaymentOrder(existingPayment, input);
  }

  const initialOrderId = getSubscriptionOrderId(input.subscription);
  const initialOrder = initialOrderId
    ? await findOrderById(initialOrderId)
    : undefined;
  const amount = getSubscriptionPaymentAmount(input);
  const currency =
    input.currency ||
    (typeof input.subscription.data.currency === "string"
      ? input.subscription.data.currency
      : initialOrder?.currency);

  if (!input.isRenewal && initialOrder?.status === "pending") {
    const order = await updateOrder(initialOrder.id, {
      status: "paid",
      amount,
      ...(currency ? { currency } : {}),
      paypalCaptureId: input.paymentId,
      paidAt: input.paidAt,
    });
    return order
      ? fulfillSubscriptionPaymentOrder(order, input)
      : undefined;
  }

  const productId = getSubscriptionProductId(input);
  if (!productId) return undefined;
  const product = await findProductById(productId);
  if (!product) return undefined;

  const order = createPaidSubscriptionOrder(
    input,
    product,
    !initialOrder && initialOrderId ? initialOrderId : uid()
  );
  let created: Order;
  try {
    created = await createOrder(order);
  } catch (error) {
    const concurrentlyCreated = await findOrderByPaypalCaptureId(
      input.paymentId,
      environment
    );
    if (!concurrentlyCreated) throw error;
    created = concurrentlyCreated;
  }
  return fulfillSubscriptionPaymentOrder(created, input, product);
}
