import { ArrowRight, Plus } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { dashboardPageClass } from "@/components/dashboard/dashboard.styles";
import { EmptyState } from "@/components/ui";
import { getSessionUser } from "@/lib/auth";
import { listStorePages } from "@/lib/store-pages";

export default async function PagesPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const pages = await listStorePages(
    user.id,
    user.activeStoreId,
    user.environment,
  );

  return (
    <div className={`${dashboardPageClass} pb-8`}>
      <div className="flex items-end justify-between gap-5">
        <div>
          {/* <h1 className="text-3xl font-semibold tracking-tight">Pages</h1> */}
          <p className="mt-2 text-sm text-muted">
            Publish stories, policies, guides, and information for your store.
          </p>
        </div>
        <Link
          href="/page-editor/new"
          className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-dark hover:bg-accent-hover"
        >
          <Plus size={16} weight="bold" /> New page
        </Link>
      </div>

      <div className="mt-8">
        {pages.length === 0 ? (
          <EmptyState
            title="No pages yet"
            description="Create your first page with the inline story editor."
            action={
              <Link
                href="/page-editor/new"
                className="font-semibold text-accent-hover hover:underline"
              >
                Create a page
              </Link>
            }
          />
        ) : (
          <div className="divide-y divide-[#e8e8ee] border-y border-[#e8e8ee]">
            {pages.map((page) => (
              <Link
                key={page.id}
                href={`/page-editor/${page.id}`}
                className="group flex items-center gap-5 py-5"
              >
                {page.coverImageUrl ? (
                  <img
                    src={page.coverImageUrl}
                    alt=""
                    className="h-16 w-24 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-16 w-24 rounded-lg bg-[#f3f3f1]" />
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-semibold group-hover:underline">
                    {page.title}
                  </h2>
                  <p className="mt-1 truncate text-sm text-muted">
                    {page.description || "No description"}
                  </p>
                </div>
                <div className="text-right text-xs text-muted">
                  <p className="font-semibold capitalize text-foreground">
                    {page.status}
                  </p>
                  <p className="mt-1 capitalize">
                    {page.navigation === "none" ? "Not in menu" : `${page.navigation} menu`}
                  </p>
                </div>
                <ArrowRight size={18} className="text-muted" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
