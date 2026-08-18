import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Alert } from "@/components/ui";
import { getCustomerSession } from "@/lib/customer-auth";
import { CustomerLoginForm } from "./CustomerLoginForm";
import type { CustomerLoginPageProps } from "./page.types";

export default async function CustomerLoginPage({
  searchParams,
}: CustomerLoginPageProps) {
  if (await getCustomerSession()) redirect("/customer");
  const query = await searchParams;

  return (
    <main className="min-h-screen bg-background px-4 py-10 mx-auto max-w-lg">
      <div className="mx-auto max-w-4xl">
        <Logo label="Customer Portal" />

        <p className="mt-2 text-sm text-muted">
          Access your purchases, licenses, repository access, and subscriptions.
        </p>
        {query.error && (
          <div className="mt-6">
            <Alert>
              This sign-in link is invalid, expired, or has already been used.
            </Alert>
          </div>
        )}
        <div className="mt-7">
          <CustomerLoginForm />
        </div>
      </div>
    </main>
  );
}
