import type { LicenseAuthorityActivation } from "./app-license.types";

export function parseLicenseActivations(
  value: unknown,
): LicenseAuthorityActivation[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((activation) => {
    if (!activation || typeof activation !== "object") return [];
    const item = activation as Partial<LicenseAuthorityActivation>;
    return typeof item.instanceId === "string" &&
      typeof item.instanceUrl === "string" &&
      typeof item.appVersion === "string" &&
      typeof item.activatedAt === "string" &&
      typeof item.lastSeenAt === "string"
      ? [item as LicenseAuthorityActivation]
      : [];
  });
}

export function parseLicenseSeatLimit(value: unknown): number | null {
  if (value === null || value === "unlimited") return null;
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : Number.NaN;
  return Number.isFinite(numericValue) && numericValue >= 1
    ? Math.floor(numericValue)
    : 1;
}
