import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/db";
import { users as usersTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { PayPalMode } from "./types";
import type {
  PayPalCredentialConfig,
  StripeCredentialConfig,
} from "./payment-credentials.types";

const paypalEnvKeys = {
  sandbox: {
    clientId: "PAYPAL_SANDBOX_CLIENT_ID",
    clientSecret: "PAYPAL_SANDBOX_CLIENT_SECRET",
  },
  live: {
    clientId: "PAYPAL_LIVE_CLIENT_ID",
    clientSecret: "PAYPAL_LIVE_CLIENT_SECRET",
  },
} as const;

const stripeEnvKeys = {
  sandbox: {
    secretKey: "STRIPE_SANDBOX_SECRET_KEY",
    webhookSecret: "STRIPE_SANDBOX_WEBHOOK_SECRET",
  },
  live: {
    secretKey: "STRIPE_LIVE_SECRET_KEY",
    webhookSecret: "STRIPE_LIVE_WEBHOOK_SECRET",
  },
} as const;

export function getPayPalRequiredEnvKeys(mode: PayPalMode): string[] {
  return Object.values(paypalEnvKeys[mode]);
}

export function getStripeRequiredEnvKeys(mode: PayPalMode): string[] {
  return Object.values(stripeEnvKeys[mode]);
}

async function readEnvValue(key: string): Promise<string | undefined> {
  let cloudflareEnvironment: Record<string, unknown> = {};
  try {
    const { env } = await getCloudflareContext({ async: true });
    cloudflareEnvironment = env as unknown as Record<string, unknown>;
  } catch {
    cloudflareEnvironment = {};
  }
  const processValue = process.env[key]?.trim();
  const cloudflareValue = cloudflareEnvironment[key];
  return (
    processValue ||
    (typeof cloudflareValue === "string"
      ? cloudflareValue.trim() || undefined
      : undefined)
  );
}

async function resolvePayPalMode(
  userId: string,
  mode?: PayPalMode
): Promise<PayPalMode> {
  if (mode === "sandbox" || mode === "live") return mode;
  const db = await getDb();
  const user = await db.query.users.findFirst({
    columns: { environment: true },
    where: eq(usersTable.id, userId),
  });
  return user?.environment ?? "sandbox";
}

export async function getPayPalCredentials(
  userId: string,
  mode?: PayPalMode,
  _storeId?: string
): Promise<PayPalCredentialConfig | undefined> {
  const selectedMode = await resolvePayPalMode(userId, mode);
  const keys = paypalEnvKeys[selectedMode];
  const [clientId, clientSecret] = await Promise.all([
    readEnvValue(keys.clientId),
    readEnvValue(keys.clientSecret),
  ]);
  if (!clientId || !clientSecret) return undefined;
  return {
    clientId,
    clientSecret,
    mode: selectedMode,
  };
}

export async function getStripeCredentials(
  userId: string,
  mode?: PayPalMode,
  _storeId?: string
): Promise<StripeCredentialConfig | undefined> {
  const selectedMode = await resolvePayPalMode(userId, mode);
  const keys = stripeEnvKeys[selectedMode];
  const [secretKey, webhookSecret] = await Promise.all([
    readEnvValue(keys.secretKey),
    readEnvValue(keys.webhookSecret),
  ]);
  if (!secretKey) return undefined;
  return {
    secretKey,
    webhookSecret,
    mode: selectedMode,
  };
}

export async function getPayPalEnvStatus(mode: PayPalMode): Promise<{
  clientId: string | undefined;
  configuredEnvVars: string[];
  missingEnvVars: string[];
}> {
  const keys = paypalEnvKeys[mode];
  const [clientId, clientSecret] = await Promise.all([
    readEnvValue(keys.clientId),
    readEnvValue(keys.clientSecret),
  ]);
  const configured = [
    [keys.clientId, Boolean(clientId)],
    [keys.clientSecret, Boolean(clientSecret)],
  ] as const;
  return {
    clientId,
    configuredEnvVars: configured
      .filter(([, ok]) => ok)
      .map(([name]) => name),
    missingEnvVars: configured
      .filter(([, ok]) => !ok)
      .map(([name]) => name),
  };
}

export async function getStripeEnvStatus(mode: PayPalMode): Promise<{
  secretKeyConfigured: boolean;
  webhookSecretConfigured: boolean;
  configuredEnvVars: string[];
  missingEnvVars: string[];
}> {
  const keys = stripeEnvKeys[mode];
  const [secretKey, webhookSecret] = await Promise.all([
    readEnvValue(keys.secretKey),
    readEnvValue(keys.webhookSecret),
  ]);
  const configured = [
    [keys.secretKey, Boolean(secretKey)],
    [keys.webhookSecret, Boolean(webhookSecret)],
  ] as const;
  return {
    secretKeyConfigured: Boolean(secretKey),
    webhookSecretConfigured: Boolean(webhookSecret),
    configuredEnvVars: configured
      .filter(([, ok]) => ok)
      .map(([name]) => name),
    missingEnvVars: configured
      .filter(([, ok]) => !ok)
      .map(([name]) => name),
  };
}
