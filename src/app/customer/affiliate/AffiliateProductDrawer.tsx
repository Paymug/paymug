"use client";

import { Check, Copy, X } from "@phosphor-icons/react";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Alert } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import type { AffiliateEmbedFormat } from "./AffiliateReferralTools.types";
import type { AffiliateProductDrawerProps } from "./AffiliateProductDrawer.types";
import {
  buildAffiliateEmbedCode,
  getProductAffiliatePath,
} from "./affiliate-referral-tools.utils";

export function AffiliateProductDrawer({
  product,
  program,
  onClose,
}: AffiliateProductDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [format, setFormat] = useState<AffiliateEmbedFormat>("text");
  const [copied, setCopied] = useState<string | null>(null);
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
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setClosing(true);
        setVisible(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mounted]);
  useEffect(() => {
    if (!closing) return;
    const timeout = window.setTimeout(onClose, 300);
    return () => window.clearTimeout(timeout);
  }, [closing, onClose]);
  if (!mounted || !program.affiliate) return null;

  const trackingPath = getProductAffiliatePath(
    product.id,
    program.affiliate.code,
  );
  const trackingUrl = `${window.location.origin}${trackingPath}`;
  const embedCode = buildAffiliateEmbedCode(format, trackingUrl, product);

  async function copy(value: string, key: string) {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1600);
  }

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
        <header className="border-b border-[#e8e8ee] px-5 py-5 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
              ) : (
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-[#fff6d1] text-lg font-bold text-[#9b7600]">
                  {product.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                {/* <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#b08500]">
                  Affiliate product
                </p> */}
                <h2 id={titleId} className="truncate text-xl font-semibold">
                  {product.name}
                </h2>
                <p className="text-sm text-[#85859d]">
                  {formatMoney(product.price, product.currency)} · {program.storeName}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setClosing(true);
                setVisible(false);
              }}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#77778a] transition hover:bg-[#f4f4f7]"
              aria-label="Close product details"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-5 py-6 sm:px-7">
          {!program.affiliate.usernameLocked ? (
            <Alert>
              Set your permanent referral username from Affiliate Overview
              before publishing product links.
            </Alert>
          ) : (
            <>
              <section>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">Affiliate link</h3>
                    <p className="mt-1 text-sm text-[#85859d]">
                      Tracks the visit before opening this product checkout.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void copy(trackingUrl, "link")}
                    className="flex items-center gap-2 rounded-lg border border-[#e8e8ee] px-3 py-2 text-xs font-semibold"
                  >
                    {copied === "link" ? <Check size={15} /> : <Copy size={15} />}
                    {copied === "link" ? "Copied" : "Copy link"}
                  </button>
                </div>
                <code className="mt-3 block overflow-x-auto rounded-xl bg-[#f7f7f9] p-3 text-xs text-[#696978]">
                  {trackingUrl}
                </code>
              </section>

              <section>
                <h3 className="text-sm font-semibold">Embed format</h3>
                <div className="mt-3 flex w-fit rounded-lg bg-[#f4f4f7] p-1">
                  {(["text", "button", "card"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setFormat(option)}
                      className={`rounded-md px-4 py-2 text-xs font-semibold capitalize transition ${
                        format === option
                          ? "bg-white text-[#333] shadow-sm"
                          : "text-[#85859d]"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">Preview</h3>
                  <span className="text-xs capitalize text-[#85859d]">{format}</span>
                </div>
                <div className="mt-3 min-h-40 rounded-xl border border-dashed border-[#dcdce4] bg-[#fafafd] p-6">
                  <div
                    className="pointer-events-none"
                    dangerouslySetInnerHTML={{ __html: embedCode }}
                  />
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">HTML code</h3>
                  <button
                    type="button"
                    onClick={() => void copy(embedCode, "html")}
                    className="flex items-center gap-2 rounded-lg border border-[#e8e8ee] px-3 py-2 text-xs font-semibold"
                  >
                    {copied === "html" ? <Check size={15} /> : <Copy size={15} />}
                    {copied === "html" ? "Copied" : "Copy HTML"}
                  </button>
                </div>
                <textarea
                  value={embedCode}
                  readOnly
                  rows={format === "card" ? 7 : 4}
                  className="mt-3 w-full resize-none rounded-xl border border-[#e8e8ee] bg-[#f7f7f9] p-3 font-mono text-xs leading-5 text-[#555563] outline-none"
                />
              </section>
            </>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}
