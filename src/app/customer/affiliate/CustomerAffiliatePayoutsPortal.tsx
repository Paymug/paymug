"use client";

import { CurrencyDollar } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { formatMoney } from "@/lib/format";
import { CustomerPortalFrame } from "../CustomerPortalFrame";
import {
  formatCustomerPortalDateTime,
  getCustomerStatusClass,
} from "../customer-portal.utils";
import type { CustomerAffiliatePortalProps } from "./CustomerAffiliatePortal.types";

export function CustomerAffiliatePayoutsPortal({
  customer,
  data,
}: CustomerAffiliatePortalProps) {
  const [selectedStoreId, setSelectedStoreId] = useState(data.programs[0]?.storeId || "");
  const program = data.programs.find((candidate) => candidate.storeId === selectedStoreId) || data.programs[0];
  if (!program) return null;
  const reports = program.analytics?.payoutReports || [];
  const totalPaid = reports
    .filter((report) => report.status === "paid")
    .reduce((total, report) => total + report.amount, 0);

  return (
    <CustomerPortalFrame
      customer={customer}
      title="Affiliate payouts"
      affiliateEnabled
      branding={{
        storeSlug: program.storeSlug,
        storeName: program.storeName,
        storeLogoImageUrl: program.storeLogoImageUrl,
      }}
    >
      <div className="mx-auto w-full max-w-[74rem] pt-2 pb-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#b08500]">Affiliate payouts</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Payout reports</h2>
            <p className="mt-2 text-sm text-[#85859d]">Track commission reports and their payment status.</p>
          </div>
          {data.programs.length > 1 && (
            <select
              value={program.storeId}
              onChange={(event) => setSelectedStoreId(event.target.value)}
              className="min-w-56 rounded-xl border border-[#e8e8ee] bg-white px-3.5 py-2.5 text-sm font-medium outline-none"
            >
              {data.programs.map((option) => <option key={option.storeId} value={option.storeId}>{option.storeName}</option>)}
            </select>
          )}
        </div>

        {program.state !== "active" ? (
          <div className="mt-7 rounded-2xl border border-[#e8e8ee] bg-[#fafafd] p-9 text-center">
            <CurrencyDollar size={30} className="mx-auto text-[#b08500]" />
            <h3 className="mt-4 text-xl font-semibold">Payout reports appear after approval</h3>
            <Link href="/customer/affiliate" className="mt-4 inline-block text-sm font-semibold text-[#8a6800]">Open Affiliate Overview</Link>
          </div>
        ) : (
          <>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[#e8e8ee] bg-white p-5">
                <p className="text-sm text-[#85859d]">Reports</p>
                <p className="mt-3 text-2xl font-semibold">{reports.length}</p>
              </div>
              <div className="rounded-xl border border-[#e8e8ee] bg-white p-5">
                <p className="text-sm text-[#85859d]">Total paid</p>
                <p className="mt-3 text-2xl font-semibold">{formatMoney(Math.round(totalPaid * 100), program.currency)}</p>
              </div>
              <div className="rounded-xl border border-[#e8e8ee] bg-white p-5">
                <p className="text-sm text-[#85859d]">Unpaid earnings</p>
                <p className="mt-3 text-2xl font-semibold">{formatMoney(Math.round((program.analytics?.unpaidEarnings || 0) * 100), program.currency)}</p>
              </div>
            </div>

            <section className="mt-5 overflow-hidden rounded-2xl border border-[#e8e8ee] bg-white">
              {reports.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[44rem] text-left text-sm">
                    <thead className="border-b border-[#e8e8ee] bg-[#fafafd] text-[#85859d]">
                      <tr>
                        <th className="px-5 py-3 font-medium">Report</th>
                        <th className="px-5 py-3 font-medium">Created</th>
                        <th className="px-5 py-3 font-medium">Paid</th>
                        <th className="px-5 py-3 font-medium">Status</th>
                        <th className="px-5 py-3 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.map((report) => (
                        <tr key={report.id} className="border-b border-[#eeeeF2] last:border-0">
                          <td className="px-5 py-4 font-medium">{report.reference || report.id}</td>
                          <td className="px-5 py-4 text-[#696978]">{formatCustomerPortalDateTime(report.createdAt)}</td>
                          <td className="px-5 py-4 text-[#696978]">{report.paidAt ? formatCustomerPortalDateTime(report.paidAt) : "—"}</td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getCustomerStatusClass(report.status)}`}>{report.status}</span>
                          </td>
                          <td className="px-5 py-4 text-right font-semibold">{formatMoney(Math.round(report.amount * 100), program.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid min-h-56 place-items-center p-8 text-center">
                  <div>
                    <CurrencyDollar size={28} className="mx-auto text-[#b08500]" />
                    <h3 className="mt-3 font-semibold">No payout yet</h3>
                    <p className="mt-2 text-sm text-[#85859d]">Your payout reports will appear here when the store processes your commissions.</p>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </CustomerPortalFrame>
  );
}
