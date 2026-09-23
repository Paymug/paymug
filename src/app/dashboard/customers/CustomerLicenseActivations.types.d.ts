import type { LicenseAuthorityActivation } from "@/lib/app-license.types";

export interface CustomerLicenseActivationsProps {
  licenseId: string;
  seatLimit: number | null;
  initialActivations: LicenseAuthorityActivation[];
}
