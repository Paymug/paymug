"use client";

import { Clock } from "@phosphor-icons/react";
import { useState } from "react";
import { CustomerPortalFrame } from "../CustomerPortalFrame";
import { CustomerAffiliateAnalytics } from "./CustomerAffiliateAnalytics";
import { CustomerAffiliateJoin } from "./CustomerAffiliateJoin";
import type { CustomerAffiliatePortalProps } from "./CustomerAffiliatePortal.types";

export function CustomerAffiliatePortal({
  customer,
  data,
}: CustomerAffiliatePortalProps) {
  const [selectedStoreId, setSelectedStoreId] = useState(
    data.programs[0]?.storeId || "",
  );
  const program =
    data.programs.find((candidate) => candidate.storeId === selectedStoreId) ||
    data.programs[0];
  if (!program) return null;

  return (
    <CustomerPortalFrame
      customer={customer}
      title="Affiliate overview"
      affiliateEnabled
      branding={{
        storeSlug: program.storeSlug,
        storeName: program.storeName,
        storeLogoImageUrl: program.storeLogoImageUrl,
      }}
    >
      <div className="mx-auto w-full max-w-[74rem] pt-2">
        <div className="flex flex-wrap items-end justify-between gap-4">
          {/* <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#b08500]">
              Affiliate center
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#2f2f38]">
              {program.state === "active"
                ? "Your affiliate performance"
                : "Grow with stores you already know"}
            </h2>
          </div> */}
          {data.programs.length > 1 && (
            <label className="block min-w-56">
              <span className="mb-1.5 block text-xs font-medium text-[#85859d]">
                Affiliate program
              </span>
              <select
                value={program.storeId}
                onChange={(event) => setSelectedStoreId(event.target.value)}
                className="w-full rounded-xl border border-[#e8e8ee] bg-white px-3.5 py-2.5 text-sm font-medium outline-none focus:border-[#f5c518]"
              >
                {data.programs.map((option) => (
                  <option key={option.storeId} value={option.storeId}>
                    {option.storeName}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="mt-7 pb-12">
          {program.state === "active" ? (
            <CustomerAffiliateAnalytics program={program} />
          ) : program.state === "pending" ? (
            <section className="grid min-h-[28rem] place-items-center rounded-2xl border border-[#e8e8ee] bg-[#fafafd] p-6 text-center">
              <div className="max-w-lg">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#fff6d1] text-[#9b7600]">
                  <Clock size={27} />
                </span>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#b08500]">
                  Application under review
                </p>
                <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
                  {program.storeName} is reviewing your application
                </h3>
                <p className="mt-4 text-sm leading-7 text-[#85859d]">
                  When the store activates your account, this page will show
                  your personal referral link, processed purchases, clicks,
                  commissions, and payouts.
                </p>
              </div>
            </section>
          ) : (
            <CustomerAffiliateJoin customer={customer} program={program} />
          )}
        </div>
      </div>
    </CustomerPortalFrame>
  );
}
