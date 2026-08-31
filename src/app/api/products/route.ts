import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import {
  createProduct,
  findProductById,
  findProductBySlug,
  listProductsByUser,
} from "@/lib/db";
import { slugify } from "@/lib/format";
import { validateGitHubProductRepository } from "@/lib/github-products";
import {
  parseProductBillingType,
  parseProductIntervalCount,
  parseProductIntervalUnit,
  parseProductTrialDays,
} from "@/lib/product-billing";
import { productFileInputSchema } from "@/lib/product-files.schema";
import { productImageUrlSchema } from "@/lib/product-image.schema";
import { productRedirectUrlSchema } from "@/lib/product-redirect-url";
import { validateProductFileOwnership } from "@/lib/product-files.utils";
import {
  parseLicenseUpdatePeriod,
  parseProductLicenseType,
} from "@/lib/license-entitlements";
import { jsonError, uid } from "@/lib/utils";
import { requireProFeature } from "@/lib/pro-feature-access";
import { findProductCategory } from "@/lib/product-categories";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const products = await listProductsByUser(
    user.id,
    user.activeStoreId,
    user.environment
  );
  return Response.json({ products });
}

const createSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().trim().max(100).optional().default(""),
  description: z.string().max(100000).optional().default(""),
  categoryId: z.string().min(1).nullable().optional(),
  price: z.number().int().nonnegative(),
  transactionFeeType: z.enum(["fixed", "percentage"]).default("fixed"),
  transactionFeeValue: z.number().int().min(0).max(1000000000).default(0),
  currency: z.string().length(3).default("USD"),
  status: z.enum(["draft", "published"]).default("draft"),
  deliveryContent: z.string().max(100000).optional(),
  redirectUrl: productRedirectUrlSchema.nullable().optional(),
  productFiles: z.array(productFileInputSchema).max(20).default([]),
  generateLicense: z.boolean().default(false),
  licenseType: z.enum(["standard", "perpetual"]).default("standard"),
  licenseUpdatePeriodUnit: z.enum(["day", "week", "month", "year"]).nullable().optional(),
  licenseUpdatePeriodCount: z.number().int().min(1).max(3650).default(1),
  licenseSeatLimit: z.number().int().min(1).max(1000).nullable().default(1),
  billingType: z.enum(["one_time", "subscription"]).default("one_time"),
  customAmountEnabled: z.boolean().default(false),
  intervalUnit: z.enum(["week", "month", "year"]).nullable().optional(),
  intervalCount: z.number().int().min(1).max(52).default(1),
  trialDays: z.number().int().min(0).max(365).default(0),
  githubRepoOwner: z.string().trim().min(1).max(100).nullable().optional(),
  githubRepoName: z.string().trim().min(1).max(100).nullable().optional(),
  imageUrl: productImageUrlSchema.optional(),
}).refine(
  (data) =>
    data.transactionFeeType !== "percentage" ||
    data.transactionFeeValue <= 10000,
  {
    message: "Percentage transaction fee cannot exceed 100%",
    path: ["transactionFeeValue"],
  }
).refine(
  (data) => data.status !== "published" || data.price > 0,
  {
    message: "Published products must have a price greater than 0",
    path: ["price"],
  }
).refine(
  (data) =>
    data.billingType !== "subscription" ||
    Boolean(data.intervalUnit),
  {
    message: "Choose a billing interval for subscription products",
    path: ["intervalUnit"],
  }
);

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);

  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message || "Invalid input");
    }
    if (parsed.data.githubRepoOwner || parsed.data.githubRepoName) {
      const denied = await requireProFeature("private_github");
      if (denied) return denied;
    }
    if (parsed.data.categoryId) {
      const category = await findProductCategory(parsed.data.categoryId, user.id);
      if (!category || category.storeId !== user.activeStoreId) {
        return jsonError("Category not found", 404);
      }
    }

    const now = new Date().toISOString();
    await validateGitHubProductRepository(
      user.id,
      user.activeStoreId,
      parsed.data.githubRepoOwner,
      parsed.data.githubRepoName
    );
    validateProductFileOwnership(parsed.data.productFiles, user.id);
    const billingType = parseProductBillingType(parsed.data.billingType);
    const intervalUnit =
      billingType === "subscription"
        ? parseProductIntervalUnit(parsed.data.intervalUnit) || "month"
        : null;
    const intervalCount =
      billingType === "subscription"
        ? parseProductIntervalCount(parsed.data.intervalCount, intervalUnit)
        : 1;
    const trialDays =
      billingType === "subscription"
        ? parseProductTrialDays(parsed.data.trialDays)
        : 0;
    const licenseType =
      parsed.data.generateLicense
        ? parseProductLicenseType(parsed.data.licenseType)
        : "standard";
    let licenseUpdatePeriod = {
      unit: null as null | "day" | "week" | "month" | "year",
      count: 1,
    };
    try {
      if (licenseType === "perpetual") {
        licenseUpdatePeriod =
          billingType === "subscription"
            ? parseLicenseUpdatePeriod(intervalUnit || "month", intervalCount)
            : parseLicenseUpdatePeriod(
                parsed.data.licenseUpdatePeriodUnit,
                parsed.data.licenseUpdatePeriodCount
              );
      }
    } catch (error) {
      return jsonError(
        error instanceof Error ? error.message : "Invalid license update period",
        400
      );
    }
    const productSlug = slugify(parsed.data.slug);
    if (parsed.data.slug && !productSlug) {
      return jsonError("Enter a valid product slug");
    }
    if (productSlug) {
      const [slugOwner, idOwner] = await Promise.all([
        findProductBySlug(productSlug),
        findProductById(productSlug),
      ]);
      if (slugOwner || idOwner) {
        return jsonError("Product slug already taken", 409);
      }
    }
    const product = await createProduct({
      id: uid(),
      userId: user.id,
      storeId: user.activeStoreId,
      categoryId: parsed.data.categoryId || undefined,
      purchaseCount: 0,
      environment: user.environment,
      name: parsed.data.name,
      slug: productSlug,
      description: parsed.data.description,
      price: parsed.data.price,
      transactionFeeType: parsed.data.transactionFeeType,
      transactionFeeValue: parsed.data.transactionFeeValue,
      currency: parsed.data.currency.toUpperCase(),
      status: parsed.data.status,
      deliveryContent: parsed.data.deliveryContent,
      redirectUrl: parsed.data.redirectUrl || undefined,
      productFiles: parsed.data.productFiles,
      generateLicense: parsed.data.generateLicense,
      licenseType,
      licenseUpdatePeriodUnit: licenseUpdatePeriod.unit,
      licenseUpdatePeriodCount: licenseUpdatePeriod.count,
      licenseSeatLimit: parsed.data.generateLicense
        ? parsed.data.licenseSeatLimit
        : 1,
      billingType,
      customAmountEnabled:
        billingType === "one_time" && parsed.data.customAmountEnabled,
      intervalUnit,
      intervalCount,
      trialDays,
      githubRepoOwner: parsed.data.githubRepoOwner || undefined,
      githubRepoName: parsed.data.githubRepoName || undefined,
      imageUrl: parsed.data.imageUrl || undefined,
      createdAt: now,
      updatedAt: now,
    });

    return Response.json({ product }, { status: 201 });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to create product",
      500
    );
  }
}
