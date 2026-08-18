import "server-only";

import {
  findFeatureRecordBySubtitle,
  findFeatureRecordByTitle,
  listFeatureRecords,
} from "./feature-records";
import type {
  DashboardFeatureKey,
  FeatureRecordInput,
} from "./feature-records.types";

export async function validateNewFeatureRecord(
  userId: string,
  feature: DashboardFeatureKey,
  input: FeatureRecordInput
): Promise<string | undefined> {
  if (["discounts", "subscribers", "licenses"].includes(feature)) {
    const existing = await findFeatureRecordByTitle(
      userId,
      feature,
      input.title,
      input.environment
    );
    if (existing) return "A record with this value already exists";
  }
  if (feature === "customers" && input.subtitle) {
    const existing = await findFeatureRecordBySubtitle(
      userId,
      feature,
      input.subtitle,
      input.environment
    );
    if (existing) return "A customer with this email already exists";
  }
  if (feature === "affiliates") {
    const affiliates = await listFeatureRecords(
      userId,
      "affiliates",
      input.environment
    );
    const code = String(input.data?.code || "").toLowerCase();
    if (
      affiliates.some(
        (affiliate) =>
          String(affiliate.data.code || "").toLowerCase() === code
      )
    ) {
      return "This affiliate tracking code is already in use";
    }
  }
  return undefined;
}
