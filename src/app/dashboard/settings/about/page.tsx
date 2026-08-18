import { getAppAboutStatus } from "@/lib/app-about";
import { AboutPanel } from "./AboutPanel";

export default async function AboutPage() {
  const status = await getAppAboutStatus();
  return (
    <div className="mx-auto w-full max-w-3xl pb-12">
      <h1 className="sr-only">About Paymug</h1>
      <section className="py-8 text-center sm:py-12">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent-hover">
          About
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#333]">
          Paymug application status
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-[#74748f]">
          Review the installed version, private upstream updates, and deployment configuration.
        </p>
      </section>
      <AboutPanel status={status} />
    </div>
  );
}
