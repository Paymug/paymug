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

export interface DashboardOrderItem {
  id: string;
  productName: string;
  productDescription?: string;
  productPrice: number;
  amount: number;
  currency: string;
  status: OrderStatus;
  customerEmail: string;
  customerName: string;
  customerAvatarUrl?: string;
  discountCode?: string;
  discountAmount: number;
  transactionFeeAmount: number;
  gateway: OrderGateway;
  environment: "sandbox" | "live";
  createdAt: string;
  paidAt?: string;
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
