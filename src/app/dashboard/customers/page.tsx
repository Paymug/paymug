import { cookies } from "next/headers";
import { dashboardPageClass } from "@/components/dashboard/dashboard.styles";
import { getSessionUser } from "@/lib/auth";
import { listCustomerAccountsByEmails } from "@/lib/customer-accounts";
import { listStoreCustomerEmailPreferences } from "@/lib/customer-email-preferences";
import { listAbandonmentResponses } from "@/lib/abandonment-responses";
import { listOrdersByUser } from "@/lib/db";
import { listFeatureRecords } from "@/lib/feature-records";
import { getStoreById } from "@/lib/stores";
import { listVisitorIdentities } from "@/lib/visitor-identities";
import { listVisitorVisitDays } from "@/lib/visitor-analytics";
import { listOriginVisitsByEmail } from "@/lib/customer-origin";
import {
  dashboardFilterCookieName,
  parseDashboardFilterCookie,
  parseDashboardFilterState,
} from "../dashboard-filter.utils";
import type { DashboardOverviewSearchParams } from "../dashboard-overview.types";
import { CustomersWorkspace } from "./CustomersWorkspace";
import { buildCustomerSummaries } from "./customers-page.utils";

export default async function CustomersPage({
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

  const [
    orders,
    subscriptions,
    licenses,
    subscribers,
    emailPreferences,
    abandonmentResponses,
  ] = await Promise.all([
    listOrdersByUser(user.id, store.id, user.environment),
    listFeatureRecords(user.id, "subscriptions", user.environment),
    listFeatureRecords(user.id, "licenses", user.environment),
    listFeatureRecords(user.id, "subscribers", user.environment),
    listStoreCustomerEmailPreferences(store.id),
    listAbandonmentResponses({
      userId: user.id,
      storeId: store.id,
      environment: user.environment,
    }),
  ]);

  const customerEmails = new Set<string>();
  for (const order of orders) customerEmails.add(order.customerEmail);
  for (const subscription of subscriptions) {
    if (subscription.subtitle) customerEmails.add(subscription.subtitle);
  }
  for (const license of licenses) {
    const email =
      typeof license.data.customerEmail === "string"
        ? license.data.customerEmail
        : license.subtitle;
    if (email) customerEmails.add(email);
  }
  const accounts = await listCustomerAccountsByEmails([...customerEmails]);

  const identities = await listVisitorIdentities(store.id);
  const originVisitsByEmail = user.environment === "live"
    ? await listOriginVisitsByEmail(store.id, identities)
    : new Map();
  const visitorIds = [...new Set(identities.map((identity) => identity.visitorId))];
  const visitDays = await listVisitorVisitDays(store.id, visitorIds);
  const emailByVisitorId = new Map(
    identities.map((identity) => [identity.visitorId, identity.email]),
  );
  const daysByEmail = new Map<string, Set<string>>();
  for (const { visitorId, day } of visitDays) {
    const email = emailByVisitorId.get(visitorId);
    if (!email) continue;
    const days = daysByEmail.get(email) ?? new Set<string>();
    days.add(day);
    daysByEmail.set(email, days);
  }
  const returningEmails = [...daysByEmail.entries()]
    .filter(([, days]) => days.size >= 2)
    .map(([email]) => email);

  const customers = buildCustomerSummaries({
    orders,
    subscriptions,
    licenses,
    subscribers,
    accounts,
    storeEmailPreferences: emailPreferences,
    abandonmentResponses,
    returningEmails,
    originVisitsByEmail,
    defaultCurrency: store.currency,
  });

  return (
    <div className={dashboardPageClass}>
      <CustomersWorkspace
        customers={customers}
        currency={store.currency}
        range={{ startDate: filter.startDate, endDate: filter.endDate }}
      />
    </div>
  );
}
