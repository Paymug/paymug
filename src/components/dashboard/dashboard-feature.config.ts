import type { DashboardFeatureConfig } from "./DashboardFeaturePage.types";

const rootFeatures: Record<string, DashboardFeatureConfig> = {
  subscriptions: {
    key: "subscriptions",
    title: "Subscriptions",
    description: "Manage recurring customers, plans, and renewals.",
    emptyTitle: "No subscriptions yet",
    emptyDescription:
      "Recurring purchases will appear here when customers subscribe.",
    createLabel: "Add subscription",
    allowCreate: true,
    fields: [
      { name: "plan", label: "Plan", type: "text", source: "title", required: true },
      { name: "customer", label: "Customer email", type: "email", source: "subtitle", required: true },
      {
        name: "status",
        label: "Status",
        type: "select",
        source: "status",
        options: [
          { label: "Approval pending", value: "approval_pending" },
          { label: "Active", value: "active" },
          { label: "Trialing", value: "trialing" },
          { label: "Paused", value: "paused" },
          { label: "Suspended", value: "suspended" },
          { label: "Cancelled", value: "cancelled" },
        ],
      },
      { name: "amount", label: "Amount", type: "number", source: "data", required: true },
      {
        name: "trialDays",
        label: "Free trial (days)",
        type: "number",
        source: "data",
        placeholder: "0",
        min: 0,
        max: 365,
        step: 1,
      },
      {
        name: "interval",
        label: "Billing interval",
        type: "select",
        source: "data",
        options: [
          { label: "Weekly", value: "week" },
          { label: "Every 2 weeks", value: "week:2" },
          { label: "Monthly", value: "month" },
          { label: "Every 3 months", value: "month:3" },
          { label: "Every 6 months", value: "month:6" },
          { label: "Yearly", value: "year" },
        ],
      },
    ],
    listFields: [
      { label: "Plan", source: "title" },
      { label: "Customer", source: "subtitle" },
      { label: "Amount", source: "data", name: "amount" },
      { label: "Interval", source: "data", name: "interval" },
      { label: "Free trial", source: "data", name: "trialDays" },
      { label: "Payments", source: "data", name: "paymentsReceived" },
      { label: "Last payment", source: "data", name: "lastPaymentAt" },
      { label: "Approval link", source: "data", name: "approvalUrl" },
      { label: "Status", source: "status" },
    ],
  },
  customers: {
    key: "customers",
    title: "Customers",
    description: "View the people who purchase from your store.",
    emptyTitle: "No customers yet",
    emptyDescription:
      "Customer profiles will be created automatically after their first order.",
    createLabel: "Add customer",
    allowCreate: true,
    allowImport: true,
    fields: [
      { name: "name", label: "Name", type: "text", source: "title", required: true },
      { name: "email", label: "Email", type: "email", source: "subtitle", required: true },
      {
        name: "status",
        label: "Status",
        type: "select",
        source: "status",
        options: [
          { label: "Active", value: "active" },
          { label: "Blocked", value: "blocked" },
        ],
      },
      { name: "note", label: "Internal note", type: "textarea", source: "data" },
    ],
    listFields: [
      { label: "Customer", source: "title" },
      { label: "Email", source: "subtitle" },
      { label: "Subscriptions", source: "data", name: "subscriptionsCount" },
      { label: "Orders", source: "data", name: "ordersCount" },
      { label: "MRR", source: "data", name: "mrr" },
      { label: "Total revenue", source: "data", name: "totalSpent" },
      { label: "Status", source: "status" },
    ],
  },
  discounts: {
    key: "discounts",
    title: "Discounts",
    description: "Create and manage promotional codes for your products.",
    emptyTitle: "No discounts yet",
    emptyDescription:
      "Discount codes you create will appear here with their usage details.",
    createLabel: "Create discount",
    allowCreate: true,
    fields: [
      { name: "code", label: "Discount code", type: "text", source: "title", required: true },
      { name: "description", label: "Description", type: "text", source: "subtitle" },
      {
        name: "status",
        label: "Status",
        type: "select",
        source: "status",
        options: [
          { label: "Active", value: "active" },
          { label: "Disabled", value: "disabled" },
        ],
      },
      {
        name: "type",
        label: "Type",
        type: "select",
        source: "data",
        options: [
          { label: "Percentage", value: "percent" },
          { label: "Fixed amount", value: "fixed" },
        ],
      },
      {
        name: "subscriptionPeriods",
        label: "Subscription discount periods",
        type: "number",
        source: "data",
        placeholder: "All periods",
        min: 1,
        max: 120,
        step: 1,
      },
      {
        name: "productIds",
        label: "Applies to",
        type: "multi-select",
        source: "data",
        optionsSource: "products",
        options: [{ label: "All products", value: "all" }],
      },
      { name: "value", label: "Value (% or currency amount)", type: "number", source: "data", required: true },
      { name: "usageLimit", label: "Usage limit", type: "number", source: "data" },
      { name: "expiresAt", label: "Expires", type: "date", source: "data" },
    ],
    listFields: [
      { label: "Code", source: "title" },
      { label: "Type", source: "data", name: "type" },
      { label: "Value", source: "data", name: "value" },
      { label: "Applies to", source: "data", name: "productNames" },
      { label: "Subscription periods", source: "data", name: "subscriptionPeriods" },
      { label: "Used", source: "data", name: "usageCount" },
      { label: "Status", source: "status" },
    ],
  },
  licenses: {
    key: "licenses",
    title: "Licenses",
    description: "Issue and manage license keys for digital products.",
    emptyTitle: "No licenses yet",
    emptyDescription:
      "License keys generated for eligible purchases will appear here.",
    createLabel: "Issue license",
    allowCreate: true,
    fields: [
      { name: "key", label: "License key", type: "text", source: "title", required: true },
      { name: "customer", label: "Customer email", type: "email", source: "subtitle", required: true },
      {
        name: "status",
        label: "Status",
        type: "select",
        source: "status",
        options: [
          { label: "Active", value: "active" },
          { label: "Revoked", value: "revoked" },
          { label: "Expired", value: "expired" },
        ],
      },
      { name: "product", label: "Product", type: "text", source: "data", required: true },
      {
        name: "licenseType",
        label: "License model",
        type: "select",
        source: "data",
        options: [
          { label: "Standard", value: "standard" },
          { label: "Perpetual", value: "perpetual" },
        ],
      },
      { name: "expiresAt", label: "License expires", type: "date", source: "data" },
      { name: "updatesExpireAt", label: "Updates through", type: "date", source: "data" },
    ],
    listFields: [
      { label: "License", source: "title" },
      { label: "Customer", source: "subtitle" },
      { label: "Product", source: "data", name: "product" },
      { label: "License model", source: "data", name: "licenseType" },
      { label: "Updates through", source: "data", name: "updatesExpireAt" },
      { label: "Status", source: "status" },
    ],
  },
  affiliates: {
    key: "affiliates",
    title: "Affiliate overview",
    description: "Track affiliate-driven traffic, referrals, and commissions.",
    emptyTitle: "No affiliate activity yet",
    emptyDescription:
      "Affiliate performance will appear here after your first tracked visit.",
    createLabel: "Add affiliate",
    allowCreate: true,
    allowImport: true,
    fields: [
      { name: "name", label: "Name", type: "text", source: "title", required: true },
      { name: "email", label: "Email", type: "email", source: "subtitle", required: true },
      {
        name: "status",
        label: "Status",
        type: "select",
        source: "status",
        options: [
          { label: "Approved", value: "active" },
          { label: "Pending", value: "inactive" },
          { label: "Rejected", value: "rejected" },
        ],
      },
      { name: "code", label: "Tracking code", type: "text", source: "data", required: true },
      { name: "about", label: "About", type: "textarea", source: "data" },
      { name: "websites", label: "Websites", type: "textarea", source: "data" },
      { name: "socialLinks", label: "Social links", type: "textarea", source: "data" },
    ],
    listFields: [
      { label: "Affiliate", source: "title" },
      { label: "Email", source: "subtitle" },
      { label: "Clicks", source: "data", name: "clicksCount" },
      { label: "Referrals", source: "data", name: "referralsCount" },
      { label: "Status", source: "status" },
      { label: "City", source: "data", name: "city" },
      { label: "Country", source: "data", name: "country" },
      { label: "Total earning", source: "data", name: "totalEarnings" },
      { label: "Unpaid earning", source: "data", name: "unpaidEarnings" },
      { label: "Payouts", source: "data", name: "payoutsCount" },
    ],
  },
};

