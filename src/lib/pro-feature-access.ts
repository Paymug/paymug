import "server-only";

import { hasProFeature } from "./app-license";
import { proFeatureLabels } from "./app-license.config";
import type { ProFeature } from "./app-license.types";
import { jsonError } from "./utils";

export async function requireProFeature(
  feature: ProFeature,
): Promise<Response | undefined> {
  return (await hasProFeature(feature))
    ? undefined
    : jsonError(
        `${proFeatureLabels[feature]} requires a Paymug Pro license`,
        403,
      );
}

export function getDashboardFeatureProRequirement(
  feature: string,
): ProFeature | undefined {
  if (feature === "campaigns") return "email_campaigns";
  if (feature.startsWith("affiliate")) return "affiliates";
  if (feature === "pages") return "pages";
  return undefined;
}
