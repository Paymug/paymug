import type { Store } from "@/lib/types";

export interface StoresWorkspaceProps {
  initialStores: Store[];
  activeStoreId: string;
}

export interface StoresApiResponse {
  store?: Store;
  error?: string;
}
