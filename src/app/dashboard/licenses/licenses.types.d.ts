import type { LicenseAuthorityActivation } from "@/lib/app-license.types";

export interface LicenseRow {
  id: string;
  key: string;
  maskedKey: string;
  status: string;
  perpetual: boolean;
  activeSeats: number;
  seatLimit: number | null;
  issuedAt: string;
  expiresAt?: string;
  updatesExpireAt?: string;
  expiry?: string;
  customerEmail: string;
  customerName: string;
  customerAvatarUrl?: string;
  product: string;
  activations: LicenseAuthorityActivation[];
}

export interface LicensesSummary {
  totalLicenses: number;
  totalActivations: number;
  newActivations: number;
}

export interface LicensesWorkspaceProps {
  licenses: LicenseRow[];
  summary: LicensesSummary;
}

export interface LicenseDetailsDrawerProps {
  license: LicenseRow;
  onClose(): void;
  onUpdated(license: LicenseRow): void;
}
