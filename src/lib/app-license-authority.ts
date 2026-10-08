import "server-only";

import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { featureRecords } from "@/db/schema";
import { proFeatures } from "./app-license.config";
import {
  parseLicenseActivations,
  parseLicenseSeatLimit,
} from "./license-activations.utils";
import { getRuntimeAbsoluteUrl } from "./runtime-env";
import type {
  LicenseAuthorityActivation,
  LicenseAuthorityDeactivationRequest,
  LicenseAuthorityRequest,
  LicenseAuthorityResponse,
  LicenseAuthoritySeats,
} from "./app-license.types";

function parseLicenseData(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function getAuthorityLicense(licenseKey: string) {
  const db = await getDb();
  return db.query.featureRecords.findFirst({
    where: sql`${featureRecords.feature} = 'licenses' AND lower(${featureRecords.title}) = ${licenseKey.trim().toLowerCase()}`,
  });
}

async function getAuthorityLicenseError(
  license: typeof featureRecords.$inferSelect,
  data: Record<string, unknown>,
  productId: string,
): Promise<string | undefined> {
  if (license.environment !== "live") {
    return "This license was issued in test mode and cannot activate Paymug Pro";
  }
  return String(data.productId || "") === productId
    ? undefined
    : "This license is not for this application";
}

function getLicenseState(
  status: string,
  data: Record<string, unknown>,
): "active" | "invalid" | "expired" {
  if (status !== "active") return "invalid";
  const expiresAt =
    typeof data.expiresAt === "string" ? data.expiresAt : undefined;
  return expiresAt && new Date(expiresAt).getTime() <= Date.now()
    ? "expired"
    : "active";
}

function getSeatInfo(
  data: Record<string, unknown>,
  activationCount: number,
): LicenseAuthoritySeats {
  const seatLimit = parseLicenseSeatLimit(data.seatLimit);
  return {
    seatLimit,
    seatsUsed: activationCount,
    seatsRemaining:
      seatLimit === null ? null : Math.max(seatLimit - activationCount, 0),
  };
}

async function createAuthorityResponse(
  requestUrl: string,
  state: "active" | "invalid" | "expired" | "deactivated",
  expiresAt?: string,
  error?: string,
  instanceId?: string,
  seats?: LicenseAuthoritySeats,
): Promise<LicenseAuthorityResponse> {
  return {
    valid: state === "active",
    state,
    plan: "pro",
    features: state === "active" ? proFeatures : [],
    manageUrl: await getRuntimeAbsoluteUrl("/customer", requestUrl),
    instanceId,
    expiresAt,
    error,
    ...seats,
  };
}

export async function activateAuthorityLicense(
  input: LicenseAuthorityRequest,
  requestUrl: string,
): Promise<LicenseAuthorityResponse> {
  const db = await getDb();
  const license = await getAuthorityLicense(input.licenseKey);
  if (!license) {
    return createAuthorityResponse(
      requestUrl,
      "invalid",
      undefined,
      "License key not found",
    );
  }
  const data = parseLicenseData(license.data);
  const authorityError = await getAuthorityLicenseError(
    license,
    data,
    input.productId,
  );
  if (authorityError) {
    return createAuthorityResponse(
      requestUrl,
      "invalid",
      undefined,
      authorityError,
    );
  }
  const expiresAt =
    typeof data.expiresAt === "string" ? data.expiresAt : undefined;
  const state = getLicenseState(license.status, data);
  const activations = parseLicenseActivations(data.appActivations);
  const currentSeats = getSeatInfo(data, activations.length);
  if (state !== "active") {
    return createAuthorityResponse(
      requestUrl,
      state,
      expiresAt,
      state === "expired" ? "License has expired" : "License is not active",
      undefined,
      currentSeats,
    );
  }
  const seatLimit = parseLicenseSeatLimit(data.seatLimit);
  const existing = activations.find(
    (activation) => activation.instanceId === input.instanceId,
  );
  if (!existing && seatLimit !== null && activations.length >= seatLimit) {
    return createAuthorityResponse(
      requestUrl,
      "invalid",
      expiresAt,
      `License seat limit reached (${seatLimit})`,
      undefined,
      currentSeats,
    );
  }
  const now = new Date().toISOString();
  const nextActivation: LicenseAuthorityActivation = {
    instanceId: input.instanceId,
    instanceUrl: input.instanceUrl,
    appVersion: input.appVersion,
    activatedAt: existing?.activatedAt || now,
    lastSeenAt: now,
  };
  const nextActivations = existing
    ? activations.map((activation) =>
        activation.instanceId === input.instanceId
          ? nextActivation
          : activation,
      )
    : [...activations, nextActivation];
  await db
    .update(featureRecords)
    .set({
      data: JSON.stringify({
        ...data,
        appActivations: nextActivations,
      }),
      updatedAt: now,
    })
    .where(eq(featureRecords.id, license.id));
  return createAuthorityResponse(
    requestUrl,
    "active",
    expiresAt,
    undefined,
    input.instanceId,
    getSeatInfo(data, nextActivations.length),
  );
}

export async function validateAuthorityLicense(
  input: LicenseAuthorityRequest,
  requestUrl: string,
): Promise<LicenseAuthorityResponse> {
  const license = await getAuthorityLicense(input.licenseKey);
  if (!license) {
    return createAuthorityResponse(
      requestUrl,
      "invalid",
      undefined,
      "License key not found",
    );
  }
  const data = parseLicenseData(license.data);
  const authorityError = await getAuthorityLicenseError(
    license,
    data,
    input.productId,
  );
  if (authorityError) {
    return createAuthorityResponse(
      requestUrl,
      "invalid",
      undefined,
      authorityError,
    );
  }
  const expiresAt =
    typeof data.expiresAt === "string" ? data.expiresAt : undefined;
  const state = getLicenseState(license.status, data);
  const activations = parseLicenseActivations(data.appActivations);
  const seats = getSeatInfo(data, activations.length);
  if (state !== "active") {
    return createAuthorityResponse(
      requestUrl,
      state,
      expiresAt,
      undefined,
      undefined,
      seats,
    );
  }
  const activation = activations.find(
    (item) => item.instanceId === input.instanceId,
  );
  if (!activation) {
    return createAuthorityResponse(
      requestUrl,
      "invalid",
      expiresAt,
      "License is not activated for this installation",
      undefined,
      seats,
    );
  }
  return activateAuthorityLicense(input, requestUrl);
}

export async function deactivateAuthorityLicense(
  input: LicenseAuthorityDeactivationRequest,
  requestUrl: string,
): Promise<LicenseAuthorityResponse> {
  const db = await getDb();
  const licenses = await db.query.featureRecords.findMany({
    where: sql`${featureRecords.feature} = 'licenses' AND ${featureRecords.environment} = 'live'`,
  });
  const license = licenses.find((record) => {
    const data = parseLicenseData(record.data);
    return (
      String(data.productId || "") === input.productId &&
      parseLicenseActivations(data.appActivations).some(
        (activation) => activation.instanceId === input.instanceId,
      )
    );
  });
  if (!license) {
    return createAuthorityResponse(
      requestUrl,
      "deactivated",
      undefined,
      undefined,
      input.instanceId,
    );
  }
  const data = parseLicenseData(license.data);
  const activations = parseLicenseActivations(data.appActivations).filter(
    (activation) => activation.instanceId !== input.instanceId,
  );
  await db
    .update(featureRecords)
    .set({
      data: JSON.stringify({ ...data, appActivations: activations }),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(featureRecords.id, license.id));
  return createAuthorityResponse(
    requestUrl,
    "deactivated",
    undefined,
    undefined,
    input.instanceId,
  );
}
