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

export function omitProductPurchaseDetails<T extends Record<string, unknown>>(
  product: T,
) {
  const publicProduct = { ...product };

  for (const field of purchaseOnlyProductFields) {
    Reflect.deleteProperty(publicProduct, field);
  }

  return publicProduct;
}
