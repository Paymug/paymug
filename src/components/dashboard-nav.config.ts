import type {
  DashboardNavGroupConfig,
  DashboardNavItem,
} from "./DashboardNav.types";

export const dashboardHomeLink: DashboardNavItem = {
  href: "/dashboard",
  label: "Home",
  exact: true,
};

export const dashboardSetupLink: DashboardNavItem = {
  href: "/dashboard/setup",
  label: "Setup",
  exact: true,
};

export const dashboardNavGroups: DashboardNavGroupConfig[] = [
  {
    id: "store",
    label: "Store",
    defaultOpen: true,
    items: [
      { href: "/dashboard/products", label: "Products" },
      { href: "/dashboard/orders", label: "Orders" },
      { href: "/dashboard/subscriptions", label: "Subscriptions" },
      { href: "/dashboard/customers", label: "Customers" },
      { href: "/dashboard/discounts", label: "Discounts" },
      { href: "/dashboard/licenses", label: "Licenses" },
      { href: "/dashboard/analytics", label: "Analytics", exact: true },
    ],
  },
  {
    id: "email",
    label: "Email",
    items: [
      { href: "/dashboard/email/campaigns", label: "Campaigns" },
      { href: "/dashboard/email/subscribers", label: "Subscribers" },
      { href: "/dashboard/automations", label: "Automations" },
    ],
  },
  {
    id: "affiliates",
    label: "Affiliates",
    items: [
      {
        href: "/dashboard/affiliates",
        label: "Overview",
        exact: true,
      },
      { href: "/dashboard/affiliates/clicks", label: "Clicks" },
      { href: "/dashboard/affiliates/referrals", label: "Referrals" },
      { href: "/dashboard/affiliates/payouts", label: "Payouts" },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    items: [
      {
        href: "/dashboard/settings",
        label: "General",
        exact: true,
      },
      { href: "/dashboard/settings/store", label: "Store" },
      { href: "/dashboard/pages", label: "Pages" },
      { href: "/dashboard/settings/payments", label: "Payments" },
      { href: "/dashboard/settings/github", label: "GitHub" },
      { href: "/dashboard/settings/api-keys", label: "API Keys" },
      { href: "/dashboard/settings/webhooks", label: "Webhooks" },
      { href: "/dashboard/settings/license", label: "License" },
      { href: "/dashboard/settings/about", label: "About" },
    ],
  },
];
