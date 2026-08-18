"use client";

import {
  ArrowRight,
  ArrowsClockwise,
  Package,
  Storefront,
} from "@phosphor-icons/react";
import { useState } from "react";
import { formatMoney } from "@/lib/format";
import type { CustomerPortalPurchase } from "@/lib/customer-portal.types";
import { CustomerPortalFrame } from "./CustomerPortalFrame";
import { CustomerPurchaseModal } from "./CustomerPurchaseModal";
import type { CustomerPortalViewProps } from "./CustomerPortalView.types";
import {
  formatCustomerPortalDateTime,
  getCustomerStatusClass,
} from "./customer-portal.utils";

export function CustomerPortalView({
  customer,
  portal,
}: CustomerPortalViewProps) {
  const [selectedPurchase, setSelectedPurchase] =
    useState<CustomerPortalPurchase | null>(null);
  const activeSubscriptions = portal.subscriptions.filter((subscription) =>
    ["active", "trialing"].includes(subscription.status.toLowerCase()),
  ).length;
  const storeCount = new Set(
    [
      ...portal.purchases.map((purchase) => purchase.storeName),
      ...portal.subscriptions.map((subscription) => subscription.storeName),
    ],
  ).size;

  return (
    <>
      <CustomerPortalFrame
        customer={customer}
        title="Customer portal"
        affiliateEnabled={portal.affiliatesEnabled}
        branding={portal.branding}
      >
        <div className="mx-auto w-full max-w-[74rem]">
          <section id="home" className="scroll-mt-6 pt-2">
            {/* <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#b08500]">
              Welcome back
            </p>
            <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-[-0.04em] text-[#2f2f38] sm:text-4xl">
              Everything you&apos;ve purchased, in one place.
            </h2> */}
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#85859d]">
              Review payments, revisit product details, and access every benefit
              included with your purchases.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {[
                {
                  label: "Purchases",
                  value: portal.purchases.length,
                  icon: Package,
                },
                {
                  label: "Active subscriptions",
                  value: activeSubscriptions,
                  icon: ArrowsClockwise,
                },
                {
                  label: "Stores",
                  value: storeCount,
                  icon: Storefront,
                },
              ].map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="rounded-xl border border-[#e8e8ee] bg-white p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-[#85859d]">{label}</p>
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#fff6d1] text-[#9b7600]">
                      <Icon size={17} />
                    </span>
                  </div>
                  <p className="mt-4 text-2xl font-semibold tracking-tight">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section id="purchases" className="scroll-mt-6 pt-12">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.025em]">
                  Purchase summary
                </h2>
                <p className="mt-1 text-sm text-[#85859d]">
                  Select a purchase to see its payment and product details.
                </p>
              </div>
              <span className="text-sm font-medium text-[#85859d]">
                {portal.purchases.length} total
              </span>
            </div>

            <div className="mt-5 overflow-hidden rounded-xl border border-[#e8e8ee] bg-white">
              {portal.purchases.length === 0 ? (
                <div className="px-6 py-14 text-center">
                  <Package size={30} className="mx-auto text-[#b8b8c6]" />
                  <p className="mt-3 text-sm font-semibold">No purchases found</p>
                  <p className="mt-1 text-sm text-[#85859d]">
                    Completed purchases associated with this email will appear here.
                  </p>
                </div>
              ) : (
                <>
                  <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(8rem,.7fr)_minmax(7rem,.55fr)_7rem_2rem] gap-4 border-b border-[#eeeeF2] bg-[#fafafd] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9999aa] md:grid">
                    <span>Product</span>
                    <span>Purchased</span>
                    <span>Payment</span>
                    <span>Status</span>
                    <span />
                  </div>
                  {portal.purchases.map((purchase) => (
                    <button
                      key={purchase.id}
                      type="button"
                      onClick={() => setSelectedPurchase(purchase)}
                      className="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-[#eeeeF2] px-4 py-4 text-left transition last:border-b-0 hover:bg-[#fcfcfd] md:grid-cols-[minmax(0,1.5fr)_minmax(8rem,.7fr)_minmax(7rem,.55fr)_7rem_2rem] md:px-5"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        {purchase.productImageUrl ? (
                          <img
                            src={purchase.productImageUrl}
                            alt=""
                            className="h-11 w-11 shrink-0 rounded-lg border border-[#ededf2] object-cover"
                          />
                        ) : (
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#fff6d1] text-[#9b7600]">
                            <Package size={20} />
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-[#34343e]">
                            {purchase.productName}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-[#85859d]">
                            {purchase.storeName} · {purchase.id}
                          </span>
                        </span>
                      </span>
                      <span className="hidden text-sm text-[#696978] md:block">
                        {new Date(
                          purchase.paidAt || purchase.createdAt,
                        ).toLocaleDateString()}
                      </span>
                      <span className="hidden text-sm font-semibold md:block">
                        {formatMoney(purchase.amount, purchase.currency)}
                      </span>
                      <span
                        className={`hidden w-fit rounded-full px-2.5 py-1 text-xs font-semibold capitalize md:inline-flex ${getCustomerStatusClass(purchase.status)}`}
                      >
                        {purchase.status}
                      </span>
                      <span className="grid h-8 w-8 place-items-center rounded-full text-[#9999aa] transition group-hover:bg-[#fff6d1] group-hover:text-[#9b7600]">
                        <ArrowRight size={16} />
                      </span>
                      <span className="col-span-2 flex items-center gap-2 pl-14 text-xs text-[#85859d] md:hidden">
                        <span>{formatMoney(purchase.amount, purchase.currency)}</span>
                        <span>·</span>
                        <span>{formatCustomerPortalDateTime(purchase.paidAt || purchase.createdAt)}</span>
                      </span>
                    </button>
                  ))}
                </>
              )}
            </div>
          </section>

          <section id="subscriptions" className="scroll-mt-6 pt-12">
            <h2 className="text-xl font-semibold tracking-[-0.025em]">
              Subscriptions
            </h2>
            <p className="mt-1 text-sm text-[#85859d]">
              Your recurring plans and their latest status.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {portal.subscriptions.length ? (
                portal.subscriptions.map((subscription) => (
                  <article
                    key={subscription.id}
                    className="rounded-xl border border-[#e8e8ee] bg-white p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#f7f7f8] text-[#77778b]">
                        <ArrowsClockwise size={18} />
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getCustomerStatusClass(subscription.status)}`}
                      >
                        {subscription.status}
                      </span>
                    </div>
                    <p className="mt-5 text-xs font-medium uppercase tracking-wide text-[#9999aa]">
                      {subscription.storeName}
                    </p>
                    <h3 className="mt-1 font-semibold">{subscription.planName}</h3>
                    <p className="mt-3 text-sm text-[#696978]">
                      {subscription.amount !== undefined
                        ? `$${subscription.amount.toFixed(2)}`
                        : "Price unavailable"}
                      {subscription.interval ? ` / ${subscription.interval}` : ""}
                    </p>
                  </article>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-[#dedee6] p-6 text-sm text-[#85859d] sm:col-span-2 xl:col-span-3">
                  No subscriptions associated with this account.
                </div>
              )}
            </div>
          </section>

        </div>
      </CustomerPortalFrame>

      {selectedPurchase && (
        <CustomerPurchaseModal
          purchase={selectedPurchase}
          onClose={() => setSelectedPurchase(null)}
        />
      )}
    </>
  );
}
