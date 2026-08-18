import type {
  LicenseEntitlementSummary,
  LicenseProductSettings,
  LicenseRecord,
  LicenseUpdatePeriod,
} from "./license-entitlements.types";
import type {
  ProductLicenseUpdatePeriodUnit,
  ProductLicenseType,
} from "./types";

const maxUpdatePeriodCount: Record<ProductLicenseUpdatePeriodUnit, number> = {
  day: 3650,
  week: 520,
  month: 120,
  year: 10,
};

export function parseProductLicenseType(
  value: unknown
): ProductLicenseType {
  return value === "perpetual" ? "perpetual" : "standard";
}

export function parseLicenseUpdatePeriod(
  unitValue: unknown,
  countValue: unknown
): LicenseUpdatePeriod {
  const unit: ProductLicenseUpdatePeriodUnit =
    unitValue === "day" ||
    unitValue === "week" ||
    unitValue === "month" ||
    unitValue === "year"
      ? unitValue
      : "year";
  const count = Number(countValue);
  if (
    !Number.isInteger(count) ||
    count < 1 ||
    count > maxUpdatePeriodCount[unit]
  ) {
    throw new Error(
      `License update period must be between 1 and ${maxUpdatePeriodCount[unit]} ${unit}${maxUpdatePeriodCount[unit] === 1 ? "" : "s"}`
    );
  }
  return { unit, count };
}

export function isPerpetualLicenseProduct(
  product: LicenseProductSettings
): boolean {
  return (
    product.generateLicense &&
    product.licenseType === "perpetual"
  );
}

export function calculateLicenseUpdatesExpireAt(
  issuedAt: string,
  unit: ProductLicenseUpdatePeriodUnit,
  count: number
): string {
  const expiresAt = new Date(issuedAt);
  if (Number.isNaN(expiresAt.getTime())) {
    expiresAt.setTime(Date.now());
  }
  if (unit === "day") {
    expiresAt.setUTCDate(expiresAt.getUTCDate() + count);
  } else if (unit === "week") {
    expiresAt.setUTCDate(expiresAt.getUTCDate() + count * 7);
  } else if (unit === "month") {
    const originalDay = expiresAt.getUTCDate();
    expiresAt.setUTCDate(1);
    expiresAt.setUTCMonth(expiresAt.getUTCMonth() + count);
    const lastDayOfTargetMonth = new Date(
      Date.UTC(expiresAt.getUTCFullYear(), expiresAt.getUTCMonth() + 1, 0)
    ).getUTCDate();
    expiresAt.setUTCDate(Math.min(originalDay, lastDayOfTargetMonth));
  } else {
    const originalMonth = expiresAt.getUTCMonth();
    const originalDay = expiresAt.getUTCDate();
    expiresAt.setUTCDate(1);
    expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + count);
    expiresAt.setUTCMonth(originalMonth);
    const lastDayOfTargetMonth = new Date(
      Date.UTC(expiresAt.getUTCFullYear(), originalMonth + 1, 0)
    ).getUTCDate();
    expiresAt.setUTCDate(Math.min(originalDay, lastDayOfTargetMonth));
  }
  return expiresAt.toISOString();
}

export function extendLicenseUpdatesExpireAt(
  currentExpireAt: unknown,
  paidAt: string,
  unit: ProductLicenseUpdatePeriodUnit,
  count: number
): string {
  const current =
    typeof currentExpireAt === "string" ? new Date(currentExpireAt) : undefined;
  const paid = new Date(paidAt);
  const base =
    current && !Number.isNaN(current.getTime()) && current > paid
      ? current.toISOString()
      : paidAt;
  return calculateLicenseUpdatesExpireAt(base, unit, count);
}

export function formatLicenseUpdatePeriodLabel(
  unit: ProductLicenseUpdatePeriodUnit,
  count: number
): string {
  const normalizedCount = Math.max(1, count);
  const labels: Record<ProductLicenseUpdatePeriodUnit, [string, string]> = {
    day: ["day", "days"],
    week: ["week", "weeks"],
    month: ["month", "months"],
    year: ["year", "years"],
  };
  return `${normalizedCount} ${labels[unit][normalizedCount === 1 ? 0 : 1]}`;
}

export function getLicenseEntitlementSummary(
  license: LicenseRecord,
  now = new Date()
): LicenseEntitlementSummary {
  const type = parseProductLicenseType(license.data.licenseType);
  const perpetual = type === "perpetual";
  const updatesExpireAt =
    typeof license.data.updatesExpireAt === "string"
      ? license.data.updatesExpireAt
      : undefined;
  const activeStatus = license.status === "active";
  const usageExpiresAt =
    typeof license.data.expiresAt === "string"
      ? license.data.expiresAt
      : undefined;
  const usageActive =
    activeStatus &&
    (perpetual ||
      !usageExpiresAt ||
      new Date(usageExpiresAt).getTime() > now.getTime());
  const updatesActive =
    usageActive &&
    (!perpetual ||
      !updatesExpireAt ||
      new Date(updatesExpireAt).getTime() > now.getTime());
  return {
    type,
    perpetual,
    usageActive,
    updatesExpireAt,
    updatesActive,
  };
}

export function hasActiveLicenseUsage(
  license: LicenseRecord,
  now = new Date()
): boolean {
  return getLicenseEntitlementSummary(license, now).usageActive;
}

export function hasActiveLicenseUpdates(
  license: LicenseRecord,
  now = new Date()
): boolean {
  return getLicenseEntitlementSummary(license, now).updatesActive;
}
