import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/customer-auth";
import { getCustomerPortalData } from "@/lib/customer-portal";
import { CustomerAnalyticsIdentity } from "./CustomerAnalyticsIdentity";
import { StoreTestModeRibbon } from "@/components/StoreTestModeRibbon";
import { CustomerPortalView } from "./CustomerPortalView";

export default async function CustomerPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ env?: string }>;
}) {
  // ?env=test shows test-mode (sandbox) purchases instead of live ones.
  const environment = (await searchParams).env === "test" ? "sandbox" : "live";
  const customer = await getCustomerSession();
  if (!customer) redirect("/customer/login");
  const portal = await getCustomerPortalData(customer.email, environment);

  return (
    <>
      {environment === "sandbox" && <StoreTestModeRibbon />}
      <CustomerAnalyticsIdentity />
      <CustomerPortalView customer={customer} portal={portal} />
    </>
  );
}
