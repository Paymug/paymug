import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  storeName: text("store_name").notNull(),
  storeSlug: text("store_slug").notNull().unique(),
  environment: text("environment", { enum: ["sandbox", "live"] })
    .notNull()
    .default("sandbox"),
  activeStoreId: text("active_store_id"),
  primaryStoreId: text("primary_store_id"),
  githubOAuthHostname: text("github_oauth_hostname"),
  createdAt: text("created_at").notNull(),
});

export const stores = sqliteTable(
  "stores",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull().default(""),
    logoImageUrl: text("logo_image_url"),
    coverImageUrl: text("cover_image_url"),
    emailFrom: text("email_from"),
    emailReplyTo: text("email_reply_to"),
    paymentCredentialSourceStoreId: text(
      "payment_credential_source_store_id"
    ),
    paymentGateway: text("payment_gateway", {
      enum: ["paypal", "stripe"],
    })
      .notNull()
      .default("paypal"),
    githubCredentialSourceStoreId: text(
      "github_credential_source_store_id"
    ),
    affiliatesEnabled: integer("affiliates_enabled", { mode: "boolean" })
      .notNull()
      .default(true),
    affiliateCommissionType: text("affiliate_commission_type", {
      enum: ["percentage", "fixed"],
    })
      .notNull()
      .default("percentage"),
    affiliateCommissionValue: real("affiliate_commission_value")
      .notNull()
      .default(10),
    affiliateCommissionDuration: text("affiliate_commission_duration", {
      enum: ["one_time", "recurring"],
    })
      .notNull()
      .default("one_time"),
    affiliateAttributionModel: text("affiliate_attribution_model", {
      enum: ["first_click", "last_click"],
    })
      .notNull()
      .default("last_click"),
    emailCampaignsEnabled: integer("email_campaigns_enabled", {
      mode: "boolean",
    })
      .notNull()
      .default(true),
    abandonedCheckoutRemindersEnabled: integer(
      "abandoned_checkout_reminders_enabled",
      { mode: "boolean" },
    )
      .notNull()
      .default(false),
    analyticsEnabled: integer("analytics_enabled", { mode: "boolean" })
      .notNull()
      .default(false),
    displayPurchasesEnabled: integer("display_purchases_enabled", {
      mode: "boolean",
    })
      .notNull()
      .default(false),
    currency: text("currency").notNull().default("USD"),
    transactionFeeType: text("transaction_fee_type", {
      enum: ["fixed", "percentage"],
    })
      .notNull()
      .default("fixed"),
    transactionFeeValue: integer("transaction_fee_value").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" })
      .notNull()
      .default(true),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("stores_slug_idx").on(table.slug),
    index("stores_user_idx").on(table.userId),
  ]
);

export const productCategories = sqliteTable(
  "product_categories",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("product_categories_store_slug_idx").on(
      table.storeId,
      table.slug,
    ),
    index("product_categories_user_store_idx").on(
      table.userId,
      table.storeId,
    ),
  ],
);

export const products = sqliteTable(
  "products",
  {
    id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  storeId: text("store_id").references(() => stores.id, {
    onDelete: "cascade",
  }),
  categoryId: text("category_id").references(() => productCategories.id, {
    onDelete: "set null",
  }),
  purchaseCount: integer("purchase_count").notNull().default(0),
  environment: text("environment", { enum: ["sandbox", "live"] })
    .notNull()
    .default("sandbox"),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description").notNull().default(""),
  price: integer("price").notNull(), // cents
  transactionFeeType: text("transaction_fee_type", {
    enum: ["fixed", "percentage"],
  })
    .notNull()
    .default("fixed"),
  transactionFeeValue: integer("transaction_fee_value").notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  status: text("status", { enum: ["draft", "published"] }).notNull().default("draft"),
  imageUrl: text("image_url"),
  deliveryContent: text("delivery_content"),
  redirectUrl: text("redirect_url"),
  productFiles: text("product_files").notNull().default("[]"),
  generateLicense: integer("generate_license", { mode: "boolean" })
    .notNull()
    .default(false),
  licenseType: text("license_type", {
    enum: ["standard", "perpetual"],
  })
    .notNull()
    .default("standard"),
  licenseUpdatePeriodUnit: text("license_update_period_unit", {
    enum: ["day", "week", "month", "year"],
  }),
  licenseUpdatePeriodCount: integer("license_update_period_count")
    .notNull()
    .default(1),
  licenseSeatLimit: integer("license_seat_limit").default(1),
  billingType: text("billing_type", {
    enum: ["one_time", "subscription"],
  })
    .notNull()
    .default("one_time"),
  customAmountEnabled: integer("custom_amount_enabled", { mode: "boolean" })
    .notNull()
    .default(false),
  intervalUnit: text("interval_unit", {
    enum: ["week", "month", "year"],
  }),
  intervalCount: integer("interval_count").notNull().default(1),
  trialDays: integer("trial_days").notNull().default(0),
  githubRepoOwner: text("github_repo_owner"),
  githubRepoName: text("github_repo_name"),
  createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("products_slug_idx").on(table.slug),
    index("products_category_idx").on(table.categoryId),
    index("products_user_store_environment_created_idx").on(
      table.userId,
      table.storeId,
      table.environment,
      table.createdAt,
    ),
  ],
);

