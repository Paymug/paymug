"use client";

import Link from "next/link";
import {
  dashboardButtonBaseClass,
  dashboardCardClass,
  dashboardPageCopyClass,
} from "@/components/dashboard/dashboard.styles";
import { EnvironmentCopyMenu } from "@/components/dashboard/EnvironmentCopyMenu";
import { useRowSelection } from "@/components/dashboard/use-row-selection";
import { badgeBaseClass, badgeVariantClasses } from "@/components/ui.styles";
import { formatMoney } from "@/lib/format";
import { ProductActionsMenu } from "./ProductActionsMenu";
import type { ProductsWorkspaceProps } from "./ProductsWorkspace.types";

export function ProductsWorkspace({
  products,
  environment,
}: ProductsWorkspaceProps) {
  const selection = useRowSelection(products.map((product) => product.id));

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="sr-only">Products</h1>
          <p className={dashboardPageCopyClass}>
            Digital products your customers can buy.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/products/new"
            className={`${dashboardButtonBaseClass} bg-accent text-dark hover:bg-accent-hover`}
          >
            New product
          </Link>
          <EnvironmentCopyMenu
            kind="products"
            selectedIds={[...selection.selectedIds]}
            environment={environment}
          />
        </div>
      </div>

      {products.length === 0 ? (
        <div className={`${dashboardCardClass} mt-6 px-6 py-14 text-center`}>
          <p className="text-sm font-medium">No products yet</p>
          <p className="mt-1 text-sm text-muted">
            Create your first digital product and share the checkout link.
          </p>
          <Link
            href="/dashboard/products/new"
            className={`${dashboardButtonBaseClass} mt-5 bg-accent text-dark hover:bg-accent-hover`}
          >
            Create product
          </Link>
        </div>
      ) : (
        <div className={`${dashboardCardClass} mt-6 overflow-x-auto`}>
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-sm text-muted">
                <th className="w-20 px-4 py-3 font-medium" aria-label="Product image">
                  <input
                    type="checkbox"
                    aria-label="Select all products"
                    className={`h-4 w-4 accent-[#d8ad00] transition-opacity ${
                      selection.hasSelection ? "opacity-100" : "opacity-0"
                    }`}
                    checked={selection.selectedIds.size === products.length}
                    onChange={selection.toggleAll}
                  />
                </th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Checkout</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {products.map((product, index) => (
                <tr
                  key={product.id}
                  className={`group border-b border-border last:border-0 ${
                    selection.isSelected(product.id) ? "bg-accent-soft/40" : ""
                  }`}
                  onMouseEnter={() => selection.enterDrag(product.id)}
                >
                  <td className="px-4 py-3">
                    <div className="relative w-16">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-11 w-16 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#faf7ed] text-sm font-bold text-[#9b7600]">
                          {product.name.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <span
                        className={`absolute left-0 top-3 flex items-center justify-center rounded-md ring-1 ring-black/5 transition-opacity ${
                          selection.hasSelection
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100"
                        }`}
                      >
                        <input
                          type="checkbox"
                          aria-label={`Select ${product.name}`}
                          className="h-4 w-4 accent-[#d8ad00]"
                          checked={selection.isSelected(product.id)}
                          onMouseDown={() => selection.beginDrag(product.id)}
                          onChange={(event) =>
                            selection.toggle(
                              product.id,
                              index,
                              (event.nativeEvent as MouseEvent).shiftKey
                            )
                          }
                        />
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/products/${product.id}`}
                      className="font-medium hover:underline"
                    >
                      {product.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatMoney(product.price, product.currency)}
                  </td>
                  <td className="px-4 py-3 capitalize">
                    <span
                      className={`${badgeBaseClass} ${
                        badgeVariantClasses[
                          product.status === "published" ? "success" : "muted"
                        ]
                      }`}
                    >
                      {product.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/buy/${product.id}${
                        product.status === "published" &&
                        product.environment === "live"
                          ? ""
                          : "?preview"
                      }`}
                      target="_blank"
                      className="font-mono text-xs text-muted hover:text-foreground hover:underline"
                    >
                      /buy/{product.id.slice(0, 8)}…
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/dashboard/products/${product.id}`}
                        className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-[#dddde7] bg-white px-3 py-1.5 text-sm font-semibold text-[#555568] transition hover:border-accent/50 hover:bg-accent-soft hover:text-accent-hover"
                      >
                        Edit
                      </Link>
                      <ProductActionsMenu
                        id={product.id}
                        name={product.name}
                        status={product.status}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
