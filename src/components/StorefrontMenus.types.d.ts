import type { StorePage } from "@/lib/store-pages.types";

export interface StorefrontNavigationProps {
  pages: StorePage[];
  affiliatesEnabled: boolean;
  showDashboard?: boolean;
  className?: string
  basePath?: string;
}

export interface StorefrontFooterProps {
  pages: StorePage[];
  basePath?: string;
}
