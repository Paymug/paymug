import "server-only";

import { createHash, randomBytes } from "crypto";
import {
  hasApiKeyScope,
  normalizeApiKeyScopes,
  type ApiKeyAction,
  type ApiKeyResource,
} from "./api-key-scopes";
import { findApiKeyByHash, insertApiKey } from "./feature-records";
import { jsonError } from "./utils";
import type {
  ApiKeyRecord,
  CreatedApiKey,
} from "./feature-records.types";

export function hashApiKey(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export async function createApiKey(
  userId: string,
  name: string,
  scopes: readonly string[],
  expiresAt?: string
): Promise<CreatedApiKey> {
  const secret = `caf_${randomBytes(24).toString("base64url")}`;
  const keyPrefix = `${secret.slice(0, 11)}…`;
  const record = await insertApiKey({
    userId,
    name,
    keyPrefix,
    keyHash: hashApiKey(secret),
    scopes: normalizeApiKeyScopes(scopes),
    expiresAt,
  });
  return { record, secret };
}

export async function authenticateApiKey(
  request: Request
): Promise<ApiKeyRecord | undefined> {
  const authorization = request.headers.get("authorization");
  const secret = authorization?.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : request.headers.get("x-api-key")?.trim();
  if (!secret) return undefined;
  return findApiKeyByHash(hashApiKey(secret));
}

/**
 * Authenticates a request and checks the key grants `resource:action`.
 * Returns the key, or a ready-made 401/403 response.
 */
export async function authorizeApiKey(
  request: Request,
  resource: ApiKeyResource,
  action: ApiKeyAction
): Promise<{ apiKey: ApiKeyRecord } | { error: Response }> {
  const apiKey = await authenticateApiKey(request);
  if (!apiKey) {
    return { error: jsonError("Invalid or expired API key", 401) };
  }
  if (!hasApiKeyScope(apiKey.scopes, resource, action)) {
    return {
      error: jsonError(`API key lacks the ${resource}:${action} permission`, 403),
    };
  }
  return { apiKey };
}
