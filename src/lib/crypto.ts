import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { getRequiredRuntimeEnvValue } from "./runtime-env";

async function getKey(): Promise<Buffer> {
  const secret = await getRequiredRuntimeEnvValue("ENCRYPTION_SECRET");
  return createHash("sha256").update(secret).digest();
}

function decryptWithKey(
  encryptedPayload: Buffer,
  key: Buffer
): string {
  const iv = encryptedPayload.subarray(0, 12);
  const tag = encryptedPayload.subarray(12, 28);
  const encrypted = encryptedPayload.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
}

/** Encrypt a payment or integration secret for at-rest storage. */
export async function encryptSecret(plaintext: string): Promise<string> {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", await getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export async function decryptSecret(payload: string): Promise<string> {
  const buf = Buffer.from(payload, "base64");
  const primaryKey = await getKey();
  return decryptWithKey(buf, primaryKey);
}
