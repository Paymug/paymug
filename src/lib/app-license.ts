import "server-only";

import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import packageJson from "../../package.json";
import { getDb } from "@/db";
import { appLicenses } from "@/db/schema";
import { decryptSecret, encryptSecret } from "./crypto";
import { getRuntimeEnvValue } from "./runtime-env";
import { appLicenseProductId, proFeatures } from "./app-license.config";
import type {
  AppLicenseStatus,
  LicenseAuthorityResponse,
  ProFeature,
} from "./app-license.types";

const licenseRowId = "paymug-pro";
const validationCacheMs = 6 * 60 * 60 * 1000;
const offlineGraceMs = 7 * 24 * 60 * 60 * 1000;

function parseFeatures(value: string): ProFeature[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((feature): feature is ProFeature =>
          proFeatures.includes(feature as ProFeature),
        )
      : [];
  } catch {
    return [];
  }
}

function mapLicenseRow(
  row: typeof appLicenses.$inferSelect,
): AppLicenseStatus {
  const features = parseFeatures(row.features);
  const locallyExpired = Boolean(
    row.expiresAt && new Date(row.expiresAt).getTime() <= Date.now(),
  );
  const active = row.status === "active" && !locallyExpired;
  return {
    state: locallyExpired ? "expired" : row.status,
    pro: active && features.length > 0,
    plan: active ? "pro" : "free",
    features,
    licenseKeyPrefix: row.licenseKeyPrefix,
    instanceId: row.instanceId,
    manageUrl: row.manageUrl || undefined,
    expiresAt: row.expiresAt || undefined,
    lastValidatedAt: row.lastValidatedAt || undefined,
    validationError: row.validationError || undefined,
  };
}

function getLicenseApiUrl() {
  return "https://api.paymug.co";
}

async function requestLicenseAuthority(
  action: "activate" | "validate" | "deactivate",
  licenseKey: string,
  instanceId: string,
): Promise<LicenseAuthorityResponse> {
  const instanceUrl = (await getRuntimeEnvValue("NEXT_PUBLIC_APP_URL")) || "";
  console.log("requestLicenseAuthority", `${getLicenseApiUrl()}/v1/licenses/${action}`)
  const response = await fetch(
    `${getLicenseApiUrl()}/v1/licenses/${action}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        licenseKey,
        productId: appLicenseProductId,
        instanceId,
        instanceUrl,
        appVersion: packageJson.version,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    },
  );
  const responseBody = await response.text();
  let result: LicenseAuthorityResponse;
  try {
    result = JSON.parse(responseBody) as LicenseAuthorityResponse;
  } catch {
    throw new Error(
      response.ok
        ? "License service returned an invalid response"
        : `License service is unavailable (${response.status})`,
    );
  }
  if (!response.ok && !result.state) {
    throw new Error(result.error || "License service rejected the request");
  }
  return result;
}

export async function getAppLicenseStatus(
  revalidate = true,
): Promise<AppLicenseStatus> {
  const db = await getDb();
  const row = await db.query.appLicenses.findFirst({
    where: eq(appLicenses.id, licenseRowId),
  });
  if (!row) {
    return { state: "free", pro: false, plan: "free", features: [] };
  }
  const lastValidatedAt = row.lastValidatedAt
    ? new Date(row.lastValidatedAt).getTime()
    : 0;
  if (!revalidate || Date.now() - lastValidatedAt < validationCacheMs) {
    return mapLicenseRow(row);
  }
  try {
    const licenseKey = await decryptSecret(row.licenseKeyEncrypted);
    const result = await requestLicenseAuthority(
      "validate",
      licenseKey,
      row.instanceId,
    );
    const now = new Date().toISOString();
    await db
      .update(appLicenses)
      .set({
        status: result.state,
        plan: result.plan,
        features: JSON.stringify(result.features),
        manageUrl: result.manageUrl,
        expiresAt: result.expiresAt || null,
        lastValidatedAt: now,
        validationError: result.error || null,
        updatedAt: now,
      })
      .where(eq(appLicenses.id, licenseRowId));
    return {
      ...mapLicenseRow({
        ...row,
        status: result.state,
        plan: result.plan,
        features: JSON.stringify(result.features),
        manageUrl: result.manageUrl,
        expiresAt: result.expiresAt || null,
        lastValidatedAt: now,
        validationError: result.error || null,
        updatedAt: now,
      }),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "License validation failed";
    await db
      .update(appLicenses)
      .set({ validationError: message, updatedAt: new Date().toISOString() })
      .where(eq(appLicenses.id, licenseRowId));
    if (
      row.status === "active" &&
      lastValidatedAt > 0 &&
      Date.now() - lastValidatedAt <= offlineGraceMs
    ) {
      return { ...mapLicenseRow(row), validationError: message };
    }
    return {
      ...mapLicenseRow(row),
      state: "invalid",
      pro: false,
      plan: "free",
      validationError: message,
    };
  }
}

export async function activateAppLicense(
  licenseKey: string,
): Promise<AppLicenseStatus> {
  const db = await getDb();
  const existing = await db.query.appLicenses.findFirst({
    where: eq(appLicenses.id, licenseRowId),
  });
  const instanceId = existing?.instanceId || randomUUID();
  const result = await requestLicenseAuthority(
    "activate",
    licenseKey.trim(),
    instanceId,
  );
  if (!result.valid) throw new Error(result.error || "License is not valid");
  const now = new Date().toISOString();
  const values = {
    id: licenseRowId,
    licenseKeyEncrypted: await encryptSecret(licenseKey.trim()),
    licenseKeyPrefix: `${licenseKey.trim().slice(0, 8)}…`,
    instanceId,
    status: result.state,
    plan: result.plan,
    features: JSON.stringify(result.features),
    manageUrl: result.manageUrl,
    expiresAt: result.expiresAt || null,
    lastValidatedAt: now,
    validationError: null,
    activatedAt: existing?.activatedAt || now,
    updatedAt: now,
  } as const;
  await db
    .insert(appLicenses)
    .values(values)
    .onConflictDoUpdate({ target: appLicenses.id, set: values });
  return getAppLicenseStatus(false);
}

export async function deactivateAppLicense(): Promise<AppLicenseStatus> {
  const db = await getDb();
  const row = await db.query.appLicenses.findFirst({
    where: eq(appLicenses.id, licenseRowId),
  });
  if (row) {
    try {
      await requestLicenseAuthority(
        "deactivate",
        await decryptSecret(row.licenseKeyEncrypted),
        row.instanceId,
      );
    } finally {
      await db.delete(appLicenses).where(eq(appLicenses.id, licenseRowId));
    }
  }
  return { state: "free", pro: false, plan: "free", features: [] };
}

export async function hasProFeature(feature: ProFeature): Promise<boolean> {
  const license = await getAppLicenseStatus();
  return license.pro && license.features.includes(feature);
}
