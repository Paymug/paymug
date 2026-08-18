"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/format";
import {
  calculateAnnualAffiliateValue,
  getAffiliateCommissionLabel,
} from "./affiliate-program.utils";
import type {
  AffiliateEarningCadence,
  AffiliateEarningsCalculatorProps,
} from "./page.types";

export function AffiliateEarningsCalculator({
  currency,
  initialPriceCents,
  commissionType,
  commissionValue,
  commissionDuration,
}: AffiliateEarningsCalculatorProps) {
  const [price, setPrice] = useState((initialPriceCents / 100).toFixed(2));
  const [cadence, setCadence] = useState<AffiliateEarningCadence>("one_time");
  const [referrals, setReferrals] = useState(25);
  const parsedPrice = Number.parseFloat(price || "0");
  const priceCents = Number.isFinite(parsedPrice)
    ? Math.max(0, Math.round(parsedPrice * 100))
    : 0;
  const annualValue = calculateAnnualAffiliateValue(
    priceCents,
    cadence,
    commissionType,
    commissionValue,
    commissionDuration,
  );

  return (
    <section className="mx-auto w-full max-w-[73.75rem] px-6 py-20 sm:px-8">
      <div className="grid overflow-hidden rounded-[2rem] bg-[#23221f] text-white lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,.9fr)]">
        <div className="p-7 sm:p-10 lg:p-12">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e7c739]">
            Potential earnings
          </p>
          <h2 className="mt-4 max-w-xl text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
            See what your audience could earn you.
          </h2>
          <p className="mt-5 max-w-xl text-sm leading-7 text-[#b7b4aa]">
            Adjust the offer and referral count to estimate your yearly
            affiliate income.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#aaa79f]">
                Commission
              </p>
              <p className="mt-2 text-sm font-medium text-[#eeece6]">
                {getAffiliateCommissionLabel(
                  commissionType,
                  commissionValue,
                  currency,
                )}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#aaa79f]">
                Billing
              </p>
              <select
                value={cadence}
                onChange={(event) =>
                  setCadence(event.target.value as AffiliateEarningCadence)
                }
                className="mt-2 w-full bg-transparent text-sm font-medium text-[#eeece6] outline-none [&>option]:bg-[#23221f]"
              >
                <option value="one_time">One-time product</option>
                <option value="monthly">Monthly subscription</option>
                <option value="annual">Annual subscription</option>
              </select>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#aaa79f]">
                Payments
              </p>
              <p className="mt-2 text-sm font-medium text-[#eeece6]">
                {commissionDuration === "recurring" ? "Recurring" : "One-time"}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 bg-[#2d2c27] p-7 sm:p-10 lg:border-l lg:border-t-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#aaa79f]">
            Estimated yearly earnings
          </p>
          <output className="mt-3 block text-4xl font-semibold tracking-[-0.04em] text-[#ffd21c]">
            {formatMoney(annualValue * referrals, currency)}
          </output>
          <p className="mt-2 text-sm text-[#aaa79f]">
            {getAffiliateCommissionLabel(
              commissionType,
              commissionValue,
              currency,
            )}{" "}
            commission · {referrals} successful{" "}
            {referrals === 1 ? "referral" : "referrals"}
          </p>
          <label className="mt-7 block">
            <span className="text-xs font-medium text-[#c9c6bd]">
              Average purchase value
            </span>
            <div className="mt-2 flex overflow-hidden rounded-xl border border-white/15 bg-white/5">
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-white outline-none"
              />
              <span className="grid place-items-center px-3 text-xs text-[#aaa79f]">
                {currency}
              </span>
            </div>
          </label>
          <label className="mt-5 block">
            <span className="flex justify-between text-xs font-medium text-[#c9c6bd]">
              <span>Yearly referrals</span>
              <span>{referrals}</span>
            </span>
            <input
              type="range"
              min="1"
              max="250"
              value={referrals}
              onChange={(event) => setReferrals(Number(event.target.value))}
              className="mt-3 w-full accent-[#f5c518]"
            />
          </label>
          <p className="mt-5 text-xs leading-5 text-[#8f8c84]">
            Estimates are illustrative. Actual earnings depend on qualifying
            purchases, attribution, refunds, and store approval.
          </p>
        </div>
      </div>
    </section>
  );
}
