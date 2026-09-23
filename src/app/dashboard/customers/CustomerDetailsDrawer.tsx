"use client";

import {
  CaretDown,
  CaretRight,
  ChatCircleDots,
  CurrencyDollar,
  EnvelopeSimple,
  Key,
  Receipt,
  User,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { CustomerAvatar } from "@/components/CustomerAvatar";
import {
  badgeBaseClass,
  badgeVariantClasses,
} from "@/components/ui.styles";
import { formatMoney } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";
import { CustomerLicenseActivations } from "./CustomerLicenseActivations";
import { formatCustomerDate, formatCustomerDateTime } from "./customers.utils";
import type {
  CustomerDetailsDrawerProps,
  CustomerTimelineKind,
} from "./customers.types";

const orderStatusVariant: Record<
  OrderStatus,
  keyof typeof badgeVariantClasses
> = {
  paid: "success",
  pending: "warning",
  failed: "danger",
  refunded: "muted",
};

const timelineIcons: Record<CustomerTimelineKind, typeof Receipt> = {
  order: Receipt,
  payment: CurrencyDollar,
  refund: CurrencyDollar,
  payment_failed: WarningCircle,
  subscription: Receipt,
  license: Key,
  account: User,
  email: EnvelopeSimple,
  abandonment: ChatCircleDots,
};

const timelineTones: Record<
  CustomerTimelineKind,
  { icon: string; background: string }
> = {
  order: { icon: "text-[#5468d4]", background: "bg-[#eef2ff]" },
  payment: { icon: "text-emerald-600", background: "bg-emerald-50" },
  refund: { icon: "text-amber-600", background: "bg-amber-50" },
  payment_failed: { icon: "text-red-500", background: "bg-red-50" },
  subscription: { icon: "text-violet-600", background: "bg-violet-50" },
  license: { icon: "text-blue-600", background: "bg-blue-50" },
  account: { icon: "text-stone-600", background: "bg-stone-100" },
  email: { icon: "text-sky-600", background: "bg-sky-50" },
  abandonment: { icon: "text-orange-600", background: "bg-orange-50" },
};

export function CustomerDetailsDrawer({
  customer,
  onClose,
}: CustomerDetailsDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [licensesOpen, setLicensesOpen] = useState(false);
  const [openLicenseIds, setOpenLicenseIds] = useState<Set<string>>(new Set());
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

  const close = () => {
    setClosing(true);
    setVisible(false);
  };

  const location =
    [customer.city, customer.country].filter(Boolean).join(", ") ||
    "Location not available";
  const stats: Array<{ label: string; value: string }> = [
    { label: "First seen", value: formatCustomerDate(customer.firstSeen) },
    { label: "Total revenue", value: formatMoney(customer.revenue, customer.currency) },
    { label: "MRR", value: formatMoney(customer.mrr, customer.currency) },
  ];

  return createPortal(
    <div
      className={`fixed inset-0 z-50 bg-[#222129]/45 backdrop-blur-[1px] transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`ml-auto flex h-dvh w-full max-w-[34rem] flex-col overflow-hidden border-l border-[#e5e5eb] bg-white shadow-[-22px_0_60px_rgba(25,24,31,0.16)] transition-transform duration-300 ease-out ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="shrink-0 border-b border-border px-6 pb-5 pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <CustomerAvatar
                name={customer.name}
                email={customer.email}
                avatarUrl={customer.avatarUrl}
                size="lg"
              />
              <div className="min-w-0">
                <h2 id={titleId} className="truncate text-2xl font-semibold">
                  {customer.name}
                </h2>
                <p className="mt-1 truncate text-sm text-muted">
                  {customer.email} · {location}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full text-muted transition hover:bg-[#f4f4f7] hover:text-foreground"
              aria-label="Close customer details"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-4">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="text-sm font-semibold tabular-nums">
                  {stat.value}
                </p>
                <p className="mt-0.5 text-xs text-muted">{stat.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted">
            First tracked source site: <span className="font-medium text-foreground">{customer.source ?? "Unknown"}</span>
          </p>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <button
            type="button"
            onClick={() => setOrdersOpen((current) => !current)}
            aria-expanded={ordersOpen}
            className="flex w-full cursor-pointer items-center justify-between gap-3 text-left"
          >
            <span className="text-sm font-semibold">
              Orders
              <span className="ml-2 text-xs font-normal text-muted">
                {customer.ordersCount}
              </span>
            </span>
            {ordersOpen ? (
              <CaretDown size={16} className="text-muted" aria-hidden />
            ) : (
              <CaretRight size={16} className="text-muted" aria-hidden />
            )}
          </button>
          {ordersOpen &&
            (customer.orders.length ? (
              <div className="mt-3 divide-y divide-[#f0f0f4] overflow-hidden rounded-xl border border-[#ececf1]">
                {customer.orders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-start justify-between gap-3 px-3.5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {order.productName}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {formatCustomerDateTime(order.paidAt || order.createdAt)}
                        {order.discountCode
                          ? ` · ${order.discountCode}`
                          : ""}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        Source: {order.source ?? "Unknown"} · {[order.city, order.country].filter(Boolean).join(", ") || "Location unknown"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular-nums">
                        {formatMoney(order.amount, order.currency)}
                      </p>
                      <span
                        className={`${badgeBaseClass} mt-1 ${
                          badgeVariantClasses[orderStatusVariant[order.status]]
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-xl bg-[#f7f7f8] px-3 py-2.5 text-xs text-muted">
                No orders yet.
              </p>
            ))}

          <div className="mt-6 border-t border-[#f0f0f4] pt-6">
            <button
              type="button"
              onClick={() => setLicensesOpen((current) => !current)}
              aria-expanded={licensesOpen}
              className="flex w-full cursor-pointer items-center justify-between gap-3 text-left"
            >
              <span className="text-sm font-semibold">
                Licenses
                <span className="ml-2 text-xs font-normal text-muted">
                  {customer.licenses.length}
                </span>
              </span>
              {licensesOpen ? (
                <CaretDown size={16} className="text-muted" aria-hidden />
              ) : (
                <CaretRight size={16} className="text-muted" aria-hidden />
              )}
            </button>
            {licensesOpen &&
              (customer.licenses.length ? (
                <div className="mt-3 divide-y divide-[#f0f0f4] overflow-hidden rounded-xl border border-[#ececf1]">
                  {customer.licenses.map((license) => {
                    const open = openLicenseIds.has(license.id);
                    return (
                      <div key={license.id} className="px-3.5 py-3">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenLicenseIds((current) => {
                              const next = new Set(current);
                              if (next.has(license.id)) next.delete(license.id);
                              else next.add(license.id);
                              return next;
                            })
                          }
                          aria-expanded={open}
                          className="flex w-full cursor-pointer items-start justify-between gap-3 text-left"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {license.product}
                            </p>
                            <p className="mt-0.5 truncate font-mono text-xs text-muted">
                              {license.key}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="text-xs capitalize text-muted">
                              {license.status}
                            </span>
                            {open ? (
                              <CaretDown
                                size={15}
                                className="text-muted"
                                aria-hidden
                              />
                            ) : (
                              <CaretRight
                                size={15}
                                className="text-muted"
                                aria-hidden
                              />
                            )}
                          </div>
                        </button>
                        {open && (
                          <CustomerLicenseActivations
                            licenseId={license.id}
                            seatLimit={license.seatLimit}
                            initialActivations={license.activations}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-3 rounded-xl bg-[#f7f7f8] px-3 py-2.5 text-xs text-muted">
                  No licenses for this customer.
                </p>
              ))}
          </div>

          <div className="mt-6 border-t border-[#f0f0f4] pt-6">
            <h3 className="text-sm font-semibold">Timeline</h3>
            {customer.timeline.length ? (
              <ol className="mt-4">
                {customer.timeline.map((event, index) => {
                  const Icon = timelineIcons[event.kind];
                  const tone = timelineTones[event.kind];
                  const isLast = index === customer.timeline.length - 1;
                  return (
                    <li key={event.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span
                          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${tone.background} ${tone.icon}`}
                        >
                          <Icon size={14} weight="bold" aria-hidden />
                        </span>
                        {!isLast && (
                          <span
                            className="my-1 w-px flex-1 bg-[#e8e8ee]"
                            aria-hidden
                          />
                        )}
                      </div>
                      <div className={`min-w-0 flex-1 ${isLast ? "" : "pb-4"}`}>
                        <p className="text-sm font-medium">
                          {event.title}
                          {event.amount !== undefined && (
                            <span className="ml-2 font-semibold tabular-nums">
                              {formatMoney(
                                event.amount,
                                event.currency ?? customer.currency,
                              )}
                            </span>
                          )}
                        </p>
                        {event.description && (
                          <p className="mt-0.5 truncate text-xs text-muted">
                            {event.description}
                          </p>
                        )}
                        <p className="mt-0.5 text-xs text-muted">
                          {formatCustomerDateTime(event.at)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="mt-3 rounded-xl bg-[#f7f7f8] px-3 py-2.5 text-xs text-muted">
                No activity yet.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}
