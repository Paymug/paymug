import { CustomerPortalNav } from "./CustomerPortalNav";
import type { CustomerPortalFrameProps } from "./CustomerPortalFrame.types";

export function CustomerPortalFrame({
  customer,
  title,
  affiliateEnabled = false,
  branding,
  children,
}: CustomerPortalFrameProps) {
  return (
    <div className="grid min-h-dvh grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] overflow-x-clip bg-white text-[#333] [--background:#fff] [--border:#e8e8ee] [--card:#fff] [--foreground:#27272f] [--muted:#85859d] lg:grid-cols-[15rem_minmax(0,1fr)] lg:grid-rows-[5.5rem_minmax(0,1fr)]">
      <CustomerPortalNav
        customer={customer}
        affiliateEnabled={affiliateEnabled}
        branding={branding}
      />
      <header className="hidden min-w-0 items-center justify-between gap-4 px-10 lg:col-start-2 lg:row-start-1 lg:flex">
        <h1 className="text-2xl font-medium tracking-[-0.035em]">{title}</h1>
        <div className="rounded-full border border-[#e8e8ee] bg-white px-3.5 py-2 text-xs font-medium text-[#696978]">
          {customer.email}
        </div>
      </header>
      <main className="row-start-2 min-w-0 overflow-x-clip px-4 pb-12 sm:px-8 lg:col-start-2 lg:row-start-2 lg:px-10">
        {children}
      </main>
    </div>
  );
}