export const productCategoryProducts = sqliteTable(
  "product_category_products",
  {
    categoryId: text("category_id")
      .notNull()
      .references(() => productCategories.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.categoryId, table.productId] }),
    index("product_category_products_product_idx").on(table.productId),
  ],
);

export const orders = sqliteTable(
  "orders",
  {
    id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  storeId: text("store_id").references(() => stores.id, {
    onDelete: "cascade",
  }),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  productName: text("product_name").notNull(),
  productDescription: text("product_description"),
  productPrice: integer("product_price"),
  deliveryContent: text("delivery_content"),
  productFiles: text("product_files").notNull().default("[]"),
  githubRepoOwner: text("github_repo_owner"),
  githubRepoName: text("github_repo_name"),
  amount: integer("amount").notNull(), // cents
  currency: text("currency").notNull(),
  status: text("status", {
    enum: ["pending", "paid", "failed", "refunded"],
  })
    .notNull()
    .default("pending"),
  customerEmail: text("customer_email").notNull(),
  customerName: text("customer_name"),
  custom: text("custom").notNull().default("{}"),
  discountCode: text("discount_code"),
  discountAmount: integer("discount_amount").notNull().default(0),
  transactionFeeAmount: integer("transaction_fee_amount").notNull().default(0),
  affiliateId: text("affiliate_id"),
  environment: text("environment", { enum: ["sandbox", "live"] })
    .notNull()
    .default("sandbox"),
  paypalOrderId: text("paypal_order_id"),
  paypalCaptureId: text("paypal_capture_id"),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  gateway: text("gateway", { enum: ["paypal", "stripe", "free"] }).notNull().default("paypal"),
  createdAt: text("created_at").notNull(),
  paidAt: text("paid_at"),
  paymentFailureDetails: text("payment_failure_details"),
  githubUsername: text("github_username"),
  githubAccessStatus: text("github_access_status", {
    enum: ["not_required", "pending", "invited", "existing", "revoked", "error"],
  })
    .notNull()
    .default("not_required"),
  githubAccessManaged: integer("github_access_managed", { mode: "boolean" })
    .notNull()
    .default(false),
  githubInvitationId: text("github_invitation_id"),
  githubAccessError: text("github_access_error"),
  githubAccessGrantedAt: text("github_access_granted_at"),
    githubAccessRevokedAt: text("github_access_revoked_at"),
  },
  (table) => [
    index("orders_user_store_environment_created_idx").on(
      table.userId,
      table.storeId,
      table.environment,
      table.createdAt,
    ),
    index("orders_paypal_order_environment_idx").on(
      table.paypalOrderId,
      table.environment,
    ),
    index("orders_paypal_capture_environment_idx").on(
      table.paypalCaptureId,
      table.environment,
    ),
    index("orders_customer_environment_status_created_idx").on(
      sql`lower(${table.customerEmail})`,
      table.environment,
      table.status,
      table.createdAt,
    ),
    index("orders_reminder_purchase_lookup_idx").on(
      table.storeId,
      table.productId,
      sql`lower(${table.customerEmail})`,
      table.status,
      table.createdAt,
    ),
  ],
);

