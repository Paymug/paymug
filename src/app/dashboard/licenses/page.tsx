import { cookies } from "next/headers";
import { dashboardPageClass } from "@/components/dashboard/dashboard.styles";
import { getSessionUser } from "@/lib/auth";
import { listCustomerAccountsByEmails } from "@/lib/customer-accounts";
import { listFeatureRecords } from "@/lib/feature-records";
import { getStoreById } from "@/lib/stores";
import {
  dashboardFilterCookieName,
  parseDashboardFilterCookie,
  parseDashboardFilterState,
} from "../dashboard-filter.utils";
import type { DashboardOverviewSearchParams } from "../dashboard-overview.types";
import { LicensesWorkspace } from "./LicensesWorkspace";
import { buildLicenseRows, buildLicensesSummary } from "./licenses-page.utils";

export default async function LicensesPage({
  searchParams,
}: {
  searchParams: Promise<DashboardOverviewSearchParams>;
}) {
  const user = await getSessionUser();
  if (!user) return null;
  const store = await getStoreById(user.activeStoreId, user.id);
  if (!store) return null;

  const cookieJar = await cookies();
  const filter = parseDashboardFilterState(
    await searchParams,
    parseDashboardFilterCookie(cookieJar.get(dashboardFilterCookieName)?.value),
  );

  const [licenses, customerRecords] = await Promise.all([
    listFeatureRecords(user.id, "licenses", user.environment),
    listFeatureRecords(user.id, "customers", user.environment),
  ]);

  const customerEmails = new Set<string>();
  for (const license of licenses) {
    const email =
      typeof license.data.customerEmail === "string"
        ? license.data.customerEmail
        : license.subtitle;
    if (email) customerEmails.add(email);
  }
  const accounts = await listCustomerAccountsByEmails([...customerEmails]);

  const customerNames = new Map<string, string>();
  for (const record of customerRecords) {
    if (record.subtitle) {
      customerNames.set(record.subtitle.trim().toLowerCase(), record.title);
    }
  }

  const rows = buildLicenseRows({ licenses, accounts, customerNames });
  const summary = buildLicensesSummary(
    rows,
    filter.startDate,
    filter.endDate,
  );

  return (
    <div className={dashboardPageClass}>
      <h1 className="sr-only">Licenses</h1>
      <p className="text-sm text-[#85859d]">
        License keys issued for eligible purchases.
      </p>
      <LicensesWorkspace licenses={rows} summary={summary} />
    </div>
  );
}
