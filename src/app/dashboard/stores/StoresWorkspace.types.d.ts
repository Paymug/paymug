import type { Store } from "@/lib/types";

export interface StoresWorkspaceProps {
  initialStores: Store[];
  activeStoreId: string;
  primaryStoreId: string;
}

export interface StoresApiResponse {
  store?: Store;
  error?: string;
}
