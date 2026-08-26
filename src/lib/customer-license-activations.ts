import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { featureRecords, orders } from "@/db/schema";
import { updateFeatureRecord } from "./feature-records";
import { parseLicenseActivations } from "./license-activations.utils";
import type { CustomerLicenseActivationRemovalResult } from "./customer-license-activations.types";
import type { FeatureRecordValue } from "./feature-records.types";

function parseRecordData(value: string): Record<string, FeatureRecordValue> {
  try {
    return JSON.parse(value) as Record<string, FeatureRecordValue>;
  } catch {
    return {};
  }
}

export async function removeCustomerLicenseActivation(
  orderId: string,
  customerEmail: string,
  instanceId: string,
): Promise<CustomerLicenseActivationRemovalResult> {
  const db = await getDb();
  const normalizedEmail = customerEmail.trim().toLowerCase();
  const order = await db.query.orders.findFirst({
    where: and(
      eq(orders.id, orderId),
      eq(orders.environment, "live"),
      inArray(orders.status, ["paid", "refunded"]),
      sql`lower(${orders.customerEmail}) = ${normalizedEmail}`,
    ),
  });
  if (!order) throw new Error("Purchase not found");

  const licenses = await db.query.featureRecords.findMany({
    where: and(
      eq(featureRecords.feature, "licenses"),
      eq(featureRecords.environment, "live"),
      sql`lower(${featureRecords.subtitle}) = ${normalizedEmail}`,
    ),
  });
  const license = licenses
    .map((record) => ({ record, data: parseRecordData(record.data) }))
    .find(
      ({ data }) =>
        data.orderId === order.id ||
        (data.subscriptionLicense === true && data.productId === order.productId),
    );
  if (!license) throw new Error("License not found");

  const activations = parseLicenseActivations(license.data.appActivations);
  const nextActivations = activations.filter(
    (activation) => activation.instanceId !== instanceId,
  );
  if (nextActivations.length !== activations.length) {
    await updateFeatureRecord(license.record.id, license.record.userId, {
      data: {
        ...license.data,
        appActivations: nextActivations,
      },
    });
  }
  return { activations: nextActivations };
}
