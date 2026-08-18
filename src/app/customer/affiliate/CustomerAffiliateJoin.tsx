"use client";

import {
  ArrowRight,
  ChartLineUp,
  Check,
  LinkSimple,
  UsersThree,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Input, Textarea } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import type {
  CustomerAffiliateApplicationResponse,
  CustomerAffiliateJoinProps,
} from "./CustomerAffiliatePortal.types";
import {
  calculateCustomerAffiliateEstimate,
  getCustomerAffiliateCommissionLabel,
} from "./customer-affiliate.utils";

export function CustomerAffiliateJoin({
  customer,
  program,
}: CustomerAffiliateJoinProps) {
  const router = useRouter();
  const [name, setName] = useState(customer.name || "");
  const [about, setAbout] = useState("");
  const [websites, setWebsites] = useState("");
  const [socialLinks, setSocialLinks] = useState("");
  const [price, setPrice] = useState(
    (program.initialProductPriceCents / 100).toFixed(2),
  );
  const [referrals, setReferrals] = useState(25);
  const [submitting, setSubmitting] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const parsedPrice = Number.parseFloat(price || "0");
  const priceCents = Number.isFinite(parsedPrice)
    ? Math.max(0, Math.round(parsedPrice * 100))
    : 0;
  const estimatedEarnings = calculateCustomerAffiliateEstimate(
    priceCents,
    referrals,
    program.commissionType,
    program.commissionValue,
    program.commissionDuration,
  );

  async function apply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const response = await fetch(
      `/api/stores/${encodeURIComponent(program.storeSlug)}/affiliates`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: customer.email,
          about,
          websites,
          socialLinks,
        }),
      },
    );
    const result =
      (await response.json()) as CustomerAffiliateApplicationResponse;
    setSubmitting(false);
    if (!response.ok) {
      setError(result.error || "Could not submit your application");
      return;
    }
    setApplied(true);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {program.state === "rejected" && (
        <Alert>
          <strong>Your previous application was not approved.</strong>
          <span className="mt-1 block">
            {program.affiliate?.rejectionMessage ||
              "Update your details below and submit the application again."}
          </span>
        </Alert>
      )}
      <section className="overflow-hidden rounded-2xl bg-[#23221f] text-white">
        <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,.9fr)]">
          <div className="p-7 sm:p-10 lg:p-12">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e7c739]">
              {program.storeName} affiliate program
            </p>
            <h2 className="mt-4 max-w-xl text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
              Share products you trust. Earn when people buy.
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-[#b7b4aa]">
              Join the program to receive your personal referral link, track
              audience activity, and earn commission on eligible purchases.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { icon: LinkSimple, label: "Personal referral link" },
                { icon: ChartLineUp, label: "Live performance analytics" },
                { icon: UsersThree, label: "Tracked commissions" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  <Icon size={19} className="text-[#f5c518]" />
                  <p className="mt-3 text-sm font-medium text-[#eeece6]">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 bg-[#2d2c27] p-7 sm:p-10 lg:border-l lg:border-t-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#aaa79f]">
              Estimated yearly earnings
            </p>
            <output className="mt-3 block text-4xl font-semibold tracking-[-0.04em] text-[#ffd21c]">
              {formatMoney(estimatedEarnings, program.currency)}
            </output>
            <p className="mt-2 text-sm text-[#aaa79f]">
              {getCustomerAffiliateCommissionLabel(
                program.commissionType,
                program.commissionValue,
                program.currency,
              )}{" "}
              commission · {referrals} successful referrals
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
                  {program.currency}
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

      <section className="grid gap-6 rounded-2xl border border-[#e8e8ee] bg-white p-6 lg:grid-cols-[minmax(0,.8fr)_minmax(22rem,1.2fr)] lg:p-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#b08500]">
            Apply to join
          </p>
          <h3 className="mt-3 text-2xl font-semibold tracking-[-0.035em]">
            Start earning with {program.storeName}
          </h3>
          <p className="mt-3 text-sm leading-6 text-[#85859d]">
            Tell the store about your audience. Once approved, your personal
            link and analytics will appear on this page.
          </p>
          <div className="mt-6 space-y-3">
            {[
              "Application reviewed by the store",
              "Clicks and purchases tracked automatically",
              program.commissionDuration === "recurring"
                ? "Commission on recurring attributed purchases"
                : "Commission on the first attributed purchase",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2.5 text-sm text-[#555563]">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700">
                  <Check size={12} weight="bold" />
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>

        {applied ? (
          <div className="self-start">
            <Alert variant="success">
              Your application was submitted. The store will review it before
              activating your referral link.
            </Alert>
          </div>
        ) : (
          <form onSubmit={apply} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Your name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
              <Input
                label="Account email"
                type="email"
                value={customer.email}
                readOnly
                className="[&_input]:cursor-not-allowed [&_input]:bg-[#f7f7f8]"
              />
            </div>
            <Textarea
              label="About you and your audience"
              value={about}
              onChange={(event) => setAbout(event.target.value)}
              placeholder="What do you create, and who follows your work?"
              required
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Website (optional)"
                value={websites}
                onChange={(event) => setWebsites(event.target.value)}
              />
              <Input
                label="Social profile (optional)"
                value={socialLinks}
                onChange={(event) => setSocialLinks(event.target.value)}
              />
            </div>
            {error && <Alert>{error}</Alert>}
            <Button type="submit" disabled={submitting}>
              {submitting ? "Submitting…" : "Apply to join"}
              {!submitting && <ArrowRight size={16} />}
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}
