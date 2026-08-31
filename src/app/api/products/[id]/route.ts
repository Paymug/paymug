import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import {
  deleteProduct,
  findProductById,
  findProductBySlug,
  updateProduct,
} from "@/lib/db";
import { slugify } from "@/lib/format";
import {
  revokeProductGitHubAccess,
} from "@/lib/github-access";
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
import { jsonError } from "@/lib/utils";
import { requireProFeature } from "@/lib/pro-feature-access";
import { omitProductPurchaseDetails } from "./route.utils";
import { findProductCategory } from "@/lib/product-categories";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const product = await findProductById(id);
  if (!product) return jsonError("Not found", 404);

  // Public can view published; owner can view any
  const user = await getSessionUser();
  if (
    (product.environment !== "live" && product.userId !== user?.id) ||
    (product.userId === user?.id && product.environment !== user.environment) ||
    (product.status !== "published" && product.userId !== user?.id)
  ) {
    return jsonError("Not found", 404);
  }

  // Hide purchase-only delivery details from non-owners on public GET.
  if (product.userId !== user?.id) {
    const publicProduct = omitProductPurchaseDetails(product);
    return Response.json({ product: publicProduct });
  }

  return Response.json({ product });
}

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  slug: z.string().trim().max(100).optional(),
  description: z.string().max(100000).optional(),
  categoryId: z.string().min(1).nullable().optional(),
  price: z.number().int().nonnegative().optional(),
  transactionFeeType: z.enum(["fixed", "percentage"]).optional(),
  transactionFeeValue: z.number().int().min(0).max(1000000000).optional(),
  currency: z.string().length(3).optional(),
  status: z.enum(["draft", "published"]).optional(),
  deliveryContent: z.string().max(100000).optional(),
  redirectUrl: productRedirectUrlSchema.nullable().optional(),
  productFiles: z.array(productFileInputSchema).max(20).optional(),
  generateLicense: z.boolean().optional(),
  licenseType: z.enum(["standard", "perpetual"]).optional(),
  licenseUpdatePeriodUnit: z.enum(["day", "week", "month", "year"]).nullable().optional(),
  licenseUpdatePeriodCount: z.number().int().min(1).max(3650).optional(),
  licenseSeatLimit: z.number().int().min(1).max(1000).nullable().optional(),
  billingType: z.enum(["one_time", "subscription"]).optional(),
  customAmountEnabled: z.boolean().optional(),
  intervalUnit: z.enum(["week", "month", "year"]).nullable().optional(),
  intervalCount: z.number().int().min(1).max(52).optional(),
  trialDays: z.number().int().min(0).max(365).optional(),
  githubRepoOwner: z.string().trim().min(1).max(100).nullable().optional(),
  githubRepoName: z.string().trim().min(1).max(100).nullable().optional(),
  imageUrl: productImageUrlSchema.optional(),
}).refine(
  (data) =>
    data.transactionFeeType !== "percentage" ||
    data.transactionFeeValue === undefined ||
    data.transactionFeeValue <= 10000,
  {
    message: "Percentage transaction fee cannot exceed 100%",
    path: ["transactionFeeValue"],
  }
);

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);

  const { id } = await ctx.params;
  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message || "Invalid input");
    }

    const existing = await findProductById(id);
    if (
      !existing ||
      existing.userId !== user.id ||
      existing.environment !== user.environment
    ) {
      return jsonError("Not found", 404);
    }
    if (parsed.data.categoryId) {
      const category = await findProductCategory(parsed.data.categoryId, user.id);
      if (!category || category.storeId !== user.activeStoreId) {
        return jsonError("Category not found", 404);
      }
    }
    const productSlug =
      parsed.data.slug === undefined ? undefined : slugify(parsed.data.slug);
    if (parsed.data.slug && !productSlug) {
      return jsonError("Enter a valid product slug");
    }
    if (productSlug) {
      const [slugOwner, idOwner] = await Promise.all([
        findProductBySlug(productSlug),
        findProductById(productSlug),
      ]);
      if (
        (slugOwner && slugOwner.id !== existing.id) ||
        (idOwner && idOwner.id !== existing.id)
      ) {
        return jsonError("Product slug already taken", 409);
      }
    }
    if (
      (parsed.data.status ?? existing.status) === "published" &&
      (parsed.data.price ?? existing.price) < 1
    ) {
      return jsonError("Published products must have a price greater than 0");
    }

    const nextBillingType = parseProductBillingType(
      parsed.data.billingType ?? existing.billingType
    );
    let intervalUnit =
      nextBillingType === "subscription"
        ? parseProductIntervalUnit(
            parsed.data.intervalUnit !== undefined
              ? parsed.data.intervalUnit
              : existing.intervalUnit
          ) || "month"
        : null;
    let intervalCount = 1;
    let trialDays = 0;
    try {
      if (nextBillingType === "subscription") {
        intervalCount = parseProductIntervalCount(
          parsed.data.intervalCount ?? existing.intervalCount,
          intervalUnit
        );
        trialDays = parseProductTrialDays(
          parsed.data.trialDays !== undefined
            ? parsed.data.trialDays
            : existing.trialDays
        );
      }
    } catch (error) {
      return jsonError(
        error instanceof Error ? error.message : "Invalid billing settings"
      );
    }
    const generateLicense = parsed.data.generateLicense ?? existing.generateLicense;
    const licenseType =
      generateLicense
        ? parseProductLicenseType(parsed.data.licenseType ?? existing.licenseType)
        : "standard";
    const licenseSeatLimit = generateLicense
      ? parsed.data.licenseSeatLimit !== undefined
        ? parsed.data.licenseSeatLimit
        : existing.licenseSeatLimit
      : 1;
    let licenseUpdatePeriod = { unit: null as null | "day" | "week" | "month" | "year", count: 1 };
    try {
      if (licenseType === "perpetual") {
        licenseUpdatePeriod =
          nextBillingType === "subscription"
            ? parseLicenseUpdatePeriod(intervalUnit || "month", intervalCount)
            : parseLicenseUpdatePeriod(
                parsed.data.licenseUpdatePeriodUnit !== undefined
                  ? parsed.data.licenseUpdatePeriodUnit
                  : existing.licenseUpdatePeriodUnit,
                parsed.data.licenseUpdatePeriodCount ?? existing.licenseUpdatePeriodCount
              );
      }
    } catch (error) {
      return jsonError(
        error instanceof Error ? error.message : "Invalid license update period"
      );
    }

    const patch = {
      ...parsed.data,
      ...(productSlug !== undefined ? { slug: productSlug } : {}),
      generateLicense,
      licenseType,
      licenseUpdatePeriodUnit: licenseUpdatePeriod.unit,
      licenseUpdatePeriodCount: licenseUpdatePeriod.count,
      licenseSeatLimit,
      billingType: nextBillingType,
      customAmountEnabled:
        nextBillingType === "one_time"
          ? parsed.data.customAmountEnabled ?? existing.customAmountEnabled
          : false,
      intervalUnit,
      intervalCount,
      trialDays,
      currency: parsed.data.currency?.toUpperCase(),
      imageUrl: parsed.data.imageUrl === "" ? null : parsed.data.imageUrl,
      ...(parsed.data.categoryId !== undefined
        ? { categoryId: parsed.data.categoryId }
        : {}),
    };
    const repositoryChanged =
      (parsed.data.githubRepoOwner !== undefined &&
        (parsed.data.githubRepoOwner || undefined) !==
          (existing.githubRepoOwner || undefined)) ||
      (parsed.data.githubRepoName !== undefined &&
        (parsed.data.githubRepoName || undefined) !==
          (existing.githubRepoName || undefined));
    if (repositoryChanged) {
      const nextOwner = parsed.data.githubRepoOwner ?? existing.githubRepoOwner;
      const nextName = parsed.data.githubRepoName ?? existing.githubRepoName;
      if (nextOwner || nextName) {
        const denied = await requireProFeature("private_github");
        if (denied) return denied;
      }
      await validateGitHubProductRepository(
        user.id,
        user.activeStoreId,
        parsed.data.githubRepoOwner,
        parsed.data.githubRepoName
      );
      await revokeProductGitHubAccess(existing);
    }
    if (parsed.data.productFiles) {
      validateProductFileOwnership(parsed.data.productFiles, user.id);
    }

    const product = await updateProduct(id, user.id, patch);
    if (!product) return jsonError("Not found", 404);
    return Response.json({ product });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to update product",
      500
    );
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);

  const { id } = await ctx.params;
  const product = await findProductById(id);
  if (
    !product ||
    product.userId !== user.id ||
    product.environment !== user.environment
  ) {
    return jsonError("Not found", 404);
  }
  await revokeProductGitHubAccess(product);
  const ok = await deleteProduct(id, user.id);
  if (!ok) return jsonError("Not found", 404);
  return Response.json({ ok: true });
}
