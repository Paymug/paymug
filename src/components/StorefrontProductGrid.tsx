import Link from "next/link";
import { getProductDescriptionPlainText } from "./product-description.utils";
import { formatMoney } from "@/lib/format";
import {
  formatLicenseUpdatePeriodLabel,
  isPerpetualLicenseProduct,
} from "@/lib/license-entitlements";
import { formatProductPriceSuffix } from "@/lib/product-billing";
import { getProductPublicPath } from "@/lib/product-paths";
import type { StorefrontProductGridProps } from "./StorefrontProductGrid.types";
import { getProductStartingPrice } from "@/lib/product-configurations";

export function StorefrontProductGrid({
  products,
  isTestMode,
  displayPurchases,
  className = "",
}: StorefrontProductGridProps) {
  return (
    <div className={`grid gap-5 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {products.map((product) => (
        <Link
          key={product.id}
          href={`${getProductPublicPath(product)}${isTestMode ? "?preview" : ""}`}
          className="group flex flex-col transition shadow-gray-300/20"
        >
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="aspect-[16/9] w-full rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-28 items-center justify-center bg-accent-soft text-3xl">
              📦
            </div>
          )}
          <h3 className="mt-4 font-semibold group-hover:text-accent-dark">
            {product.name}
          </h3>
          <p
            className="mt-1 line-clamp-2 flex-1 text-sm text-muted"
            dangerouslySetInnerHTML={{
              __html:
                getProductDescriptionPlainText(product.description) ||
                "Digital product",
            }}
          />
          <div className="mt-4 flex flex-row justify-between">
            <p className="text-lg font-bold">
              {!!product.options.length && "From "}
              {formatMoney(getProductStartingPrice(product), product.currency)}
              {formatProductPriceSuffix(product)}
            </p>
            {displayPurchases && product.purchaseCount ? (
              <p className="mt-1 text-xs text-muted">
                {product.purchaseCount.toLocaleString()} purchased
              </p>
            ) : null}
          </div>
          {isPerpetualLicenseProduct(product) && (
            <p className="mt-1 text-xs text-muted">
              Lifetime use ·{" "}
              {formatLicenseUpdatePeriodLabel(
                product.licenseUpdatePeriodUnit || "year",
                product.licenseUpdatePeriodCount,
              )}{" "}
              of updates
            </p>
          )}
        </Link>
      ))}
    </div>
  );
}
