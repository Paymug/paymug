import type { ProductFile } from "./product-files.types";
import type { CheckoutCustomData } from "./checkout-custom-data.types";

export type PayPalMode = "sandbox" | "live";
export type PaymentGateway = "paypal" | "stripe";
export type OrderGateway = "paypal" | "stripe" | "free";
export type AffiliateCommissionType = "percentage" | "fixed";
export type AffiliateCommissionDuration = "one_time" | "recurring";
export type AffiliateAttributionModel = "first_click" | "last_click";

export type ProductStatus = "draft" | "published";
export type ProductBillingType = "one_time" | "subscription";
export type ProductIntervalUnit = "week" | "month" | "year";
export type ProductLicenseUpdatePeriodUnit =
  | "day"
  | "week"
  | "month"
  | "year";
export type ProductLicenseType = "standard" | "perpetual";

export type OrderStatus = "pending" | "paid" | "failed" | "refunded";

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  storeName: string;
  storeSlug: string;
  storeCoverImageUrl?: string;
  storeEmailFrom?: string;
  storeEmailReplyTo?: string;
  activeStoreId: string;
  primaryStoreId: string;
  environment: PayPalMode;
  githubOAuthHostname?: string;
  createdAt: string;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  storeName: string;
  storeSlug: string;
  storeCoverImageUrl?: string;
  storeEmailFrom?: string;
  storeEmailReplyTo?: string;
  activeStoreId: string;
  primaryStoreId: string;
  environment: PayPalMode;
  createdAt: string;
}

export interface Store {
  id: string;
  userId: string;
  name: string;
  slug: string;
  description: string;
  logoImageUrl?: string;
  coverImageUrl?: string;
  emailFrom?: string;
  emailReplyTo?: string;
  paymentCredentialSourceStoreId?: string;
  paymentGateway: PaymentGateway;
  githubCredentialSourceStoreId?: string;
  affiliatesEnabled: boolean;
  affiliateCommissionType: AffiliateCommissionType;
  affiliateCommissionValue: number;
  affiliateCommissionDuration: AffiliateCommissionDuration;
  affiliateAttributionModel: AffiliateAttributionModel;
  emailCampaignsEnabled: boolean;
  abandonedCheckoutRemindersEnabled: boolean;
  analyticsEnabled: boolean;
  displayPurchasesEnabled: boolean;
  currency: string;
  transactionFeeType: "fixed" | "percentage";
  transactionFeeValue: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PayPalConnection {
  userId: string;
  clientId: string;
  /** AES-encrypted secret */
  clientSecretEncrypted: string;
  mode: PayPalMode;
  connectedAt: string;
  merchantEmail?: string;
  webhookId?: string;
  webhookUrl?: string;
  webhookStatus: "not_configured" | "active" | "manual_required" | "error";
  webhookError?: string;
}

export interface StripeConnection {
  userId: string;
  /** AES-encrypted Stripe secret key. */
  secretKeyEncrypted: string;
  webhookSecretEncrypted?: string;
  accountId: string;
  mode: PayPalMode;
  connectedAt: string;
}

export interface Product {
  id: string;
  userId: string;
  storeId: string;
  categoryId?: string;
  purchaseCount: number;
  environment: PayPalMode;
  name: string;
  slug: string;
  description: string;
  price: number; // cents
  transactionFeeType: "fixed" | "percentage";
  /** Fixed transaction fee in cents or percentage fee in basis points. */
  transactionFeeValue: number;
  currency: string;
  status: ProductStatus;
  imageUrl?: string;
  /** Optional delivery content (download link, license key text, etc.) */
  deliveryContent?: string;
  /** Optional destination shown after a completed purchase. */
  redirectUrl?: string;
  productFiles: ProductFile[];
  generateLicense: boolean;
  /** A perpetual license keeps usage active while updates expire separately. */
  licenseType: ProductLicenseType;
  licenseUpdatePeriodUnit?: ProductLicenseUpdatePeriodUnit | null;
  licenseUpdatePeriodCount: number;
  /** Maximum active devices, or null for unlimited devices. */
  licenseSeatLimit: number | null;
  /** One-time purchase or recurring subscription. */
  billingType: ProductBillingType;
  /** Allows one-time checkout links to override the default price. */
  customAmountEnabled: boolean;
  /** Billing period unit when billingType is subscription. */
  intervalUnit?: ProductIntervalUnit | null;
  /** Number of interval units per billing period (e.g. 2 weeks). */
  intervalCount: number;
  /** Free trial length in days (subscription only). */
  trialDays: number;
  githubRepoOwner?: string | null;
  githubRepoName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCategory {
  id: string;
  userId: string;
  storeId: string;
  name: string;
  slug: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  userId: string;
  storeId: string;
  productId: string;
  productName: string;
  productDescription?: string;
  productPrice?: number;
  deliveryContent?: string;
  productFiles: ProductFile[];
  githubRepoOwner?: string | null;
  githubRepoName?: string | null;
  amount: number; // cents
  currency: string;
  status: OrderStatus;
  customerEmail: string;
  customerName?: string;
  custom: CheckoutCustomData;
  discountCode?: string;
  discountAmount: number;
  transactionFeeAmount: number;
  affiliateId?: string;
  environment: PayPalMode;
  paypalOrderId?: string;
  paypalCaptureId?: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  gateway: OrderGateway;
  createdAt: string;
  paidAt?: string;
  paymentFailureDetails?: string | null;
  githubUsername?: string;
  githubAccessStatus:
    | "not_required"
    | "pending"
    | "invited"
    | "existing"
    | "revoked"
    | "error";
  githubAccessManaged: boolean;
  githubInvitationId?: string;
  githubAccessError?: string;
  githubAccessGrantedAt?: string;
  githubAccessRevokedAt?: string;
}

export interface GitHubConnection {
  userId: string;
  githubUserId: string;
  login: string;
  accessTokenEncrypted: string;
  scopes: string;
  connectedAt: string;
}
