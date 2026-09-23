import type { OrderStatus, OrderGateway } from "@/lib/types";
import type { ProductFile } from "@/lib/product-files.types";

export interface DashboardOrderLicense {
  key: string;
  status: string;
  expiresAt?: string;
  type: "standard" | "perpetual";
  perpetual: boolean;
  updatesExpireAt?: string;
  updatesActive: boolean;
}

export interface DashboardOrderTimelineEntry {
  id: string;
  status: OrderStatus;
  createdAt: string;
  paidAt?: string;
  amount: number;
  currency: string;
  gateway: OrderGateway;
  paymentFailureDetails?: string;
}

export interface DashboardOrderItem {
  id: string;
  productId: string;
  /** Total orders merged into this row (same customer + product). */
  orderCount?: number;
  timeline?: DashboardOrderTimelineEntry[];
  productName: string;
  productDescription?: string;
  productPrice: number;
  amount: number;
  currency: string;
  status: OrderStatus;
  customerEmail: string;
  customerName: string;
  customerAvatarUrl?: string;
  customerNote?: string;
  discountCode?: string;
  discountAmount: number;
  transactionFeeAmount: number;
  gateway: OrderGateway;
  environment: "sandbox" | "live";
  createdAt: string;
  paidAt?: string;
  paymentFailureDetails?: string;
  deliveryContent?: string;
  productFiles: ProductFile[];
  license?: DashboardOrderLicense;
  githubRepository?: string;
  githubUsername?: string;
  githubAccessStatus?: string;
}

export interface OrdersWorkspaceProps {
  orders: DashboardOrderItem[];
}
