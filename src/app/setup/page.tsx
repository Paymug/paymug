import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Logo } from "@/components/Logo";
import { cardClass } from "@/components/ui.styles";
import { initialSetupHasRegisteredUser } from "@/lib/initial-setup";
import { SetupClient } from "./SetupClient";

export const metadata: Metadata = {
  title: "Initial setup",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (await initialSetupHasRegisteredUser()) notFound();

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4 py-10 sm:py-14">
      <div className="w-full max-w-xl">
        <div className="text-center">
          <Logo href="/setup" size="lg" />
          <h1 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">
            Set up your app
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
            Prepare the database and verify the required environment before
            creating the first account.
          </p>
        </div>

        <section className={`${cardClass} mt-7 overflow-hidden`}>
          <SetupClient />
        </section>
      </div>
    </main>
  );
}