export const checkoutReminders = sqliteTable(
  "checkout_reminders",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    environment: text("environment", { enum: ["sandbox", "live"] })
      .notNull()
      .default("sandbox"),
    customerEmail: text("customer_email").notNull(),
    customerName: text("customer_name"),
    productName: text("product_name").notNull(),
    checkoutUrl: text("checkout_url").notNull(),
    dueAt: text("due_at").notNull(),
    sentAt: text("sent_at"),
    cancelledAt: text("cancelled_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("checkout_reminders_store_product_environment_email_idx").on(
      table.storeId,
      table.productId,
      table.environment,
      table.customerEmail,
    ),
    index("checkout_reminders_due_idx").on(
      table.dueAt,
      table.sentAt,
      table.cancelledAt,
    ),
  ],
);

export const campaignDeliveries = sqliteTable(
  "campaign_deliveries",
  {
    id: text("id").primaryKey(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => featureRecords.id, { onDelete: "cascade" }),
    subscriberId: text("subscriber_id"),
    email: text("email").notNull(),
    openedAt: text("opened_at"),
    clickedAt: text("clicked_at"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("campaign_deliveries_campaign_idx").on(table.campaignId),
    index("campaign_deliveries_email_idx").on(table.email),
  ],
);

export const appLicenses = sqliteTable("app_licenses", {
  id: text("id").primaryKey(),
  licenseKeyEncrypted: text("license_key_encrypted").notNull(),
  licenseKeyPrefix: text("license_key_prefix").notNull(),
  instanceId: text("instance_id").notNull().unique(),
  status: text("status", {
    enum: ["active", "invalid", "expired", "deactivated"],
  })
    .notNull()
    .default("active"),
  plan: text("plan").notNull().default("pro"),
  features: text("features").notNull().default("[]"),
  manageUrl: text("manage_url"),
  expiresAt: text("expires_at"),
  lastValidatedAt: text("last_validated_at"),
  validationError: text("validation_error"),
  activatedAt: text("activated_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const githubConnections = sqliteTable("github_connections", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  githubUserId: text("github_user_id").notNull(),
  login: text("login").notNull(),
  accessTokenEncrypted: text("access_token_encrypted").notNull(),
  scopes: text("scopes").notNull().default(""),
  connectedAt: text("connected_at").notNull(),
});

export const paypalConnections = sqliteTable(
  "paypal_connections",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientId: text("client_id").notNull(),
    clientSecretEncrypted: text("client_secret_encrypted").notNull(),
    mode: text("mode", { enum: ["sandbox", "live"] }).notNull().default("sandbox"),
    merchantEmail: text("merchant_email"),
    webhookId: text("webhook_id"),
    webhookUrl: text("webhook_url"),
    webhookStatus: text("webhook_status", {
      enum: ["not_configured", "active", "manual_required", "error"],
    })
      .notNull()
      .default("not_configured"),
    webhookError: text("webhook_error"),
    connectedAt: text("connected_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.mode] }),
  ]
);

export const stripeConnections = sqliteTable(
  "stripe_connections",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    secretKeyEncrypted: text("secret_key_encrypted").notNull(),
    webhookSecretEncrypted: text("webhook_secret_encrypted"),
    accountId: text("account_id").notNull(),
    mode: text("mode", { enum: ["sandbox", "live"] }).notNull().default("sandbox"),
    connectedAt: text("connected_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.mode] }),
  ]
);

export const featureRecords = sqliteTable(
  "feature_records",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    environment: text("environment", { enum: ["sandbox", "live"] })
      .notNull()
      .default("sandbox"),
    feature: text("feature").notNull(),
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    status: text("status").notNull().default("active"),
    data: text("data").notNull().default("{}"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("feature_records_user_feature_idx").on(
      table.userId,
      table.feature
    ),
    index("feature_records_user_feature_environment_created_idx").on(
      table.userId,
      table.feature,
      table.environment,
      table.createdAt,
    ),
    index("feature_records_customer_portal_idx").on(
      sql`lower(${table.subtitle})`,
      table.environment,
      table.feature,
      table.updatedAt,
    ),
    index("feature_records_paypal_subscription_idx").on(
      table.feature,
      table.environment,
      sql`json_extract(${table.data}, '$.paypalSubscriptionId')`,
    ),
  ]
);

export const apiKeys = sqliteTable(
  "api_keys",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    keyPrefix: text("key_prefix").notNull(),
    keyHash: text("key_hash").notNull().unique(),
    lastUsedAt: text("last_used_at"),
    expiresAt: text("expires_at"),
    revokedAt: text("revoked_at"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("api_keys_user_idx").on(table.userId)]
);

export const webhooks = sqliteTable(
  "webhooks",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    environment: text("environment", { enum: ["sandbox", "live"] })
      .notNull()
      .default("sandbox"),
    name: text("name").notNull(),
    url: text("url").notNull(),
    productId: text("product_id").references(() => products.id, {
      onDelete: "cascade",
    }),
    authEncrypted: text("auth_encrypted"),
    events: text("events").notNull().default("[]"),
    status: text("status", { enum: ["active", "paused"] })
      .notNull()
      .default("active"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("webhooks_user_store_environment_idx").on(
      table.userId,
      table.storeId,
      table.environment,
    ),
  ],
);

export const webhookDeliveries = sqliteTable(
  "webhook_deliveries",
  {
    id: text("id").primaryKey(),
    webhookId: text("webhook_id")
      .notNull()
      .references(() => webhooks.id, { onDelete: "cascade" }),
    eventName: text("event_name").notNull(),
    status: text("status", { enum: ["pending", "success", "failed"] })
      .notNull()
      .default("pending"),
    requestBody: text("request_body").notNull(),
    responseStatus: integer("response_status"),
    responseBody: text("response_body"),
    error: text("error"),
    durationMs: integer("duration_ms"),
    createdAt: text("created_at").notNull(),
    completedAt: text("completed_at"),
  },
  (table) => [
    index("webhook_deliveries_webhook_created_idx").on(
      table.webhookId,
      table.createdAt,
    ),
  ],
);

export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    environment: text("environment", { enum: ["sandbox", "live"] })
      .notNull()
      .default("sandbox"),
    type: text("type").notNull(),
    title: text("title").notNull(),
    message: text("message"),
    href: text("href"),
    sourceKey: text("source_key").notNull(),
    readAt: text("read_at"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("notifications_user_created_idx").on(
      table.userId,
      table.createdAt
    ),
    index("notifications_user_read_idx").on(table.userId, table.readAt),
    uniqueIndex("notifications_user_environment_source_idx").on(
      table.userId,
      table.environment,
      table.sourceKey
    ),
  ]
);

export const customerAccounts = sqliteTable("customer_accounts", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  avatarImageUrl: text("avatar_image_url"),
  passwordHash: text("password_hash"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const customerEmailPreferences = sqliteTable(
  "customer_email_preferences",
  {
    id: text("id").primaryKey(),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    marketingEnabled: integer("marketing_enabled", { mode: "boolean" })
      .notNull()
      .default(true),
    productUpdatesEnabled: integer("product_updates_enabled", {
      mode: "boolean",
    })
      .notNull()
      .default(true),
    affiliateUpdatesEnabled: integer("affiliate_updates_enabled", {
      mode: "boolean",
    })
      .notNull()
      .default(true),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("customer_email_preferences_store_email_unique").on(
      table.storeId,
      table.email,
    ),
    index("customer_email_preferences_email_idx").on(sql`lower(${table.email})`),
  ],
);

export const customerAccessTokens = sqliteTable(
  "customer_access_tokens",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customerAccounts.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: text("expires_at").notNull(),
    usedAt: text("used_at"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("customer_access_tokens_customer_idx").on(table.customerId),
    index("customer_access_tokens_expiry_idx").on(table.expiresAt),
  ]
);

export const visitorEvents = sqliteTable(
  "visitor_events",
  {
    id: text("id").primaryKey(),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    visitorId: text("visitor_id").notNull(),
    path: text("path").notNull(),
    source: text("source").notNull(),
    device: text("device").notNull(),
    os: text("os").notNull(),
    city: text("city").notNull(),
    country: text("country").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("visitor_events_store_created_idx").on(
      table.storeId,
      table.createdAt,
    ),
    index("visitor_events_store_visitor_idx").on(
      table.storeId,
      table.visitorId,
    ),
  ],
);
