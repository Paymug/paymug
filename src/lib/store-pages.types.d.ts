import type { PayPalMode } from "./types";

export type StorePageNavigation = "none" | "top" | "footer";
export type StorePageStatus = "draft" | "published";

export interface StorePage {
  id: string;
  userId: string;
  storeId: string;
  environment: PayPalMode;
  title: string;
  description: string;
  slug: string;
  coverImageUrl?: string;
  content: string;
  navigation: StorePageNavigation;
  navigationLabel: string;
  status: StorePageStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StorePageInput {
  title: string;
  slug: string;
  description: string;
  coverImageUrl?: string;
  content: string;
  navigation: StorePageNavigation;
  navigationLabel: string;
  status: StorePageStatus;
}
