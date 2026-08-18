import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { cardClass } from "@/components/ui.styles";
import { getSessionUser } from "@/lib/auth";
import { getActiveStoreForUser } from "@/lib/stores";
import { StoreSetupForm } from "./StoreSetupForm";

export const metadata: Metadata = {
  title: "Set up store",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function StoreSetupPage() {
  const user = await getSessionUser();
  if (!user) redirect("/setup/account");

  const store = await getActiveStoreForUser(user.id, user.activeStoreId);
  if (store) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4 py-10 sm:py-14">
      <div className="w-full max-w-md">
        <div className="text-center">
          <Logo href="/" size="lg" />
        </div>
        <section className={`${cardClass} mt-7 p-8`}>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Step 2 of 2
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            Set up your store
          </h1>
          <p className="mt-1 text-sm text-muted">
            Choose the store name customers will see.
          </p>
          <StoreSetupForm />
        </section>
      </div>
    </main>
  );
}
