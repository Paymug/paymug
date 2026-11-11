export const apiKeyResources = [
  "products",
  "categories",
  "orders",
  "customers",
  "discounts",
  "licenses",
  "subscribers",
] as const;

export type ApiKeyResource = (typeof apiKeyResources)[number];
export type ApiKeyAction = "read" | "write" | "delete";
export type ApiKeyScope = `${ApiKeyResource}:${ApiKeyAction}`;

/** Actions each resource supports. Orders are read-only through the API. */
export const apiKeyResourceActions: Record<ApiKeyResource, ApiKeyAction[]> = {
  products: ["read", "write", "delete"],
  categories: ["read", "write", "delete"],
  orders: ["read"],
  customers: ["read", "write", "delete"],
  discounts: ["read", "write", "delete"],
  licenses: ["read", "write", "delete"],
  subscribers: ["read", "write", "delete"],
};

export const allApiKeyScopes: ApiKeyScope[] = apiKeyResources.flatMap(
  (resource) =>
    apiKeyResourceActions[resource].map(
      (action) => `${resource}:${action}` as ApiKeyScope
    )
);

const scopeSet = new Set<string>(allApiKeyScopes);

export function isApiKeyScope(value: unknown): value is ApiKeyScope {
  return typeof value === "string" && scopeSet.has(value);
}

/** Drops unknown scopes, and adds `read` to any resource granted write/delete. */
export function normalizeApiKeyScopes(values: readonly string[]): ApiKeyScope[] {
  const granted = new Set<ApiKeyScope>(values.filter(isApiKeyScope));
  for (const scope of [...granted]) {
    const [resource, action] = scope.split(":") as [ApiKeyResource, ApiKeyAction];
    if (action !== "read") granted.add(`${resource}:read`);
  }
  return allApiKeyScopes.filter((scope) => granted.has(scope));
}

export function parseApiKeyScopes(value: string | null | undefined): string[] {
  try {
    const parsed: unknown = JSON.parse(value || "[]");
    return Array.isArray(parsed)
      ? normalizeApiKeyScopes(parsed.filter((v) => typeof v === "string"))
      : [];
  } catch {
    return [];
  }
}

export function hasApiKeyScope(
  scopes: readonly string[],
  resource: ApiKeyResource,
  action: ApiKeyAction
): boolean {
  return scopes.includes(`${resource}:${action}`);
}
