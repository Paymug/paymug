import "server-only";

import { createHash, randomBytes } from "crypto";
import { findApiKeyByHash, insertApiKey } from "./feature-records";
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
  expiresAt?: string
): Promise<CreatedApiKey> {
  const secret = `caf_${randomBytes(24).toString("base64url")}`;
  const keyPrefix = `${secret.slice(0, 11)}…`;
  const record = await insertApiKey({
    userId,
    name,
    keyPrefix,
    keyHash: hashApiKey(secret),
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
