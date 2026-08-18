"use client";

import {
  ChartLineUp,
  Copy,
  CursorClick,
  Money,
  Receipt,
} from "@phosphor-icons/react";
import { useState } from "react";
import { AreaChart } from "@/components/dashboard/charts";
import { formatMoney } from "@/lib/format";
import type { CustomerAffiliateProgramProps } from "./CustomerAffiliatePortal.types";
import { AffiliateReferralTools } from "./AffiliateReferralTools";

export function CustomerAffiliateAnalytics({
  program,
}: CustomerAffiliateProgramProps) {
  const [copied, setCopied] = useState(false);
  const analytics = program.analytics;
  const affiliate = program.affiliate;
  if (!analytics || !affiliate) return null;

  return (
    <div className="space-y-6">
     

      <section className="rounded-2xl border border-[#e8e8ee] bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Processed purchases</p>
            <p className="mt-1 text-sm text-[#85859d]">
              Attributed purchases processed over the last 30 days.
            </p>
          </div>
          <p className="text-3xl font-semibold tracking-[-0.04em]">
            {analytics.processedPurchases}
          </p>
        </div>
        <div className="mt-5">
          <AreaChart
            data={analytics.purchaseSeries}
            height={260}
            color="#f5c518"
            fillOpacity={0.04}
            valueFormat="number"
            showAxis={false}
            title="Processed purchases"
            emptyLabel="No processed purchases in this period"
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,.78fr)_minmax(0,1.22fr)]">
        <section className="rounded-2xl border border-[#e8e8ee] bg-white p-5 sm:p-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Link clicks</p>
              <p className="mt-1 text-xs text-[#85859d]">Last 14 days</p>
            </div>
            <p className="text-2xl font-semibold">{analytics.clicks}</p>
          </div>
          <div className="mt-5">
            <AreaChart
              data={analytics.clickSeries}
              height={155}
              color="#f082dc"
              fillOpacity={0.05}
              valueFormat="number"
              showAxis={false}
              title="Affiliate clicks"
              emptyLabel="No clicks yet"
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#e8e8ee] bg-white">
          <div className="border-b border-[#eeeeF2] px-5 py-4 sm:px-6">
            <h3 className="text-sm font-semibold">
              Recent processed purchases
            </h3>
          </div>
          {analytics.recentPurchases.length ? (
            <div>
              {analytics.recentPurchases.map((purchase) => (
                <div
                  key={purchase.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-[#eeeeF2] px-5 py-3.5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_7rem_7rem] sm:px-6"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {purchase.orderId}
                    </p>
                    <p className="mt-0.5 text-xs text-[#9292a3]">
                      {new Date(purchase.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium">
                      {formatMoney(
                        Math.round(purchase.amount * 100),
                        program.currency,
                      )}
                    </p>
                    <p className="mt-0.5 text-xs capitalize text-[#9292a3]">
                      {purchase.status}
                    </p>
                  </div>
                  <div className="col-span-2 text-sm sm:col-span-1 sm:text-right">
                    <p className="font-semibold text-emerald-700">
                      +
                      {formatMoney(
                        Math.round(purchase.commission * 100),
                        program.currency,
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-[#9292a3]">Commission</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-sm text-[#85859d]">
              Processed purchases will appear here after your first conversion.
            </div>
          )}
        </section>
      </div>

       <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Processed purchases",
            value: analytics.processedPurchases.toLocaleString(),
            detail: formatMoney(
              Math.round(analytics.processedPurchaseAmount * 100),
              program.currency,
            ),
            icon: Receipt,
          },
          {
            label: "Total earnings",
            value: formatMoney(
              Math.round(analytics.totalEarnings * 100),
              program.currency,
            ),
            detail: `${formatMoney(Math.round(analytics.unpaidEarnings * 100), program.currency)} unpaid`,
            icon: Money,
          },
          {
            label: "Link clicks",
            value: analytics.clicks.toLocaleString(),
            detail: "All tracked visits",
            icon: CursorClick,
          },
          {
            label: "Conversion rate",
            value: `${analytics.conversionRate.toFixed(1)}%`,
            detail: `${analytics.payouts} payout${analytics.payouts === 1 ? "" : "s"}`,
            icon: ChartLineUp,
          },
        ].map(({ label, value, detail, icon: Icon }) => (
          <div
            key={label}
            className="rounded-xl border border-[#e8e8ee] bg-white p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-[#85859d]">{label}</p>
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#fff6d1] text-[#9b7600]">
                <Icon size={17} />
              </span>
            </div>
            <p className="mt-4 text-2xl font-semibold tracking-[-0.035em]">
              {value}
            </p>
            <p className="mt-1 text-xs text-[#9999aa]">{detail}</p>
          </div>
        ))}
      </div>

      <section className="flex flex-col justify-between gap-5 rounded-2xl border border-[#e8e8ee] bg-white p-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-emerald-700">
              Active affiliate
            </p>
          </div>
          {/* <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">
            Welcome back, {affiliate.name}
          </h2> */}
          <p className="mt-1 text-sm text-[#85859d]">
            Share your link and track processed purchases from this dashboard.
          </p>
        </div>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(
              `${window.location.origin}${affiliate.trackingPath}`,
            );
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
          }}
          className="flex min-w-0 items-center gap-3 rounded-xl border border-[#e6e6ec] px-4 py-3 text-left transition hover:bg-[#fffaf0]"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9999aa]">
              Referral link
            </p>
            <p className="mt-1 max-w-64 truncate text-sm font-medium">
              {affiliate.trackingPath}
            </p>
          </div>
          <Copy size={17} className="shrink-0 text-[#9b7600]" />
          <span className="sr-only">
            {copied ? "Copied" : "Copy referral link"}
          </span>
        </button>
      </section>

      <AffiliateReferralTools program={program} />
    </div>
  );
}
