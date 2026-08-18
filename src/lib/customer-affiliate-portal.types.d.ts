import type { ChartPoint } from "@/components/dashboard/charts.types";

export interface CustomerAffiliateReferral {
  id: string;
  orderId: string;
  amount: number;
  commission: number;
  status: string;
  createdAt: string;
}

export interface CustomerAffiliateAnalytics {
  clicks: number;
  processedPurchases: number;
  processedPurchaseAmount: number;
  totalEarnings: number;
  unpaidEarnings: number;
  payouts: number;
  conversionRate: number;
  purchaseSeries: ChartPoint[];
  clickSeries: ChartPoint[];
  recentPurchases: CustomerAffiliateReferral[];
  payoutReports: CustomerAffiliatePayout[];
}

export interface CustomerAffiliatePayout {
  id: string;
  amount: number;
  status: string;
  reference?: string;
  createdAt: string;
  paidAt?: string;
}

export interface CustomerAffiliateIdentity {
  id: string;
  name: string;
  status: string;
  code: string;
  trackingPath: string;
  rejectionMessage?: string;
  usernameLocked: boolean;
}

export interface CustomerAffiliateProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  imageUrl?: string;
}

export interface CustomerAffiliateProgram {
  storeId: string;
  storeUserId: string;
  storeName: string;
  storeSlug: string;
  storeDescription: string;
  storeLogoImageUrl?: string;
  currency: string;
  commissionType: "percentage" | "fixed";
  commissionValue: number;
  commissionDuration: "one_time" | "recurring";
  initialProductPriceCents: number;
  products: CustomerAffiliateProduct[];
  state: "available" | "pending" | "rejected" | "active";
  affiliate?: CustomerAffiliateIdentity;
  analytics?: CustomerAffiliateAnalytics;
}

export interface CustomerAffiliatePortalData {
  programs: CustomerAffiliateProgram[];
}
