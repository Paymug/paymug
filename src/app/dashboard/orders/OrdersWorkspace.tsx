"use client";

import {
  DownloadSimple,
  GithubLogo,
  Key,
  Package,
} from "@phosphor-icons/react";
import { useState } from "react";
import { ProductDescription } from "@/components/ProductDescription";
import { RightDrawerModal } from "@/components/dashboard/RightDrawerModal";
import {
  dashboardCardClass,
} from "@/components/dashboard/dashboard.styles";
import { badgeBaseClass, badgeVariantClasses } from "@/components/ui.styles";
import { formatMoney } from "@/lib/format";
import {
  formatProductFileSize,
  getProductFileDownloadUrl,
} from "@/lib/product-files.utils";
import { CustomerAvatar } from "./CustomerAvatar";
import type {
  DashboardOrderItem,
  OrdersWorkspaceProps,
} from "./OrdersWorkspace.types";
import {
  formatOrderDateTime,
  formatOrderListDate,
  formatOrderNumber,
  getOrderStatusBadgeVariant,
} from "./orders.utils";
import Link from "next/link";

function StatusBadge({ status }: { status: DashboardOrderItem["status"] }) {
  return (
    <span
      className={`${badgeBaseClass} capitalize ${
        badgeVariantClasses[getOrderStatusBadgeVariant(status)]
      }`}
    >
      {status}
    </span>
  );
}

