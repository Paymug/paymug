const dashboardTitles: Record<string, string> = {
  "/dashboard": "Home",
  "/dashboard/products": "Products",
  "/dashboard/orders": "Orders",
  "/dashboard/subscriptions": "Subscriptions",
  "/dashboard/customers": "Customers",
  "/dashboard/discounts": "Discounts",
  "/dashboard/licenses": "Licenses",
  "/dashboard/email/campaigns": "Campaigns",
  "/dashboard/email/subscribers": "Subscribers",
  "/dashboard/affiliates": "Affiliate overview",
  "/dashboard/affiliates/clicks": "Affiliate clicks",
  "/dashboard/affiliates/referrals": "Affiliate referrals",
  "/dashboard/affiliates/payouts": "Affiliate payouts",
  "/dashboard/settings/payments": "Payments",
  "/dashboard/settings/github": "GitHub",
  "/dashboard/setup": "Setup",
  "/dashboard/settings": "General settings",
  "/dashboard/settings/api-keys": "API keys",
  "/dashboard/settings/about": "About Paymug",
  "/dashboard/settings/store": "Store",
  "/dashboard/pages": "Pages"
};

export function getDashboardTopbarTitle(pathname: string): string {
  if (pathname === "/dashboard/products/new") return "New product";
  if (pathname.startsWith("/dashboard/products/")) return "Edit product";
  return dashboardTitles[pathname] ?? "Dashboard";
}
