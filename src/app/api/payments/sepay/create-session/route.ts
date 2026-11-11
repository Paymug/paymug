import { cookies } from "next/headers";
import { z } from "zod";
import {
  findAffiliateByCode,
  resolveDiscount,
  subscribeCheckoutCustomer,
} from "@/lib/commerce-features";
import {
  createOrder,
  findProductById,
} from "@/lib/db";
import { getSepayCredentials } from "@/lib/payment-credentials";
import { notifyInvoiceCreated } from "@/lib/notification-events";
import { isSubscriptionProduct } from "@/lib/product-billing";
import { calculateCheckoutPricing } from "@/lib/product-pricing";
import { getProductPublicPath } from "@/lib/product-paths";
import { getRuntimeAbsoluteUrl } from "@/lib/runtime-env";
import { buildSepayCheckoutFields, getSepayCheckoutUrl, SEPAY_CURRENCY } from "@/lib/sepay";
import { jsonError, uid } from "@/lib/utils";
import { getStoreById } from "@/lib/stores";
import { affiliateCookieMatchesStore } from "@/lib/affiliate-settings.utils";
import {
  formatCustomCheckoutAmount,
  resolveProductCheckoutPrice,
} from "@/lib/custom-product-amount";
import {
  appendCheckoutCustomData,
  checkoutCustomDataSchema,
} from "@/lib/checkout-custom-data";
import { assertSeatAddOnOrder, resolveCheckoutConfiguration, SeatAddOnError } from "@/lib/seat-addons";

const schema = z.object({
  productId: z.string().min(1),
  customAmount: z.number().int().min(0).max(1_000_000_000).optional(),
  customerEmail: z.string().email(),
  customerName: z.string().max(120).optional(),
  discountCode: z.string().max(60).optional(),
  affiliateCode: z.string().max(80).optional(),
  marketingOptIn: z.boolean().optional(),
  custom: checkoutCustomDataSchema.optional(),
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message || "Invalid input");
    }
    const product = await findProductById(parsed.data.productId);
    if (!product || product.status !== "published") {
      return jsonError("Product not available", 404);
    }
    if (isSubscriptionProduct(product)) {
      return jsonError("SePay does not support subscriptions", 400);
    }
    if (product.currency.toUpperCase() !== SEPAY_CURRENCY) {
      return jsonError("SePay only supports VND products", 400);
    }
    const basePrice = resolveProductCheckoutPrice(
      product,
      parsed.data.customAmount,
    );
    const { configuration, seatAddOn } = await resolveCheckoutConfiguration(
      product,
      parsed.data.custom,
      basePrice,
    );
    assertSeatAddOnOrder(seatAddOn, configuration, parsed.data.customerEmail);
    const checkoutPrice = configuration.price;
    const store = await getStoreById(product.storeId, product.userId);
    if (store?.paymentGateway !== "sepay") {
      return jsonError("SePay is not enabled for this store", 409);
    }
    const connection = await getSepayCredentials(
      product.userId,
      product.environment,
      product.storeId
    );
    if (!connection) {
      return jsonError("Seller has not configured SePay yet", 400);
    }
    const discount = await resolveDiscount(
      product.userId,
      parsed.data.discountCode,
      checkoutPrice,
      product.id,
      product.storeId,
      product.environment
    );
    const cookieJar = await cookies();
    const affiliateCookie = cookieJar.get("paymug_affiliate")?.value.split(":");
    const affiliateCode =
      affiliateCookieMatchesStore(
        affiliateCookie?.[0],
        product.userId,
        product.storeId
      )
        ? affiliateCookie?.[1]
        : undefined;
    const affiliate = await findAffiliateByCode(
      product.userId,
      parsed.data.affiliateCode || affiliateCode,
      product.storeId,
      product.environment
    );
    const pricing = calculateCheckoutPricing(
      product,
      discount?.amount,
      checkoutPrice,
    );
    if (pricing.total === 0) {
      return jsonError("This purchase is free and does not require payment", 400);
    }
    if (pricing.total % 100 !== 0) {
      return jsonError("SePay amounts must be whole VND", 400);
    }
    if (parsed.data.marketingOptIn) {
      await subscribeCheckoutCustomer(
        product.userId,
        parsed.data.customerEmail,
        parsed.data.customerName,
        product.environment
      );
    }
    const order = await createOrder({
      id: uid(),
      userId: product.userId,
      storeId: product.storeId,
      productId: product.id,
      productName: product.name,
      productDescription: product.description,
      productPrice: checkoutPrice,
      deliveryContent: product.deliveryContent,
      productFiles: product.productFiles,
      githubRepoOwner: product.githubRepoOwner,
      githubRepoName: product.githubRepoName,
      amount: pricing.total,
      currency: product.currency,
      status: "pending",
      customerEmail: parsed.data.customerEmail,
      customerName: parsed.data.customerName,
      custom: configuration.custom,
      discountCode: discount?.code,
      discountAmount: pricing.discountAmount,
      transactionFeeAmount: pricing.transactionFeeAmount,
      affiliateId: affiliate?.id,
      environment: connection.mode,
      gateway: "sepay",
      createdAt: new Date().toISOString(),
      githubAccessStatus:
        product.githubRepoOwner && product.githubRepoName
          ? "pending"
          : "not_required",
      githubAccessManaged: false,
    });
    const successUrl = await getRuntimeAbsoluteUrl(
      `/checkout/success?orderId=${encodeURIComponent(order.id)}`,
      request.url
    );
    const cancelParams = new URLSearchParams({ cancelled: "1" });
    if (parsed.data.customAmount !== undefined) {
      cancelParams.set(
        "amount",
        formatCustomCheckoutAmount(parsed.data.customAmount),
      );
    }
    appendCheckoutCustomData(cancelParams, configuration.custom);
    const cancelUrl = await getRuntimeAbsoluteUrl(
      `${getProductPublicPath(product)}?${cancelParams.toString()}`,
      request.url
    );
    const fields = buildSepayCheckoutFields({
      merchantId: connection.merchantId,
      secretKey: connection.secretKey,
      orderId: order.id,
      amountCents: pricing.total,
      description: `Order ${order.id.slice(0, 8)} - ${product.name}`.slice(0, 120),
      successUrl,
      errorUrl: cancelUrl,
      cancelUrl,
    });
    await notifyInvoiceCreated(order);
    return Response.json({
      orderId: order.id,
      checkoutUrl: getSepayCheckoutUrl(connection.mode),
      fields,
    });
  } catch (error) {
    if (error instanceof SeatAddOnError) return jsonError(error.message, 400);
    const message =
      error instanceof Error ? error.message : "Failed to start SePay checkout";
    console.error("sepay create-session error:", message);
    return jsonError(message, 500);
  }
}
