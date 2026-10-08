import type { ProductExtraSeatTier } from "@/lib/extra-seats.types";

export interface ExtraSeatsEditorProps {
  currency: string;
  enabled: boolean;
  tiers: ProductExtraSeatTier[];
  onEnabledChange(enabled: boolean): void;
  onTiersChange(tiers: ProductExtraSeatTier[]): void;
}
