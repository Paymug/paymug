const purchaseOnlyProductFields = [
  "deliveryContent",
  "redirectUrl",
  "productFiles",
  "generateLicense",
  "licenseType",
  "licenseUpdatePeriodUnit",
  "licenseUpdatePeriodCount",
  "licenseSeatLimit",
  "githubRepoOwner",
  "githubRepoName",
] as const;

export function omitProductPurchaseDetails<T extends object>(
  product: T,
) {
  const publicProduct = { ...product };

  for (const field of purchaseOnlyProductFields) {
    Reflect.deleteProperty(publicProduct, field);
  }

  // Variants carry the same purchase-only overrides.
  const variants = (publicProduct as { variants?: unknown }).variants;
  if (Array.isArray(variants)) {
    (publicProduct as { variants?: unknown }).variants = variants.map(
      (variant) => {
        const publicVariant = { ...(variant as object) };
        for (const field of purchaseOnlyProductFields) {
          Reflect.deleteProperty(publicVariant, field);
        }
        return publicVariant;
      },
    );
  }

  return publicProduct;
}
