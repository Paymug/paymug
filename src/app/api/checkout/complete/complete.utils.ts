import "server-only";

import { cookies } from "next/headers";
import { affiliateCookieMatchesStore } from "@/lib/affiliate-settings.utils";
import {
  completeCommerceFeatures,
  findAffiliateByCode,
  getOrderLicense,
  resolveDiscount,
  subscribeCheckoutCustomer,
} from "@/lib/commerce-features";
import {
  createOrder,
  findProductById,
  findUserById,
} from "@/lib/db";
import { createFeatureRecord } from "@/lib/feature-records";
import { notifyPaymentReceived } from "@/lib/notification-events";
import { calculateCheckoutPricing } from "@/lib/product-pricing";
import { sendStoreOrderPaymentEmail } from "@/lib/store-notification-emails";
import { sendPurchaseConfirmationEmail } from "@/lib/transactional-emails";
import { uid } from "@/lib/utils";
import type {
  CompleteFreePurchaseInput,
  CompleteFreePurchaseResponse,
} from "./route.types";

export async function completeFreePurchase(
  input: CompleteFreePurchaseInput,
  requestUrl: string
): Promise<CompleteFreePurchaseResponse> {
  const product = await findProductById(input.productId);
  if (!product || product.status !== "published") {
    throw new Error("Product not available");
  }
  const seller = await findUserById(product.userId);
  if (!seller) throw new Error("Product owner not found");

  const discount = await resolveDiscount(
    product.userId,
    input.discountCode,
    product.price,
    product.id,
    product.storeId,
    product.environment
  );
  const cookieJar = await cookies();
  const affiliateCookie = cookieJar.get("paymug_affiliate")?.value.split(":");
  const cookieAffiliateCode = affiliateCookieMatchesStore(
    affiliateCookie?.[0],
    product.userId,
    product.storeId
  )
    ? affiliateCookie?.[1]
    : undefined;
  const affiliate = await findAffiliateByCode(
    product.userId,
    input.affiliateCode || cookieAffiliateCode,
    product.storeId,
    product.environment
  );
  const pricing = calculateCheckoutPricing(product, discount?.amount);
  if (pricing.total > 0) {
    throw new Error("This purchase requires payment");
  }
  if (
    product.billingType === "subscription" &&
    discount?.subscriptionPeriods
  ) {
    throw new Error(
      "A limited-period free subscription requires a payment method for later billing periods"
    );
  }

  if (input.marketingOptIn) {
    await subscribeCheckoutCustomer(
      product.userId,
      input.customerEmail,
      input.customerName,
      product.environment
    );
  }

  const paidAt = new Date().toISOString();
  const order = await createOrder({
    id: uid(),
    userId: product.userId,
    storeId: product.storeId,
    productId: product.id,
    productName: product.name,
    productDescription: product.description,
    productPrice: product.price,
    deliveryContent: product.deliveryContent,
    productFiles: product.productFiles,
    githubRepoOwner: product.githubRepoOwner,
    githubRepoName: product.githubRepoName,
    amount: 0,
    currency: product.currency,
    status: "paid",
    customerEmail: input.customerEmail,
    customerName: input.customerName,
    discountCode: discount?.code,
    discountAmount: pricing.discountAmount,
    transactionFeeAmount: pricing.transactionFeeAmount,
    affiliateId: affiliate?.id,
    environment: product.environment,
    gateway: "free",
    createdAt: paidAt,
    paidAt,
    githubAccessStatus:
      product.githubRepoOwner && product.githubRepoName
        ? "pending"
        : "not_required",
    githubAccessManaged: false,
  });

  if (product.billingType === "subscription") {
    await createFeatureRecord(product.userId, "subscriptions", {
      environment: product.environment,
      title: product.name,
      subtitle: input.customerEmail,
      status: "active",
      data: {
        storeId: product.storeId,
        productId: product.id,
        amount: 0,
        currency: product.currency,
        interval: product.intervalUnit || "month",
        intervalUnit: product.intervalUnit || "month",
        intervalCount: Math.max(1, product.intervalCount || 1),
        trialDays: 0,
        discountCode: discount?.code || null,
        discountAmount: pricing.discountAmount,
        discountPeriods: null,
        customerName: input.customerName || null,
        githubUsername: null,
        environment: product.environment,
        source: "free_product_checkout",
        orderId: order.id,
        benefitsProvisionedAt: paidAt,
        activatedAt: paidAt,
      },
    });
  }

  await completeCommerceFeatures(order, product);
  const license = await getOrderLicense(order.userId, order.id);
  await notifyPaymentReceived(order);
  await sendStoreOrderPaymentEmail({ order });
  await sendPurchaseConfirmationEmail({
    order,
    deliveryContent: product.deliveryContent,
    licenseKey: license?.title,
    license,
    requestUrl,
  });

  return {
    order: {
      id: order.id,
      status: order.status,
      productName: order.productName,
      amount: order.amount,
      currency: order.currency,
      customerEmail: order.customerEmail,
      deliveryContent: product.deliveryContent,
      paidAt: order.paidAt,
    },
  };
}
