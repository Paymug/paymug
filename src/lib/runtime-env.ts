import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import type {
  RuntimeConfiguration,
  RuntimeEnvironment,
  RuntimeEnvironmentKey,
} from "./runtime-env.types";

const runtimeEnvironmentKeys: RuntimeEnvironmentKey[] = [
  "AUTH_SECRET",
  "ENCRYPTION_SECRET",
  "NEXT_PUBLIC_APP_URL",
  "EMAIL_FROM",
  "EMAIL_REPLY_TO",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET"
];

export async function getRuntimeConfiguration(): Promise<RuntimeConfiguration> {
  let cloudflareEnvironment: Record<string, unknown> = {};
  try {
    const { env } = await getCloudflareContext({ async: true });
    cloudflareEnvironment = env as unknown as Record<string, unknown>;
  } catch {
    cloudflareEnvironment = {};
  }

  const values = runtimeEnvironmentKeys.reduce<RuntimeEnvironment>(
    (configuration, key) => {
      const processValue = process.env[key]?.trim();
      const cloudflareValue = cloudflareEnvironment[key];
      configuration[key] =
        processValue ||
        (typeof cloudflareValue === "string"
          ? cloudflareValue.trim() || undefined
          : undefined);
      return configuration;
    },
    {} as RuntimeEnvironment
  );

  return {
    values,
    bindings: {
      database: Boolean(cloudflareEnvironment.DB),
      email: Boolean(cloudflareEnvironment.EMAIL),
      storage: Boolean(cloudflareEnvironment.PRODUCT_FILES),
    },
  };
}

export async function getRuntimeEnvValue(
  key: RuntimeEnvironmentKey
): Promise<string | undefined> {
  return (await getRuntimeConfiguration()).values[key];
}

export async function getRequiredRuntimeEnvValue(
  key: RuntimeEnvironmentKey
): Promise<string> {
  const value = await getRuntimeEnvValue(key);
  if (!value) {
    throw new Error(`${key} is not configured`);
  }
  return value;
}

export async function getRuntimeAbsoluteUrl(
  path: string,
  requestUrl: string
): Promise<string> {
  const configuredOrigin = await getRuntimeEnvValue("NEXT_PUBLIC_APP_URL");
  const origin = configuredOrigin || getTrustedRequestOrigin(requestUrl);
  return `${origin.replace(/\/$/, "")}${
    path.startsWith("/") ? path : `/${path}`
  }`;
}

function getTrustedRequestOrigin(requestUrl: string): string {
  const url = new URL(requestUrl);
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    hostname !== "localhost" &&
    hostname !== "127.0.0.1" &&
    hostname !== "::1"
  ) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL is not configured; refusing to build a URL from the request origin"
    );
  }
  return url.origin;
}
