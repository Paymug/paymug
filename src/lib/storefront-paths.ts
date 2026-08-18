import type { Store } from "./types";

export function getStorefrontBasePath(
  store: Store,
  primaryStore?: Store,
): string {
  return store.id === primaryStore?.id ? "" : `/s/${store.slug}`;
}
