import {
  ArrowSquareOut,
  Check,
} from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { headers } from "next/headers";
import { getSessionUser } from "@/lib/auth";
import { getRequestOrigin } from "@/lib/request-origin.utils";
import { getSetupChecklist } from "@/lib/setup-checklist";

export default async function SetupPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const requestOrigin = getRequestOrigin(await headers());
  const checklist = await getSetupChecklist(
    user.id,
    user.storeName,
    user.storeSlug,
    requestOrigin,
    user.activeStoreId
  );
  const complete = checklist.progress === 100;

  return (
    <div className="mx-auto w-full max-w-xl pb-12">
      <section className="py-8 text-center sm:py-12">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent-hover">
          Store setup
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#333]">
          {complete
            ? "Your store is ready to go"
            : "Get your store ready to sell"}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-[#74748f]">
          Complete the required steps below for payments, subscriptions,
          customer email, and a secure production deployment.
        </p>

        <div className="mx-auto mt-7 max-w-xl">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-[#333]">
              {checklist.completedRequired} of {checklist.totalRequired}{" "}
              required steps complete
            </span>
            <span className="font-semibold text-accent-hover">
              {checklist.progress}%
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#eeeeF3]">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${checklist.progress}%` }}
            />
          </div>
        </div>
      </section>

      <div className="space-y-8">
        {checklist.groups.map((group) => (
          <section
            key={group.id}
            className="overflow-hidden rounded-2xl border border-[#e8e8ee] bg-white"
          >
            <div className="border-b border-[#e8e8ee] px-5 py-4 sm:px-6">
              <h3 className="text-lg font-semibold text-[#333]">
                {group.title}
              </h3>
              <p className="mt-1 text-sm text-[#85859d]">
                {group.description}
              </p>
            </div>

            <ol>
              {group.items.map((item, index) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-4 border-b border-[#f0f0f4] px-5 py-5 last:border-b-0 sm:flex-row items-start sm:px-6"
                >
                  <span
                    className={`grid h-10 w-10 mt-1 shrink-0 place-items-center rounded-full text-sm font-semibold ${
                      item.complete
                        ? "bg-[#e8f8ef] text-[#178f55]"
                        : "bg-[#f7f7f8] text-[#85859d]"
                    }`}
                  >
                    {item.complete ? (
                      <Check size={18} weight="bold" />
                    ) : (
                      index + 1
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-medium text-[#333]">
                        {item.title}
                      </p>
                      {!item.required && (
                        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-dark">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-[#85859d]">
                      {item.description}
                    </p>
                    {item.checks && item.checks.length > 0 && (
                      <ul className="mt-3 space-y-1.5">
                        {item.checks.map((check) => (
                          <li
                            key={check.id}
                            className="flex items-start gap-2 text-sm"
                          >
                            <span
                              className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center ${
                                check.complete
                                  ? "text-[#178f55]"
                                  : "text-[#a0a0b2]"
                              }`}
                            >
                              {check.complete ? (
                                <Check size={14} weight="bold" />
                              ) : (
                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                              )}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <code className="truncate text-sm text-[#3f3f49]">
                                  {check.label}
                                </code>
                                <span
                                  className={
                                    check.complete
                                      ? "text-sm font-medium text-[#178f55]"
                                      : "text-sm font-medium text-[#9a6b13]"
                                  }
                                >
                                  {check.complete ? "Configured" : "Missing"}
                                </span>
                              </div>
                              {!check.complete && (
                                <p className="mt-0.5 text-sm leading-relaxed text-[#85859d]">
                                  {check.description}
                                </p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {item.complete ? (
                    <span className="inline-flex min-w-24 items-center justify-center gap-1.5 rounded-lg bg-[#e8f8ef] px-3 py-2 text-sm font-semibold text-[#178f55]">
                      <Check size={15} weight="bold" />
                      Complete
                    </span>
                  ) : item.href && item.actionLabel ? (
                    <Link
                      href={item.href}
                      target={item.external ? "_blank" : undefined}
                      rel={item.external ? "noreferrer" : undefined}
                      className="inline-flex min-w-32 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-dark transition hover:bg-accent-hover"
                    >
                      {item.actionLabel}
                      {item.external && (
                        <ArrowSquareOut size={15} weight="bold" />
                      )}
                    </Link>
                  ) : (
                    <span className="inline-flex min-w-24 items-center justify-center rounded-lg bg-[#f7f7f8] px-3 py-2 text-sm font-medium text-[#85859d]">
                      Pending
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
