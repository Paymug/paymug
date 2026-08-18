import { redirect } from "next/navigation";
import { getCustomerAffiliatePortalData } from "@/lib/customer-affiliate-portal";
import { getCustomerSession } from "@/lib/customer-auth";
import { CustomerAffiliatePayoutsPortal } from "../CustomerAffiliatePayoutsPortal";

export default async function CustomerAffiliatePayoutsPage() {
  const customer = await getCustomerSession();
  if (!customer) redirect("/customer/login");
  const data = await getCustomerAffiliatePortalData(customer.email);
  if (!data.programs.length) redirect("/customer");
  return <CustomerAffiliatePayoutsPortal customer={customer} data={data} />;
}