function OrderDetailDrawer({
  order,
  onClose,
}: {
  order: DashboardOrderItem;
  onClose(): void;
}) {
  const orderNumber = formatOrderNumber(order.id);
  const benefitsAvailable = Boolean(
    order.deliveryContent ||
      order.productFiles.length ||
      order.license ||
      order.githubRepository
  );

  return (
    <RightDrawerModal
      eyebrow="Order"
      title={`Order ${orderNumber}`}
      description={formatOrderDateTime(order.createdAt)}
      onClose={onClose}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <StatusBadge status={order.status} />
          <span className="text-xs capitalize text-[#8b8ba3]">
            {order.gateway}
            {order.environment === "sandbox" ? " · Test" : ""}
          </span>
        </div>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <Package size={16} className="text-[#9a9aaf]" weight="bold" />
            <h3 className="text-sm font-semibold text-[#2a2a33]">
              Product details
            </h3>
          </div>
          <div className="rounded-xl border border-[#ececf1] bg-[#fafafd]">
            <Link href={`/dashboard/product/${order.id}`} className="border-b border-[#ececf1] px-4 py-3 block">
              {/* <img src={order.produ} */}
              <p className="font-medium text-[#2a2a33]">{order.productName}</p>
              {/* {order.productDescription && (
                <p className="mt-1 line-clamp-2 text-sm text-[#8b8ba3]">
                  {order.productDescription.replace(/<[^>]+>/g, " ").trim()}
                </p>
              )} */}
            </Link>
            <dl className="space-y-2.5 px-4 py-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[#8b8ba3]">Product price</dt>
                <dd className="tabular-nums font-medium">
                  {formatMoney(order.productPrice, order.currency)}
                </dd>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between gap-4">
                  <dt className="text-[#8b8ba3]">
                    Discount
                    {order.discountCode ? ` (${order.discountCode})` : ""}
                  </dt>
                  <dd className="tabular-nums font-medium text-emerald-700">
                    −{formatMoney(order.discountAmount, order.currency)}
                  </dd>
                </div>
              )}
              {order.transactionFeeAmount > 0 && (
                <div className="flex justify-between gap-4">
                  <dt className="text-[#8b8ba3]">Transaction fee</dt>
                  <dd className="tabular-nums font-medium">
                    {formatMoney(order.transactionFeeAmount, order.currency)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-4 border-t border-[#ececf1] pt-2.5">
                <dt className="font-semibold text-[#2a2a33]">Paid</dt>
                <dd className="tabular-nums font-semibold text-[#2a2a33]">
                  {formatMoney(order.amount, order.currency)}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-semibold text-[#2a2a33]">
            Customer
          </h3>
          <div className="flex items-center gap-3 rounded-xl border border-[#ececf1] px-4 py-3">
            <CustomerAvatar
              name={order.customerName}
              email={order.customerEmail}
              avatarUrl={order.customerAvatarUrl}
              size="lg"
            />
            <div className="min-w-0">
              <p className="truncate font-medium text-[#2a2a33]">
                {order.customerName}
              </p>
              <p className="mt-0.5 truncate text-sm text-[#8b8ba3]">
                {order.customerEmail}
              </p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-semibold text-[#2a2a33]">
            Product benefits
          </h3>
          <div className="space-y-3">
            {order.deliveryContent && (
              <div className="rounded-xl border border-[#ececf1] p-4">
                <p className="text-sm font-semibold text-[#2a2a33]">
                  Included content
                </p>
                <ProductDescription
                  value={order.deliveryContent}
                  className="mt-2 text-sm text-[#555563]"
                />
              </div>
            )}

            {!!order.productFiles.length && (
              <div className="rounded-xl border border-[#ececf1] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#2a2a33]">
                  <DownloadSimple size={16} className="text-[#9b7600]" />
                  Downloads
                </div>
                <div className="mt-3 space-y-2">
                  {order.productFiles.map((file) => (
                    <a
                      key={file.id}
                      href={getProductFileDownloadUrl(order.id, file.id)}
                      className="flex items-center justify-between gap-3 rounded-lg bg-[#f7f7f8] px-3 py-2.5 text-sm font-medium transition hover:bg-[#fff6d1]"
                    >
                      <span className="min-w-0 truncate">{file.name}</span>
                      <span className="shrink-0 text-xs text-[#8b8ba3]">
                        {formatProductFileSize(file.size)}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {order.license && (
              <div className="rounded-xl border border-[#ececf1] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#2a2a33]">
                    <Key size={16} className="text-[#9b7600]" />
                    License key
                  </div>
                  <span className="rounded-full bg-[#f2f2f6] px-2 py-0.5 text-xs font-medium capitalize text-[#6f6f84]">
                    {order.license.status}
                  </span>
                </div>
                <code className="mt-3 block break-all rounded-lg bg-[#f7f7f8] px-3 py-2.5 text-sm">
                  {order.license.key}
                </code>
                {order.license.expiresAt && (
                  <p className="mt-2 text-xs text-[#8b8ba3]">
                    Expires {formatOrderListDate(order.license.expiresAt)}
                  </p>
                )}
                {order.license.perpetual && (
                  <div className="mt-2 text-xs leading-5 text-[#8b8ba3]">
                    <p className="font-medium text-[#6f6238]">Lifetime use</p>
                    <p>
                      {order.license.updatesActive
                        ? order.license.updatesExpireAt
                          ? `Updates through ${formatOrderListDate(order.license.updatesExpireAt)}`
                          : "Updates included"
                        : "Update period ended"}
                    </p>
                  </div>
                )}
              </div>
            )}

            {order.githubRepository && (
              <div className="rounded-xl border border-[#ececf1] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#2a2a33]">
                  <GithubLogo size={16} />
                  Repository access
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-[#f7f7f8] px-3 py-2.5 text-sm">
                  <span className="min-w-0 truncate font-medium">
                    {order.githubRepository}
                  </span>
                  {order.githubAccessStatus && (
                    <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-medium capitalize text-[#6f6f84] ring-1 ring-[#ececf1]">
                      {order.githubAccessStatus.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
                {order.githubUsername && (
                  <p className="mt-2 text-xs text-[#8b8ba3]">
                    GitHub @{order.githubUsername}
                  </p>
                )}
              </div>
            )}

            {!benefitsAvailable && (
              <div className="rounded-xl border border-[#ececf1] bg-[#fafafd] px-4 py-3 text-sm text-[#6f6f84]">
                {order.status === "paid"
                  ? "No downloadable benefits are attached to this order."
                  : "Benefits unlock after the order is paid."}
              </div>
            )}
          </div>
        </section>
      </div>
    </RightDrawerModal>
  );
}

export function OrdersWorkspace({ orders }: OrdersWorkspaceProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = orders.find((order) => order.id === selectedId) || null;

  if (orders.length === 0) {
    return (
      <div
        className={`${dashboardCardClass} mt-6 px-6 py-14 text-center text-sm text-muted`}
      >
        No orders yet.
      </div>
    );
  }

  return (
    <>
      <div className={`${dashboardCardClass} mt-6 overflow-x-auto`}>
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-sm text-muted">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 text-right font-medium">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr
                key={order.id}
                className="cursor-pointer border-b border-border transition last:border-0 hover:bg-[#fafafd]"
                onClick={() => setSelectedId(order.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedId(order.id);
                  }
                }}
                tabIndex={0}
              >
                <td className="whitespace-nowrap px-4 py-3 text-muted">
                  {formatOrderListDate(order.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={order.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <CustomerAvatar
                      name={order.customerName}
                      email={order.customerEmail}
                      avatarUrl={order.customerAvatarUrl}
                      size="xs"
                    />
                    <span className="truncate font-medium text-[#2a2a33]">
                      {order.customerName}
                    </span>
                  </div>
                </td>
                <td className="max-w-[14rem] truncate px-4 py-3">
                  {order.productName}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums font-medium">
                  {formatMoney(order.amount, order.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <OrderDetailDrawer
          order={selected}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  );
}
