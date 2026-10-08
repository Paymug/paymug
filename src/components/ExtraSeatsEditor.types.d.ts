import type { ProductExtraSeatTier } from "@/lib/extra-seats.types";

export interface ExtraSeatsEditorProps {
  currency: string;
  enabled: boolean;
  tiers: ProductExtraSeatTier[];
  label: string;
  onLabelChange(label: string): void;
  onEnabledChange(enabled: boolean): void;
  onTiersChange(tiers: ProductExtraSeatTier[]): void;
}
