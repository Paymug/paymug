import type { LicenseAuthorityActivation } from "@/lib/app-license.types";

export interface CustomerLicenseActivationsProps {
  orderId: string;
  seatLimit: number | null;
  initialActivations: LicenseAuthorityActivation[];
}

export interface CustomerLicenseActivationResponse {
  activations?: LicenseAuthorityActivation[];
  error?: string;
}
