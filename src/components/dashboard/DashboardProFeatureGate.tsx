"use client";

import { Crown } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  proDashboardPaths,
  proFeatureLabels,
  proPurchaseUrl,
} from "@/lib/app-license.config";
import type { DashboardProFeatureGateProps } from "./DashboardProFeatureGate.types";

export function DashboardProFeatureGate({
  license,
  children,
}: DashboardProFeatureGateProps) {
  const pathname = usePathname();
  const gated = proDashboardPaths.find(({ prefix }) =>
    pathname.startsWith(prefix),
  );
  const locked =
    gated && (!license.pro || !license.features.includes(gated.feature));

  return (
    <div className="relative min-h-full">
      {children}
      {locked && (
        <div className="absolute inset-0 z-40 flex min-h-[34rem] items-start justify-center bg-white/60 px-4 pt-24 backdrop-blur-[2px]">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="pro-feature-title"
            className="w-full max-w-md rounded-2xl border border-[#e8e8ee] bg-white p-7 text-center shadow-[0_24px_70px_rgba(24,22,32,0.18)]"
          >
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-accent-soft text-[#8a6800]">
              <Crown size={24} weight="fill" />
            </span>
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-[#9b7600]">
              Paymug Pro
            </p>
            <h2 id="pro-feature-title" className="mt-2 text-2xl font-semibold tracking-tight">
              Unlock {proFeatureLabels[gated.feature]}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Upgrade to Paymug Pro to use this feature on your store.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3">
              <a
                href={proPurchaseUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-dark hover:bg-accent-hover"
              >
                Get Paymug Pro
              </a>
              <Link
                href="/dashboard/settings/license"
                className="text-sm font-medium text-muted underline-offset-4 hover:text-foreground hover:underline"
              >
                I already have a license key
              </Link>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
