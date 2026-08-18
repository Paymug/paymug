import { redirect } from "next/navigation";
import { getCustomerAffiliatePortalData } from "@/lib/customer-affiliate-portal";
import { getCustomerSession } from "@/lib/customer-auth";
import { CustomerAffiliatePortal } from "./CustomerAffiliatePortal";

export default async function CustomerAffiliatePage() {
  const customer = await getCustomerSession();
  if (!customer) redirect("/customer/login");
  const data = await getCustomerAffiliatePortalData(customer.email);
  if (!data.programs.length) redirect("/customer");
  return <CustomerAffiliatePortal customer={customer} data={data} />;
}
