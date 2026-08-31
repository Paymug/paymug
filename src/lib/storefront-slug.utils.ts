const reservedStorefrontSlugs = new Set([
  "api",
  "affiliates",
  "buy",
  "checkout",
  "customer",
  "dashboard",
  "login",
  "og",
  "page-editor",
  "pages",
  "r",
  "s",
  "setup",
  "signup",
  "subscription",
  "unsubscribe",
]);

export function isReservedStorefrontSlug(slug: string): boolean {
  return reservedStorefrontSlugs.has(slug);
}
