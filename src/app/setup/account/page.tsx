import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { cardClass } from "@/components/ui.styles";
import { getSessionUser } from "@/lib/auth";
import { initialSetupHasRegisteredUser } from "@/lib/initial-setup";
import { AccountSetupForm } from "./AccountSetupForm";

export const metadata: Metadata = {
  title: "Create account",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AccountSetupPage() {
  if (await initialSetupHasRegisteredUser()) {
    const user = await getSessionUser();
    redirect(user ? "/setup/store" : "/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4 py-10 sm:py-14">
      <div className="w-full max-w-md">
        <div className="text-center">
          <Logo href="/setup" size="lg" />
        </div>
        <section className={`${cardClass} mt-7 p-8`}>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Step 1 of 2
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-muted">
            This will be the only owner account for this installation.
          </p>
          <AccountSetupForm />
        </section>
      </div>
    </main>
  );
}
