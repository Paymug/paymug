import { redirect } from "next/navigation";
import { getCustomerAffiliatePortalData } from "@/lib/customer-affiliate-portal";
import { getCustomerSession } from "@/lib/customer-auth";
import { CustomerAffiliateProductsPortal } from "../CustomerAffiliateProductsPortal";

export default async function CustomerAffiliateProductsPage() {
  const customer = await getCustomerSession();
  if (!customer) redirect("/customer/login");
  const data = await getCustomerAffiliatePortalData(customer.email);
  if (!data.programs.length) redirect("/customer");
  return <CustomerAffiliateProductsPortal customer={customer} data={data} />;
}
