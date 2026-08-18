import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCustomerSession } from "@/lib/customer-auth";
import { getCustomerPortalData } from "@/lib/customer-portal";
import { CustomerPortalFrame } from "../CustomerPortalFrame";
import { CustomerAccountMenu } from "./CustomerAccountMenu";

export default async function CustomerAccountLayout({
  children,
}: {
  children: ReactNode;
}) {
  const customer = await getCustomerSession();
  if (!customer) redirect("/customer/login");
  const portal = await getCustomerPortalData(customer.email);

  return (
    <CustomerPortalFrame
      customer={customer}
      title="Account settings"
      affiliateEnabled={portal.affiliatesEnabled}
      branding={portal.branding}
    >
      <div className="mx-auto w-full max-w-[74rem] pt-2">
        {/* <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#b08500]">
          Your account
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#2f2f38]">
          Account settings
        </h2> */}
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#85859d]">
          Manage your customer profile, image, password, and portal access.
        </p>
        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,18rem)]">
          <div className="min-w-0">{children}</div>
          <div className="lg:sticky lg:top-6 lg:self-start">
            <CustomerAccountMenu />
          </div>
        </div>
      </div>
    </CustomerPortalFrame>
  );
}
