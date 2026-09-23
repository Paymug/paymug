import type { LicenseAuthorityActivation } from "@/lib/app-license.types";
import type { OrderGateway, OrderStatus } from "@/lib/types";

export type CustomerEmailStatus = "subscribed" | "unsubscribed";

export interface CustomerOrderSummary {
  id: string;
  productName: string;
  amount: number;
  currency: string;
  status: OrderStatus;
  gateway: OrderGateway;
  createdAt: string;
  paidAt?: string;
  discountCode?: string;
  discountAmount: number;
}

export interface CustomerSubscriptionSummary {
  id: string;
  plan: string;
  status: string;
  amount: number;
  currency: string;
  intervalLabel?: string;
  updatedAt: string;
}

export interface CustomerLicenseSummary {
  id: string;
  key: string;
  product: string;
  status: string;
  seatLimit: number | null;
  issuedAt: string;
  orderId?: string;
  activations: LicenseAuthorityActivation[];
}

export type CustomerTimelineKind =
  | "order"
  | "payment"
  | "refund"
  | "payment_failed"
  | "subscription"
  | "license"
  | "account"
  | "email"
  | "abandonment";

export interface CustomerTimelineEvent {
  id: string;
  kind: CustomerTimelineKind;
  title: string;
  description?: string;
  amount?: number;
  currency?: string;
  at: string;
}

export interface CustomerSummary {
  email: string;
  name: string;
  avatarUrl?: string;
  firstSeen: string;
  emailStatus: CustomerEmailStatus;
  subscriptionsCount: number;
  ordersCount: number;
  mrr: number;
  revenue: number;
  isReturning: boolean;
  currency: string;
  city?: string;
  country?: string;
  orders: CustomerOrderSummary[];
  subscriptions: CustomerSubscriptionSummary[];
  licenses: CustomerLicenseSummary[];
  timeline: CustomerTimelineEvent[];
}

export interface CustomerRange {
  startDate: string;
  endDate: string;
}

export interface CustomersWorkspaceProps {
  customers: CustomerSummary[];
  currency: string;
  range: CustomerRange;
}

export interface CustomerActionsMenuProps {
  customer: CustomerSummary;
  onView(): void;
}

export interface CustomerActionsMenuPosition {
  left: number;
  top: number;
}

export interface CustomerDetailsDrawerProps {
  customer: CustomerSummary;
  onClose(): void;
}
