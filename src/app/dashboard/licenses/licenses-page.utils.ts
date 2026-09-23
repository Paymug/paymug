import type { CustomerAccount } from "@/lib/customer-auth.types";
import { resolveCustomerAvatarUrl } from "@/lib/customer-avatar";
import type { FeatureRecord, FeatureRecordValue } from "@/lib/feature-records.types";
import {
  parseLicenseActivations,
  parseLicenseSeatLimit,
} from "@/lib/license-activations.utils";
import type { LicenseRow, LicensesSummary } from "./licenses.types";

function asString(value: FeatureRecordValue | undefined): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function buildLicenseRows(input: {
  licenses: FeatureRecord[];
  accounts: CustomerAccount[];
  customerNames: Map<string, string>;
}): LicenseRow[] {
  const accountByEmail = new Map(
    input.accounts.map((account) => [
      account.email.trim().toLowerCase(),
      account,
    ]),
  );

  return input.licenses.map((license) => {
    const data = license.data;
    const perpetual = data.licenseType === "perpetual";
    const activations = parseLicenseActivations(data.appActivations);
    const seatLimit = parseLicenseSeatLimit(data.seatLimit);
    const expiresAt = asString(data.expiresAt);
    const updatesExpireAt = asString(data.updatesExpireAt);
    const customerEmail = (
      asString(data.customerEmail) ??
      license.subtitle ??
      ""
    ).trim();
    const normalizedEmail = customerEmail.toLowerCase();
    const account = accountByEmail.get(normalizedEmail);
    const customerName =
      input.customerNames.get(normalizedEmail) ||
      account?.name ||
      customerEmail.split("@")[0] ||
      "Customer";

    return {
      id: license.id,
      key: license.title,
      maskedKey: `****-${license.title.slice(-4)}`,
      status: license.status,
      perpetual,
      activeSeats: activations.length,
      seatLimit,
      issuedAt: asString(data.issuedAt) ?? license.createdAt,
      expiresAt,
      updatesExpireAt,
      expiry: perpetual
        ? updatesExpireAt ?? expiresAt
        : expiresAt ?? updatesExpireAt,
      customerEmail,
      customerName,
      customerAvatarUrl: resolveCustomerAvatarUrl({
        email: customerEmail,
        avatarImageUrl: account?.avatarImageUrl,
      }),
      product: asString(data.product) ?? "License",
      activations,
    };
  });
}

export function buildLicensesSummary(
  licenses: LicenseRow[],
  startDate: string,
  endDate: string,
): LicensesSummary {
  let totalActivations = 0;
  let newActivations = 0;
  for (const license of licenses) {
    totalActivations += license.activations.length;
    for (const activation of license.activations) {
      const day = activation.activatedAt.slice(0, 10);
      if (day >= startDate && day <= endDate) newActivations += 1;
    }
  }
  return {
    totalLicenses: licenses.length,
    totalActivations,
    newActivations,
  };
}
