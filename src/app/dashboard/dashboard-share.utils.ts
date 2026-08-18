import type {
  DashboardShareInput,
  DashboardShareResult,
} from "./dashboard-share.types";

export function buildDashboardShareUrl(input: DashboardShareInput): string {
  const url = new URL("/dashboard", window.location.origin);
  url.searchParams.set("start", input.startDate);
  url.searchParams.set("end", input.endDate);
  url.searchParams.set("interval", input.interval);
  if (input.productId !== "all") {
    url.searchParams.set("product", input.productId);
  }
  return url.toString();
}

export async function shareDashboardView(
  input: DashboardShareInput,
): Promise<DashboardShareResult> {
  const url = buildDashboardShareUrl(input);
  if (navigator.share) {
    await navigator.share({ title: "Store dashboard", url });
    return "shared";
  }
  await navigator.clipboard.writeText(url);
  return "copied";
}
