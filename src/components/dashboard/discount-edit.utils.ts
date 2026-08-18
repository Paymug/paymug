import type { FeatureRecord } from "@/lib/feature-records.types";

export async function updateDiscountStatus(
  discount: FeatureRecord,
  status: "active" | "disabled"
): Promise<FeatureRecord> {
  const response = await fetch(`/api/features/discounts/${discount.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  const data = (await response.json()) as {
    record?: FeatureRecord;
    error?: string;
  };
  if (!response.ok || !data.record) {
    throw new Error(data.error || "Could not update discount");
  }
  return data.record;
}

export async function deleteDiscountRecord(id: string): Promise<void> {
  const response = await fetch(`/api/features/discounts/${id}`, {
    method: "DELETE",
  });
  const data = (await response.json()) as {
    deleted?: boolean;
    error?: string;
  };
  if (!response.ok || !data.deleted) {
    throw new Error(data.error || "Could not delete discount");
  }
}
