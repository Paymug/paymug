"use client";

import { ArrowRight, Package } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { formatMoney } from "@/lib/format";
import { calculateAffiliateCommission } from "@/lib/affiliate-settings.utils";
import { CustomerPortalFrame } from "../CustomerPortalFrame";
import { AffiliateProductDrawer } from "./AffiliateProductDrawer";
import type { CustomerAffiliatePortalProps } from "./CustomerAffiliatePortal.types";
import type { CustomerAffiliateProduct } from "@/lib/customer-affiliate-portal.types";

export function CustomerAffiliateProductsPortal({
  customer,
  data,
}: CustomerAffiliatePortalProps) {
  const [selectedStoreId, setSelectedStoreId] = useState(data.programs[0]?.storeId || "");
  const [selectedProduct, setSelectedProduct] = useState<CustomerAffiliateProduct | null>(null);
  const program = data.programs.find((candidate) => candidate.storeId === selectedStoreId) || data.programs[0];
  if (!program) return null;

  return (
    <CustomerPortalFrame
      customer={customer}
      title="Affiliate products"
      affiliateEnabled
      branding={{
        storeSlug: program.storeSlug,
        storeName: program.storeName,
        storeLogoImageUrl: program.storeLogoImageUrl,
      }}
    >
      <div className="mx-auto w-full max-w-[74rem] pt-2 pb-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          {/* <div>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Products you can promote</h2>
            <p className="mt-2 text-sm text-[#85859d]">Open a product to configure its link and embed code.</p>
          </div> */}
          {data.programs.length > 1 && (
            <select
              value={program.storeId}
              onChange={(event) => {
                setSelectedStoreId(event.target.value);
                setSelectedProduct(null);
              }}
              className="min-w-56 rounded-xl border border-[#e8e8ee] bg-white px-3.5 py-2.5 text-sm font-medium outline-none"
            >
              {data.programs.map((option) => <option key={option.storeId} value={option.storeId}>{option.storeName}</option>)}
            </select>
          )}
        </div>

        {program.state !== "active" ? (
          <div className="rounded-2xl border border-[#e8e8ee] bg-[#fafafd] p-8 text-center">
            <Package size={28} className="mx-auto text-[#b08500]" />
            <h3 className="mt-4 text-xl font-semibold">Product links become available after approval</h3>
            <p className="mt-2 text-sm text-[#85859d]">Check your application and referral status from Affiliate Overview.</p>
            <Link href="/customer/affiliate" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#8a6800]">Open overview <ArrowRight size={15} /></Link>
          </div>
        ) : program.products.length ? (
          <div className="overflow-x-auto rounded-2xl border border-[#e8e8ee] bg-white">
            <table className="w-full min-w-[56rem] text-left text-sm">
              <thead>
                <tr className="border-b border-[#e8e8ee] bg-[#fafafd] text-[#85859d]">
                  <th className="w-16 px-4 py-3 font-medium" aria-label="Product image" />
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Store</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Commission</th>
                  <th className="px-4 py-3 font-medium">Referral ID</th>
                  <th className="w-14 px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {program.products.map((product) => {
                  const commission = calculateAffiliateCommission(
                    product.price,
                    program.commissionType,
                    program.commissionValue,
                  );
                  return (
                    <tr
                      key={product.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedProduct(product)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedProduct(product);
                        }
                      }}
                      className="cursor-pointer border-b border-[#eeeeF2] transition last:border-0 hover:bg-[#fffdf6]"
                    >
                      <td className="px-4 py-3">
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
                      </td>
                      <td className="max-w-72 px-4 py-3">
                        <p className="truncate font-semibold">{product.name}</p>
                      </td>
                      <td className="px-4 py-3 text-[#696978]">{program.storeName}</td>
                      <td className="px-4 py-3 font-medium tabular-nums">
                        {formatMoney(product.price, product.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-emerald-700">
                          {formatMoney(Math.round(commission * 100), product.currency)}
                        </p>
                        <p className="mt-1 text-xs capitalize text-[#9292a3]">
                          {program.commissionDuration.replace("_", " ")}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[#696978]">
                        {program.affiliate?.usernameLocked
                          ? program.affiliate.code
                          : "Set username first"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ArrowRight size={18} className="ml-auto text-[#a0a0b2]" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#e8e8ee] p-10 text-center text-sm text-[#85859d]">This store has no published products yet.</div>
        )}
      </div>
      {selectedProduct && (
        <AffiliateProductDrawer product={selectedProduct} program={program} onClose={() => setSelectedProduct(null)} />
      )}
    </CustomerPortalFrame>
  );
}
