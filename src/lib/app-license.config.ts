import type { ProFeature } from "./app-license.types";

export const proPurchaseUrl = "https://app.paymug.co/buy/pro";

export const proFeatures: ProFeature[] = [
  "email_campaigns",
  "automations",
  "affiliates",
  "pages",
  "multi_store",
  "private_github",
];

export const proFeatureLabels: Record<ProFeature, string> = {
  email_campaigns: "Email campaigns",
  automations: "Abandoned cart and automations",
  affiliates: "Affiliate system and portal",
  pages: "Pages and CMS",
  multi_store: "Multiple stores",
  private_github: "Private GitHub access",
};

export const proDashboardPaths: Array<{
  prefix: string;
  feature: ProFeature;
}> = [
  { prefix: "/dashboard/email/campaigns", feature: "email_campaigns" },
  { prefix: "/dashboard/automations", feature: "automations" },
  { prefix: "/dashboard/affiliates", feature: "affiliates" },
  { prefix: "/dashboard/pages", feature: "pages" },
  { prefix: "/dashboard/stores", feature: "multi_store" },
  { prefix: "/dashboard/settings/github", feature: "private_github" },
];
