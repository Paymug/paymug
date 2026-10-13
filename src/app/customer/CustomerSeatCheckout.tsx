"use client";

import { ArrowLeft, Package, X } from "@phosphor-icons/react";
import { CheckoutClient } from "@/app/buy/[productId]/CheckoutClient";
import {
  calculateSeatAddOnPrice,
  extraSeatsCustomKey,
  seatAddOnCustomKey,
} from "@/lib/extra-seats";
import { formatMoney } from "@/lib/format";
import { calculateTransactionFee } from "@/lib/product-pricing";
import { getCustomerStatusClass } from "./customer-portal.utils";
import type { CustomerSeatCheckoutProps } from "./CustomerSeatCheckout.types";

/** Drawer content that replaces the purchase details while buying seats. */
export function CustomerSeatCheckout({
  purchase,
  seats,
  onBack,
  onClose,
}: CustomerSeatCheckoutProps) {
  const seatAddOn = purchase.seatAddOn;
  if (!seatAddOn) return null;
  const price = calculateSeatAddOnPrice(
    seatAddOn.tiers,
    seatAddOn.currentExtraSeats,
    seats,
  );
  const transactionFee = calculateTransactionFee(
    price,
    seatAddOn.transactionFeeType,
    seatAddOn.transactionFeeValue,
  );

  return (
    <>
      <header className="shrink-0 px-5 pt-4 pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#77778a] transition hover:bg-[#f4f4f7] hover:text-[#333]"
              aria-label="Back to purchase details"
            >
              <ArrowLeft size={18} />
            </button>
            <h2 className="text-lg font-medium">
              {seatAddOn.label}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#77778a] transition hover:bg-[#f4f4f7] hover:text-[#333]"
            aria-label="Close"
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

      <div className="min-h-0 flex-1 overflow-y-auto">
        <CheckoutClient
          key={seats}
          storeId={seatAddOn.storeId}
          productId={seatAddOn.productId}
          productName={purchase.productName}
          productPrice={price}
          defaultProductPrice={price}
          customAmountEnabled={false}
          allowNote={false}
          custom={{
            [seatAddOnCustomKey]: purchase.id,
            [extraSeatsCustomKey]: String(seats),
          }}
          seatAddOn
          lockedEmail={seatAddOn.customerEmail}
          extraSeats={seats}
          extraSeatLabel={seatAddOn.label}
          extraSeatsPrice={price}
          initialTransactionFeeAmount={transactionFee}
          paypalClientId={seatAddOn.paypalClientId}
          stripeEnabled={seatAddOn.stripeEnabled}
          mode={seatAddOn.mode}
          currency={purchase.currency}
        />
      </div>
    </>
  );
}
