import type { ProductFile } from "./product-files.types";
import type { Order } from "./types";
import type { LicenseAuthorityActivation } from "./app-license.types";
import type { ProductExtraSeatTier } from "./extra-seats.types";

export interface CustomerPortalLicense {
  key: string;
  status: string;
  expiresAt?: string;
  type: "standard" | "perpetual";
  perpetual: boolean;
  updatesExpireAt?: string;
  updatesActive: boolean;
  seatLimit: number | null;
  activations: LicenseAuthorityActivation[];
}

export interface CustomerPortalSeatAddOn {
  productId: string;
  storeId: string;
  /** Email of the original purchase; the add-on checkout is locked to it. */
  customerEmail: string;
  transactionFeeType: "fixed" | "percentage";
  transactionFeeValue: number;
  paypalClientId?: string;
  stripeEnabled: boolean;
  mode: "sandbox" | "live";
  label: string;
  tiers: ProductExtraSeatTier[];
  /** Extra seats the license already has. */
  currentExtraSeats: number;
}

export interface CustomerPortalBranding {
  storeName: string;
  storeSlug: string;
  storeLogoImageUrl?: string;
}

export interface CustomerPortalPurchase {
  id: string;
  productName: string;
  productDescription: string;
  productImageUrl?: string;
  productPrice: number;
  storeName: string;
  storeLogoImageUrl?: string;
  amount: number;
  currency: string;
  status: string;
  discountCode?: string;
  discountAmount: number;
  transactionFeeAmount: number;
  gateway: "paypal" | "stripe" | "free";
  environment: "sandbox" | "live";
  paypalOrderId?: string;
  paypalCaptureId?: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  createdAt: string;
  paidAt?: string;
  deliveryContent?: string;
  productFiles: ProductFile[];
  license?: CustomerPortalLicense;
  /** Set when the customer can buy more seats for this license. */
  seatAddOn?: CustomerPortalSeatAddOn;
  githubRepository?: string;
  githubUsername?: string;
  githubAccessStatus?: Order["githubAccessStatus"];
  githubAccessError?: string;
  affiliateProgramEnabled: boolean;
}

export interface CustomerPortalSubscription {
  id: string;
  planName: string;
  storeName: string;
  storeLogoImageUrl?: string;
  status: string;
  amount?: number;
  interval?: string;
  trialDays?: number;
  trialEndsAt?: string;
  nextBillingAt?: string;
  updatedAt: string;
  affiliateProgramEnabled: boolean;
}

export interface CustomerPortalData {
  purchases: CustomerPortalPurchase[];
  subscriptions: CustomerPortalSubscription[];
  affiliatesEnabled: boolean;
  branding?: CustomerPortalBranding;
}
