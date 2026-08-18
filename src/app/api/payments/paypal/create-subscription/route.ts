import { cookies } from "next/headers";
import { z } from "zod";
import {
  findAffiliateByCode,
  resolveDiscount,
  subscribeCheckoutCustomer,
} from "@/lib/commerce-features";
import {
  createFeatureRecord,
  deleteFeatureRecord,
  updateFeatureRecord,
} from "@/lib/feature-records";
import { findProductById } from "@/lib/db";
import { getPayPalCredentials } from "@/lib/payment-credentials";
import {
  formatProductIntervalLabel,
  getProductBillingCadence,
  isSubscriptionProduct,
} from "@/lib/product-billing";
import { calculateCheckoutPricing } from "@/lib/product-pricing";
import { provisionPayPalSubscription } from "@/lib/paypal-subscriptions";
import { createPendingSubscriptionOrder } from "@/lib/subscription-orders";
import { getStoreById } from "@/lib/stores";
import { affiliateCookieMatchesStore } from "@/lib/affiliate-settings.utils";
import { jsonError, uid } from "@/lib/utils";

const schema = z.object({
  productId: z.string().min(1),
  customerEmail: z.string().email(),
  customerName: z.string().max(120).optional(),
  discountCode: z.string().max(60).optional(),
  affiliateCode: z.string().max(80).optional(),
  marketingOptIn: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message || "Invalid input");
    }

    const product = await findProductById(parsed.data.productId);
    if (!product || product.status !== "published") {
      return jsonError("Product not available", 404);
    }
    if (!isSubscriptionProduct(product)) {
      return jsonError("This product is not a subscription", 400);
    }
    const cadence = getProductBillingCadence(product);
    if (!cadence) {
      return jsonError("Subscription billing interval is not configured", 400);
    }

    const store = await getStoreById(product.storeId, product.userId);
    if (store?.paymentGateway !== "paypal") {
      return jsonError("PayPal is not enabled for this store", 409);
    }

    const conn = await getPayPalCredentials(
      product.userId,
      product.environment,
      product.storeId
    );
    if (!conn) {
      return jsonError("Seller has not configured PayPal yet", 400);
    }

    const discount = await resolveDiscount(
      product.userId,
      parsed.data.discountCode,
      product.price,
      product.id,
      product.storeId,
      product.environment
    );
    const pricing = calculateCheckoutPricing(product, discount?.amount);
    const fullPricing = calculateCheckoutPricing(product);
    const discountPeriods = discount?.subscriptionPeriods;
    const recurringTotal = discountPeriods ? fullPricing.total : pricing.total;
    if (discountPeriods && pricing.total <= 0) {
      return jsonError(
        "A limited-period subscription discount must leave a payable amount",
        400
      );
    }
    if (recurringTotal <= 0) {
      return jsonError("Subscription price must be greater than zero", 400);
    }

    const cookieJar = await cookies();
    const affiliateCookie = cookieJar.get("paymug_affiliate")?.value.split(":");
    const cookieAffiliateCode =
      affiliateCookieMatchesStore(
        affiliateCookie?.[0],
        product.userId,
        product.storeId
      )
        ? affiliateCookie?.[1]
        : undefined;
    const affiliate = await findAffiliateByCode(
      product.userId,
      parsed.data.affiliateCode || cookieAffiliateCode,
      product.storeId,
      product.environment
    );

    if (parsed.data.marketingOptIn) {
      await subscribeCheckoutCustomer(
        product.userId,
        parsed.data.customerEmail,
        parsed.data.customerName,
        product.environment
      );
    }

    const amountMajor = recurringTotal / 100;
    const introductoryAmountMajor = discountPeriods
      ? pricing.total / 100
      : undefined;
    const intervalLabel = formatProductIntervalLabel(
      cadence.unit,
      cadence.count
    );
    const orderId = uid();

    let record = await createFeatureRecord(product.userId, "subscriptions", {
      title: product.name,
      subtitle: parsed.data.customerEmail,
      status: "approval_pending",
      data: {
        storeId: product.storeId,
        productId: product.id,
        amount: amountMajor,
        introductoryAmount: introductoryAmountMajor ?? null,
        discountPeriods: discountPeriods ?? null,
        currency: product.currency,
        interval: cadence.unit,
        intervalUnit: cadence.unit,
        intervalCount: cadence.count,
        trialDays: product.trialDays,
        discountCode: discount?.code || null,
        discountAmount: pricing.discountAmount,
        transactionFeeAmount: pricing.transactionFeeAmount,
        regularTransactionFeeAmount: fullPricing.transactionFeeAmount,
        affiliateId: affiliate?.id || null,
        githubUsername: null,
        customerName: parsed.data.customerName || null,
        environment: conn.mode,
        source: "product_checkout",
        orderId,
      },
    });

    try {
      const provisioned = await provisionPayPalSubscription({
        userId: product.userId,
        storeId: product.storeId,
        mode: conn.mode,
        recordId: record.id,
        planName: `${product.name} (${intervalLabel})`,
        customerEmail: parsed.data.customerEmail,
        amount: amountMajor,
        introductoryAmount: introductoryAmountMajor,
        introductoryPeriodCount: discountPeriods,
        currency: product.currency,
        intervalUnit: cadence.unit,
        intervalCount: cadence.count,
        trialDays: product.trialDays,
        requestUrl: req.url,
      });
      record =
        (await updateFeatureRecord(record.id, product.userId, {
          status: "approval_pending",
          data: {
            ...record.data,
            ...provisioned,
            environment: conn.mode,
          },
        })) || record;
      await createPendingSubscriptionOrder({
        orderId,
        product,
        amount: pricing.total,
        customerEmail: parsed.data.customerEmail,
        customerName: parsed.data.customerName,
        discountCode: discount?.code,
        discountAmount: pricing.discountAmount,
        transactionFeeAmount: pricing.transactionFeeAmount,
        affiliateId: affiliate?.id,
        environment: conn.mode,
        paypalSubscriptionId: provisioned.paypalSubscriptionId,
      });
      return Response.json({
        recordId: record.id,
        approvalUrl: provisioned.approvalUrl,
      });
    } catch (error) {
      await deleteFeatureRecord(record.id, product.userId);
      throw error;
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to start subscription checkout";
    console.error("create-subscription error:", message);
    return jsonError(message, 500);
  }
}
