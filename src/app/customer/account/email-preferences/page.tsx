import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/customer-auth";
import { listCustomerStoreEmailPreferences } from "@/lib/customer-email-preferences";
import { CustomerEmailPreferences } from "./CustomerEmailPreferences";

export default async function CustomerEmailPreferencesPage() {
  const customer = await getCustomerSession();
  if (!customer) {
    redirect(
      "/customer/login?next=%2Fcustomer%2Faccount%2Femail-preferences",
    );
  }
  const preferences = await listCustomerStoreEmailPreferences(customer.email);
  return <CustomerEmailPreferences initialPreferences={preferences} />;
}
