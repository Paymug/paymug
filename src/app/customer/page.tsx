import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/customer-auth";
import { getCustomerPortalData } from "@/lib/customer-portal";
import { CustomerAnalyticsIdentity } from "./CustomerAnalyticsIdentity";
import { CustomerPortalView } from "./CustomerPortalView";

export default async function CustomerPortalPage() {
  const customer = await getCustomerSession();
  if (!customer) redirect("/customer/login");
  const portal = await getCustomerPortalData(customer.email);

  return (
    <>
      <CustomerAnalyticsIdentity />
      <CustomerPortalView customer={customer} portal={portal} />
    </>
  );
}
