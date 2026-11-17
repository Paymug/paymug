import { importStages, type ImportStage } from "../lemonsqueezy/types";

export type MigrationSourceId = "lemonsqueezy" | "polar" | "paddle" | "dodo";

export interface MigrationSourceMeta {
  id: MigrationSourceId;
  label: string;
  /** Stages this source can import, in run order. */
  stages: ImportStage[];
  /** Label of the secret the seller pastes. */
  secretLabel: string;
  /** Whether the seller must choose a test/live mode (Dodo infers it). */
  modeFromKey?: boolean;
  /** Resources the source has nothing to import for, shown in the preview. */
  notes: string[];
}

export const migrationSources: Record<MigrationSourceId, MigrationSourceMeta> = {
  lemonsqueezy: {
    id: "lemonsqueezy",
    label: "Lemon Squeezy",
    stages: [...importStages],
    secretLabel: "Lemon Squeezy API key",
    notes: [],
  },
  polar: {
    id: "polar",
    label: "Polar",
    stages: ["products", "customers", "orders", "licenses", "discounts", "subscriptions"],
    secretLabel: "Polar organization access token",
    notes: [
      "Downloadable files cannot be read through the Polar API; re-upload them to the variants.",
      "Metered prices, Discord and meter-credit benefits are skipped.",
    ],
  },
  paddle: {
    id: "paddle",
    label: "Paddle",
    stages: ["products", "customers", "orders", "discounts", "subscriptions"],
    secretLabel: "Paddle API key",
    notes: [
      "Paddle has no license keys or file delivery, so there is nothing to import for them.",
      "Send customers to Paymug checkout before the first card export so the delta export stays small.",
    ],
  },
  dodo: {
    id: "dodo",
    label: "Dodo Payments",
    stages: ["products", "files", "customers", "orders", "licenses", "discounts", "subscriptions"],
    secretLabel: "Dodo Payments API key (read-only recommended)",
    modeFromKey: true,
    notes: [
      "Usage-based and credit products, meters and wallets are skipped.",
      "Discord, Telegram, Notion, Figma and Framer entitlements need manual setup.",
    ],
  },
};

export function isMigrationSource(value: string): value is MigrationSourceId {
  return value in migrationSources;
}

export function normalizeSourceStages(
  source: MigrationSourceId,
  requested: readonly string[] | undefined,
): ImportStage[] {
  const supported = migrationSources[source].stages;
  const wanted = new Set(requested ?? supported);
  // Everything else hangs off products, so it is always imported.
  wanted.add("products");
  return supported.filter((stage) => wanted.has(stage));
}
