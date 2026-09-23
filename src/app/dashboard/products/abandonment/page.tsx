import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/ssr";
import {
  dashboardButtonBaseClass,
  dashboardCardClass,
  dashboardPageClass,
  dashboardPageCopyClass,
} from "@/components/dashboard/dashboard.styles";
import { badgeBaseClass, badgeVariantClasses } from "@/components/ui.styles";
import { listAbandonmentResponses } from "@/lib/abandonment-responses";
import { getSessionUser } from "@/lib/auth";
import { listProductsByUser } from "@/lib/db";
import { getStoreById } from "@/lib/stores";

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function AbandonmentPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const store = await getStoreById(user.activeStoreId, user.id);
  if (!store) return null;

  const [responses, products] = await Promise.all([
    listAbandonmentResponses({
      userId: user.id,
      storeId: store.id,
      environment: user.environment,
    }),
    listProductsByUser(user.id, store.id, user.environment),
  ]);
  const productNames = new Map(
    products.map((product) => [product.id, product.name]),
  );

  return (
    <div className={dashboardPageClass}>
      <Link
        href="/dashboard/products"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground"
      >
        <ArrowLeft size={15} aria-hidden />
        Back to products
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Abandonment responses
          </h1>
          <p className={`${dashboardPageCopyClass} mt-1`}>
            What visitors told you when they left checkout.
          </p>
        </div>
        <span
          className={`${badgeBaseClass} ${badgeVariantClasses.muted}`}
        >
          {responses.length} response{responses.length === 1 ? "" : "s"}
        </span>
      </div>

      {responses.length === 0 ? (
        <div className={`${dashboardCardClass} mt-6 px-6 py-14 text-center`}>
          <p className="text-sm font-medium">No abandonment responses yet</p>
          <p className="mt-1 text-sm text-muted">
            Turn on the abandonment popup in settings to start collecting
            feedback when visitors leave checkout.
          </p>
          <Link
            href="/dashboard/settings"
            className={`${dashboardButtonBaseClass} mt-5 bg-accent text-dark hover:bg-accent-hover`}
          >
            Open settings
          </Link>
        </div>
      ) : (
        <div className={`${dashboardCardClass} mt-6 overflow-x-auto`}>
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-sm text-muted">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Answer</th>
                <th className="px-4 py-3 font-medium">Updates</th>
              </tr>
            </thead>
            <tbody>
              {responses.map((response) => (
                <tr
                  key={response.id}
                  className="border-b border-border last:border-0 align-top"
                >
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-muted">
                    {formatDateTime(response.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    {response.productId
                      ? productNames.get(response.productId) || "—"
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {response.email || (
                      <span className="text-muted">Not provided</span>
                    )}
                  </td>
                  <td className="max-w-md px-4 py-3">
                    {response.answer || (
                      <span className="text-muted">No answer</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`${badgeBaseClass} ${
                        response.marketingOptIn
                          ? badgeVariantClasses.success
                          : badgeVariantClasses.muted
                      }`}
                    >
                      {response.marketingOptIn ? "Opted in" : "No"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
