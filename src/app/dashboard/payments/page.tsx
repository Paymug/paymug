import { redirect } from "next/navigation";

export default function LegacyPaymentsPage() {
  redirect("/dashboard/settings/payments");
}
