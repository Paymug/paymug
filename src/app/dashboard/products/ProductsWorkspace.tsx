"use client";

import {
  DataTableColgroup,
  DataTableHeadCell,
  DataTableSettingsCell,
  DataTableSettingsHeadCell,
} from "@/components/dashboard/data-table/DataTableParts";
import type { DataTableColumn } from "@/components/dashboard/data-table/data-table.types";
import { useDataTable } from "@/components/dashboard/data-table/use-data-table";
import Link from "next/link";
import { ArrowSquareOut } from "@phosphor-icons/react";
import {
  dashboardButtonBaseClass,
  dashboardCardClass,
  dashboardIconButtonClass,
  dashboardPageCopyClass,
} from "@/components/dashboard/dashboard.styles";
import { EnvironmentCopyMenu } from "@/components/dashboard/EnvironmentCopyMenu";
import { useRowSelection } from "@/components/dashboard/use-row-selection";
import { badgeBaseClass, badgeVariantClasses } from "@/components/ui.styles";
import { formatMoney } from "@/lib/format";
import { getProductPublicPath } from "@/lib/product-paths";
import { ProductActionsMenu } from "./ProductActionsMenu";
import type { ProductsWorkspaceProps } from "./ProductsWorkspace.types";

function formatConversion(conversion: number | null | undefined): string {
  if (conversion === null || conversion === undefined) return "";
  return `${(conversion * 100).toFixed(1)}%`;
}

const productColumns: DataTableColumn[] = [
  { id: "name", label: "Name", width: 260 },
  { id: "price", label: "Price", width: 120 },
  { id: "status", label: "Status", width: 130 },
  { id: "sales", label: "Sales", width: 100 },
  { id: "revenue", label: "Revenue", width: 130 },
  { id: "conversion", label: "Conversion", width: 130 },
];

export function ProductsWorkspace({
  products,
  environment,
  performance,
  currency,
}: ProductsWorkspaceProps) {
  const table = useDataTable("products", productColumns, {
    leadingWidth: 80,
    trailingWidth: 96,
  });
  const selection = useRowSelection(products.map((product) => product.id));
  const stats = [
    { label: "Products", value: products.length.toLocaleString() },
    { label: "Sales", value: performance.totals.sales.toLocaleString() },
    {
      label: "Revenue",
      value: formatMoney(performance.totals.revenue, currency),
    },
  ];

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
            href="/dashboard/products/abandonment"
            className={`${dashboardButtonBaseClass} border border-[#dddde7] bg-white text-[#555568] hover:border-accent/50 hover:bg-accent-soft hover:text-accent-hover`}
          >
            View abandonment
          </Link>
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

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className={`${dashboardCardClass} px-5 py-4`}>
            <p className="text-2xl font-semibold tabular-nums">{stat.value}</p>
            <p className="mt-1 text-xs text-muted">{stat.label}</p>
          </div>
        ))}
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
          <table className="text-left text-sm" style={table.tableStyle}>
            <DataTableColgroup table={table} />
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
                {table.visibleColumns.map((column) => (
                  <DataTableHeadCell
                    key={column.id}
                    table={table}
                    column={column}
                  />
                ))}
                <DataTableSettingsHeadCell table={table} />
              </tr>
            </thead>
            <tbody>
              {products.map((product, index) => (
                <tr
                  key={product.id}
                  className={`group group/row border-b border-border last:border-0 ${
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
                  {table.isVisible("name") && (
                  <td className="truncate px-4 py-3">
                    <Link
                      href={`/dashboard/products/${product.id}`}
                      className="font-medium hover:underline"
                    >
                      {product.name}
                    </Link>
                  </td>
                  )}
                  {table.isVisible("price") && (
                  <td className="truncate px-4 py-3 tabular-nums">
                    {formatMoney(product.price, product.currency)}
                  </td>
                  )}
                  {table.isVisible("status") && (
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
                  )}
                  {table.isVisible("sales") && (
                  <td className="truncate px-4 py-3 tabular-nums">
                    {(performance.byProduct[product.id]?.sales ?? 0) > 0
                      ? (performance.byProduct[product.id]?.sales ?? 0).toLocaleString()
                      : ""}
                  </td>
                  )}
                  {table.isVisible("revenue") && (
                  <td className="truncate px-4 py-3 tabular-nums">
                    {(performance.byProduct[product.id]?.revenue ?? 0) > 0
                      ? formatMoney(
                          performance.byProduct[product.id]?.revenue ?? 0,
                          product.currency,
                        )
                      : ""}
                  </td>
                  )}
                  {table.isVisible("conversion") && (
                  <td className="truncate px-4 py-3 tabular-nums">
                    {formatConversion(
                      performance.byProduct[product.id]?.conversion,
                    )}
                  </td>
                  )}
                  <DataTableSettingsCell>
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`${getProductPublicPath(product)}${
                          product.status === "published" &&
                          product.environment === "live"
                            ? ""
                            : "?preview"
                        }`}
                        target="_blank"
                        aria-label={`Open checkout for ${product.name}`}
                        title="Open checkout"
                        className={dashboardIconButtonClass}
                      >
                        <ArrowSquareOut size={18} aria-hidden />
                      </Link>
                      <ProductActionsMenu
                        id={product.id}
                        name={product.name}
                        status={product.status}
                      />
                    </div>
                  </DataTableSettingsCell>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
