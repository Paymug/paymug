import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/customer-auth";
import { CustomerPasswordSettings } from "./CustomerPasswordSettings";

export default async function CustomerAccountPasswordPage() {
  const customer = await getCustomerSession();
  if (!customer) redirect("/customer/login");
  return <CustomerPasswordSettings hasPassword={customer.hasPassword} />;
}
