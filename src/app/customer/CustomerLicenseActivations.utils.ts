import type { LicenseAuthorityActivation } from "@/lib/app-license.types";
import type { CustomerLicenseActivationResponse } from "./CustomerLicenseActivations.types";

export async function deleteCustomerLicenseActivation(
  orderId: string,
  instanceId: string,
): Promise<LicenseAuthorityActivation[]> {
  const response = await fetch(
    `/api/customer/orders/${encodeURIComponent(orderId)}/license-activations/${encodeURIComponent(instanceId)}`,
    { method: "DELETE" },
  );
  const data = (await response.json()) as CustomerLicenseActivationResponse;
  if (!response.ok || !data.activations) {
    throw new Error(data.error || "Could not remove device");
  }
  return data.activations;
}
