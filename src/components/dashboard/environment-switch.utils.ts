import type { PayPalMode } from "@/lib/types";

export function getNextEnvironment(environment: PayPalMode): PayPalMode {
  return environment === "live" ? "sandbox" : "live";
}

export function getUnavailableEnvironmentMessage(
  environment: PayPalMode
): string {
  return environment === "live"
    ? "Add your PayPal live credentials before enabling Live mode."
    : "Add your PayPal sandbox credentials before enabling Test mode.";
}

export function getActiveEnvironmentError(
  environment: PayPalMode,
  isAvailable: boolean
): string | null {
  return isAvailable ? null : getUnavailableEnvironmentMessage(environment);
}
