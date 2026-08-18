import Link from "next/link";
import Powered from "./PoweredBy";
import type { StorefrontFooterProps } from "./StorefrontMenus.types";
import { clsx } from "clsx";

export function StorefrontFooter({ pages, basePath = "" }: StorefrontFooterProps) {


  return (
    <footer className="my-4">
      <div className={clsx( pages.length > 0 ? "justify-between" : "justify-center", "mx-auto flex w-full max-w-5xl flex-col gap-3 sm:flex-row sm:items-center px-4")}>
        <Powered />
        {pages.length > 0 && (
          <nav
            className="mx-6 flex flex-wrap items-center gap-x-6 gap-y-2 pb-4 sm:pb-0"
            aria-label="Footer navigation"
          >
            {pages.map((page) => (
              <Link
                key={page.id}
                href={`${basePath}/${page.slug}`}
                className="text-sm text-muted hover:text-foreground hover:underline"
              >
                {page.navigationLabel || page.title}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </footer>
  );
}
