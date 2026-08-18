import { createHash, randomBytes } from "crypto";

export function createCustomerAccessToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashCustomerAccessToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
