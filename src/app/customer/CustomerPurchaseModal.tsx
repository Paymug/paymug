"use client";

import {
  CheckCircle,
  CreditCard,
  DownloadSimple,
  Key,
  Package,
  Receipt,
  X,
} from "@phosphor-icons/react";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { ProductDescription } from "@/components/ProductDescription";
import { formatMoney } from "@/lib/format";
import {
  formatProductFileSize,
  getProductFileDownloadUrl,
} from "@/lib/product-files.utils";
import type {
  CustomerPurchaseModalProps,
  CustomerPurchaseModalTab,
} from "./CustomerPurchaseModal.types";
import {
  formatCustomerPortalDateTime,
  getCustomerPaymentReference,
  getCustomerStatusClass,
} from "./customer-portal.utils";
import { CustomerGitHubAccessCard } from "./CustomerGitHubAccessCard";

export function CustomerPurchaseModal({
  purchase,
  onClose,
}: CustomerPurchaseModalProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [activeTab, setActiveTab] =
    useState<CustomerPurchaseModalTab>("payments");
  const titleId = useId();

  useEffect(() => {
    setMounted(true);
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setClosing(true);
        setVisible(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mounted]);

  useEffect(() => {
    if (!closing) return;
    const timeout = window.setTimeout(onClose, 300);
    return () => window.clearTimeout(timeout);
  }, [closing, onClose]);

  if (!mounted) return null;

  const purchasedAt = purchase.paidAt || purchase.createdAt;
  const benefitsAvailable = Boolean(
    purchase.deliveryContent ||
      purchase.productFiles.length ||
      purchase.license ||
      purchase.githubRepository,
  );

  return createPortal(
    <div
      className={`fixed inset-0 z-50 bg-[#222129]/45 backdrop-blur-[1px] transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          setClosing(true);
          setVisible(false);
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`ml-auto flex h-dvh w-full max-w-[43rem] flex-col overflow-hidden border-l border-[#e5e5eb] bg-white shadow-[-22px_0_60px_rgba(25,24,31,0.16)] transition-transform duration-300 ease-out ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="shrink-0 px-5 pb-4 pt-5 sm:px-7 sm:pt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id={titleId} className="text-xl font-semibold tracking-[-0.025em]">
                Purchase details
              </h2>
              <p className="mt-1 text-sm text-[#85859d]">
                Purchased {formatCustomerPortalDateTime(purchasedAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setClosing(true);
                setVisible(false);
              }}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#77778a] transition hover:bg-[#f4f4f7] hover:text-[#333]"
              aria-label="Close purchase details"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-5 flex items-center gap-4 rounded-xl border border-[#e6e6ec] p-3.5 sm:p-4">
            {purchase.productImageUrl ? (
              <img
                src={purchase.productImageUrl}
                alt=""
                className="h-14 w-14 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-[#fff6d1] text-[#9b7600]">
                <Package size={24} />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{purchase.productName}</p>
              <p className="mt-0.5 truncate text-sm text-[#85859d]">
                {purchase.storeName}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-semibold">
                {formatMoney(purchase.amount, purchase.currency)}
              </p>
              <span
                className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getCustomerStatusClass(purchase.status)}`}
              >
                {purchase.status}
              </span>
            </div>
          </div>
        </header>

        <div className="shrink-0 border-b border-[#e8e8ee] px-5 sm:px-7">
          <div role="tablist" aria-label="Purchase detail sections" className="flex gap-6">
            {[
              { id: "payments" as const, label: "Payments" },
              { id: "product" as const, label: "Product details" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative py-3 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? "text-[#333] after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:bg-[#333]"
                    : "text-[#8a8a9b] hover:text-[#555563]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
          {activeTab === "payments" ? (
            <div role="tabpanel" className="space-y-7">
              <section>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">Payment history</h3>
                    <p className="mt-1 text-sm text-[#85859d]">
                      All recorded payments for this purchase.
                    </p>
                  </div>
                  <span className="rounded-full bg-[#f4f4f7] px-2.5 py-1 text-xs font-semibold text-[#696978]">
                    1 payment
                  </span>
                </div>
                <div className="mt-4 rounded-xl border border-[#e8e8ee]">
                  <div className="flex items-center gap-3 border-b border-[#eeeeF2] p-4">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                      <CreditCard size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold capitalize">
                        {purchase.gateway === "free"
                          ? "Free purchase"
                          : `${purchase.gateway} payment`}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-[#85859d]">
                        {getCustomerPaymentReference(purchase)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {formatMoney(purchase.amount, purchase.currency)}
                      </p>
                      <p className="mt-0.5 text-xs text-[#85859d]">
                        {formatCustomerPortalDateTime(purchasedAt)}
                      </p>
                    </div>
                  </div>
                  <dl className="space-y-3 p-4 text-sm">
                    <div className="flex justify-between gap-5">
                      <dt className="text-[#85859d]">Product price</dt>
                      <dd className="font-medium">
                        {formatMoney(purchase.productPrice, purchase.currency)}
                      </dd>
                    </div>
                    {purchase.discountAmount > 0 && (
                      <div className="flex justify-between gap-5">
                        <dt className="text-[#85859d]">
                          Discount{purchase.discountCode ? ` (${purchase.discountCode})` : ""}
                        </dt>
                        <dd className="font-medium text-emerald-700">
                          -{formatMoney(purchase.discountAmount, purchase.currency)}
                        </dd>
                      </div>
                    )}
                    {purchase.transactionFeeAmount > 0 && (
                      <div className="flex justify-between gap-5">
                        <dt className="text-[#85859d]">Transaction fee</dt>
                        <dd className="font-medium">
                          {formatMoney(purchase.transactionFeeAmount, purchase.currency)}
                        </dd>
                      </div>
                    )}
                    <div className="flex justify-between gap-5 border-t border-[#eeeeF2] pt-3">
                      <dt className="font-semibold">Total paid</dt>
                      <dd className="font-semibold">
                        {formatMoney(purchase.amount, purchase.currency)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </section>

              <section>
                <h3 className="font-semibold">Payment details</h3>
                <dl className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                  {[
                    ["Payment method", purchase.gateway],
                    ["Status", purchase.status],
                    ["Environment", purchase.environment],
                    ["Currency", purchase.currency],
                    ["Order ID", purchase.id],
                    ["Provider reference", getCustomerPaymentReference(purchase)],
                    ["Created", formatCustomerPortalDateTime(purchase.createdAt)],
                    ["Paid", formatCustomerPortalDateTime(purchasedAt)],
                  ].map(([label, value]) => (
                    <div key={label} className="min-w-0">
                      <dt className="text-[#9292a3]">{label}</dt>
                      <dd className="mt-1 break-all font-medium capitalize text-[#3c3c47]">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            </div>
          ) : (
            <div role="tabpanel" className="space-y-6">
              {purchase.productImageUrl && (
                <img
                  src={purchase.productImageUrl}
                  alt={purchase.productName}
                  className="max-h-72 w-full rounded-xl border border-[#e8e8ee] object-cover"
                />
              )}
              <section>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#a0a0b2]">
                  {purchase.storeName}
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                  {purchase.productName}
                </h3>
                {purchase.productDescription ? (
                  <ProductDescription
                    value={purchase.productDescription}
                    className="mt-5 text-[#555563]"
                  />
                ) : (
                  <p className="mt-4 text-sm text-[#85859d]">
                    No product description is available.
                  </p>
                )}
              </section>
            </div>
          )}

          <section className="mt-8 border-t border-[#e8e8ee] pt-7">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#fff6d1] text-[#9b7600]">
                <Receipt size={18} />
              </span>
              <div>
                <h3 className="font-semibold">Your purchase benefits</h3>
                <p className="text-sm text-[#85859d]">
                  Everything unlocked by this purchase.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {purchase.deliveryContent && (
                <div className="rounded-xl border border-[#e8e8ee] p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <CheckCircle size={17} className="text-emerald-600" />
                    Included with your purchase
                  </div>
                  <ProductDescription
                    value={purchase.deliveryContent}
                    className="mt-3 text-[#555563]"
                  />
                </div>
              )}

              {!!purchase.productFiles.length && (
                <div className="rounded-xl border border-[#e8e8ee] p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <DownloadSimple size={17} className="text-[#9b7600]" />
                    Downloads
                  </div>
                  <div className="mt-3 space-y-2">
                    {purchase.productFiles.map((file) => (
                      <a
                        key={file.id}
                        href={getProductFileDownloadUrl(purchase.id, file.id)}
                        className="flex items-center justify-between gap-3 rounded-lg bg-[#f7f7f8] px-3 py-2.5 text-sm font-medium transition hover:bg-[#fff6d1]"
                      >
                        <span className="min-w-0 truncate">{file.name}</span>
                        <span className="shrink-0 text-xs text-[#85859d]">
                          {formatProductFileSize(file.size)}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {purchase.license && (
                <div className="rounded-xl border border-[#e8e8ee] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Key size={17} className="text-[#9b7600]" />
                      License key
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${getCustomerStatusClass(purchase.license.status)}`}
                    >
                      {purchase.license.status}
                    </span>
                  </div>
                  <code className="mt-3 block break-all rounded-lg bg-[#f7f7f8] px-3 py-2.5 text-sm">
                    {purchase.license.key}
                  </code>
                  {purchase.license.perpetual ? (
                    <div className="mt-3 rounded-lg bg-[#faf7ea] px-3 py-2.5 text-xs leading-5 text-[#6f6238]">
                      <p className="font-semibold">Lifetime use included</p>
                      <p>
                        {purchase.license.updatesActive
                          ? purchase.license.updatesExpireAt
                            ? `Updates included through ${formatCustomerPortalDateTime(purchase.license.updatesExpireAt)}.`
                            : "Updates are currently included."
                          : "The update period has ended. Your purchased version remains available forever."}
                      </p>
                    </div>
                  ) : purchase.license.expiresAt ? (
                    <p className="mt-2 text-xs text-[#85859d]">
                      License expires {formatCustomerPortalDateTime(purchase.license.expiresAt)}
                    </p>
                  ) : null}
                </div>
              )}

              {purchase.githubRepository && (
                <CustomerGitHubAccessCard
                  orderId={purchase.id}
                  repository={purchase.githubRepository}
                  canInvite={
                    purchase.status === "paid" &&
                    (!purchase.license || purchase.license.updatesActive)
                  }
                  initialUsername={purchase.githubUsername}
                  initialStatus={purchase.githubAccessStatus}
                  initialError={purchase.githubAccessError}
                />
              )}

              {!benefitsAvailable && (
                <div className="rounded-xl border border-[#e8e8ee] bg-[#fafafd] p-4 text-sm text-[#696978]">
                  Your receipt and payment record remain available here whenever
                  you need them.
                </div>
              )}
            </div>
          </section>
        </div>
      </section>
    </div>,
    document.body,
  );
}