const nestedFeatures: Record<string, DashboardFeatureConfig> = {
  "email/campaigns": {
    key: "campaigns",
    title: "Campaigns",
    description: "Create and monitor email campaigns for your audience.",
    emptyTitle: "No campaigns yet",
    emptyDescription:
      "Draft and sent campaigns will appear here with delivery performance.",
    createLabel: "Create campaign",
    allowCreate: true,
    fields: [
      { name: "subject", label: "Subject", type: "text", source: "title", required: true },
      { name: "preview", label: "Preview text", type: "text", source: "subtitle" },
      {
        name: "status",
        label: "Status",
        type: "select",
        source: "status",
        options: [
          { label: "Draft", value: "draft" },
          { label: "Sent", value: "sent" },
        ],
      },
      { name: "content", label: "Email content", type: "textarea", source: "data", required: true },
    ],
    listFields: [
      { label: "Campaign", source: "title" },
      { label: "Status", source: "status" },
      { label: "Recipients", source: "data", name: "recipientCount" },
      { label: "Sent", source: "data", name: "sentAt" },
    ],
  },
  "email/subscribers": {
    key: "subscribers",
    title: "Subscribers",
    description: "Manage the audience subscribed to your store emails.",
    emptyTitle: "No subscribers yet",
    emptyDescription:
      "People who opt in to your emails will appear in this audience.",
    createLabel: "Add subscriber",
    allowCreate: true,
    allowImport: true,
    fields: [
      { name: "email", label: "Email", type: "email", source: "title", required: true },
      { name: "name", label: "Name", type: "text", source: "subtitle" },
      {
        name: "status",
        label: "Status",
        type: "select",
        source: "status",
        options: [
          { label: "Subscribed", value: "subscribed" },
          { label: "Unsubscribed", value: "unsubscribed" },
        ],
      },
      { name: "source", label: "Source", type: "text", source: "data" },
    ],
    listFields: [
      { label: "Email", source: "title" },
      { label: "Name", source: "subtitle" },
      { label: "Country", source: "data", name: "countryFormatted" },
      { label: "Source", source: "data", name: "source" },
      { label: "Sends", source: "data", name: "emailSends" },
      { label: "Opens", source: "data", name: "emailOpens" },
      { label: "Clicks", source: "data", name: "emailClicks" },
      { label: "Status", source: "status" },
    ],
  },
  "affiliates/clicks": {
    key: "affiliate-clicks",
    title: "Affiliate clicks",
    description: "Review visits generated by your affiliate links.",
    emptyTitle: "No clicks yet",
    emptyDescription:
      "Tracked affiliate link visits will appear here with their sources.",
    createLabel: "Add click",
    allowCreate: false,
    fields: [],
    listFields: [
      { label: "Affiliate", source: "title" },
      { label: "Destination", source: "subtitle" },
      { label: "Referrer", source: "data", name: "referrer" },
      { label: "Date", source: "data", name: "clickedAt" },
    ],
  },
  "affiliates/referrals": {
    key: "affiliate-referrals",
    title: "Affiliate referrals",
    description: "Review orders attributed to your affiliates.",
    emptyTitle: "No referrals yet",
    emptyDescription:
      "Attributed orders will appear here with commission information.",
    createLabel: "Add referral",
    allowCreate: false,
    fields: [
      { name: "affiliate", label: "Affiliate", type: "text", source: "title", required: true },
      { name: "order", label: "Order ID", type: "text", source: "subtitle", required: true },
      {
        name: "status",
        label: "Status",
        type: "select",
        source: "status",
        options: [
          { label: "Pending", value: "pending" },
          { label: "Approved", value: "approved" },
          { label: "Paid", value: "paid" },
          { label: "Rejected", value: "rejected" },
        ],
      },
      { name: "amount", label: "Sale amount", type: "number", source: "data" },
      { name: "commission", label: "Commission", type: "number", source: "data" },
    ],
    listFields: [
      { label: "Affiliate", source: "title" },
      { label: "Order", source: "subtitle" },
      { label: "Sale", source: "data", name: "amount" },
      { label: "Commission", source: "data", name: "commission" },
      { label: "Status", source: "status" },
    ],
  },
  "affiliates/payouts": {
    key: "affiliate-payouts",
    title: "Affiliate payouts",
    description: "Manage commission balances and affiliate payments.",
    emptyTitle: "No payouts yet",
    emptyDescription:
      "Completed and scheduled commission payouts will appear here.",
    createLabel: "Create payout",
    allowCreate: false,
    fields: [
      { name: "affiliate", label: "Affiliate", type: "text", source: "title", required: true },
      { name: "reference", label: "Payment reference", type: "text", source: "subtitle" },
      { name: "recipientEmail", label: "Recipient email", type: "email", source: "data", required: true },
      {
        name: "status",
        label: "Status",
        type: "select",
        source: "status",
        options: [
          { label: "Unpaid", value: "unpaid" },
          { label: "Paid", value: "paid" },
        ],
      },
      { name: "amount", label: "Amount", type: "number", source: "data", required: true },
      { name: "paidAt", label: "Paid date", type: "date", source: "data" },
    ],
    listFields: [
      { label: "Affiliate", source: "title" },
      { label: "Recipient", source: "data", name: "recipientEmail" },
      { label: "Amount", source: "data", name: "amount" },
      { label: "Reference", source: "subtitle" },
      { label: "Status", source: "status" },
    ],
  },
  "settings/api-keys": {
    key: "api-keys",
    title: "API keys",
    description: "Manage credentials used to access the Paymug API.",
    emptyTitle: "No API keys yet",
    emptyDescription:
      "API credentials you create will appear here with their last-used date.",
    createLabel: "Create API key",
    allowCreate: true,
    fields: [],
    listFields: [],
  },
};

export function getRootDashboardFeature(
  feature: string
): DashboardFeatureConfig | undefined {
  return rootFeatures[feature];
}

export function getNestedDashboardFeature(
  section: string,
  feature: string
): DashboardFeatureConfig | undefined {
  return nestedFeatures[`${section}/${feature}`];
}

export function getDashboardFeature(
  featurePath: string[]
): DashboardFeatureConfig | undefined {
  if (featurePath.length === 1) {
    return getRootDashboardFeature(featurePath[0]);
  }
  if (featurePath.length === 2) {
    return getNestedDashboardFeature(featurePath[0], featurePath[1]);
  }
  return undefined;
}
