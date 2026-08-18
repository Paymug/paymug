import { Check } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppIcon } from "@/components/dashboard/Icon";
import { StorefrontFooter } from "@/components/StorefrontFooter";
import { StoreTestModeRibbon } from "@/components/StoreTestModeRibbon";
import { findUserById, listProductsByUser } from "@/lib/db";
import { listStorePages } from "@/lib/store-pages";
import { getPrimaryStore, getStoreBySlug } from "@/lib/stores";
import { getStorefrontBasePath } from "@/lib/storefront-paths";
import { AffiliateApplicationForm } from "./AffiliateApplicationForm";
import { AffiliateEarningsCalculator } from "./AffiliateEarningsCalculator";
import {
  getAffiliateAttributionSummary,
  getAffiliateCommissionSummary,
} from "./affiliate-program.utils";
import type { AffiliateProgramPageProps } from "./page.types";
import { generateAffiliateProgramMetadata } from "./page-metadata.utils";
import { hasProFeature } from "@/lib/app-license";

export const generateMetadata = generateAffiliateProgramMetadata;

const affiliateFaqs = [
  {
    question: "How do I receive my affiliate link?",
    answer:
      "Submit the application above. Once the store approves it, your personal referral link becomes active and can be shared with your audience.",
  },
  {
    question: "Which purchases qualify for commission?",
    answer:
      "Eligible completed purchases made after a customer follows your referral link qualify according to the store's attribution and commission settings.",
  },
  {
    question: "How are referrals attributed?",
    answer:
      "The store's configured attribution model decides whether the first or most recent affiliate visit receives credit before checkout.",
  },
  {
    question: "When will I receive a payout?",
    answer:
      "Approved earnings are tracked by the store. The store owner reviews commissions and coordinates the payout schedule with each affiliate.",
  },
];

export default async function AffiliateProgramPage({
  params,
}: AffiliateProgramPageProps) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store?.affiliatesEnabled || !(await hasProFeature("affiliates"))) {
    notFound();
  }
  const seller = await findUserById(store.userId);
  if (!seller) notFound();
  const environment = seller.environment;
  const [allProducts, storePages, primaryStore] = await Promise.all([
    listProductsByUser(store.userId, store.id, environment),
    listStorePages(store.userId, store.id, environment),
    getPrimaryStore(),
  ]);
  const storefrontBasePath = getStorefrontBasePath(store, primaryStore);
  const products = allProducts.filter((product) => product.status === "published");
  const publishedPages = storePages.filter((page) => page.status === "published");
  const topPages = publishedPages.filter((page) => page.navigation === "top");
  const footerPages = publishedPages.filter(
    (page) => page.navigation === "footer",
  );
  const initialProduct = products[0];

  return (
    <div className="landing-page min-h-screen">
      {environment === "sandbox" && <StoreTestModeRibbon />}
      <main>
        <header className="mx-auto flex w-full max-w-[73.75rem] flex-col justify-between gap-8 px-6 py-10 sm:flex-row sm:items-start sm:px-8">
          <div className="flex max-w-xl flex-col items-start">
            {store.logoImageUrl ? (
              <img
                src={store.logoImageUrl}
                alt={`${store.name} logo`}
                className="h-12 w-12 rounded-xl object-cover"
              />
            ) : (
              <AppIcon size={48} />
            )}
            <p className="mt-4 text-xl font-bold tracking-tight">{store.name}</p>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#777269]">
              {store.description || "Digital products worth sharing."}
            </p>
          </div>
          <nav
            className="grid shrink-0 grid-flow-col auto-cols-max gap-5 sm:text-right"
            aria-label="Store navigation"
          >
            <Link
              href={storefrontBasePath || "/"}
              className="text-sm font-semibold hover:text-[#9b7600]"
            >
              Back to store
            </Link>
            {topPages.map((page) => (
              <Link
                key={page.id}
                href={`${storefrontBasePath}/${page.slug}`}
                className="text-sm font-semibold hover:text-[#9b7600]"
              >
                {page.title}
              </Link>
            ))}
            <Link
              href="/customer/login"
              className="text-sm font-semibold hover:text-[#9b7600]"
            >
              Customer portal
            </Link>
          </nav>
        </header>

        <section className="bg-[#f7f3e9] px-6 py-16 sm:px-8 lg:py-24">
          <div className="mx-auto grid max-w-[73.75rem] gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.72fr)] lg:items-start">
            <div className="max-w-2xl">
              <p className="landing-eyebrow">{store.name} affiliate program</p>
              <h1 className="mt-4 text-5xl font-extrabold leading-[0.98] tracking-[-0.055em] sm:text-6xl">
                Earn by sharing products you believe in.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-[#6d6a62]">
                Apply for a personal referral link, introduce your audience to
                {` ${store.name}`}, and earn commission from eligible purchases.
              </p>
              <div className="mt-9 space-y-4">
                {[
                  getAffiliateCommissionSummary(store),
                  getAffiliateAttributionSummary(store),
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#dff4dc] text-[#267a4c]">
                      <Check size={14} weight="bold" aria-hidden />
                    </span>
                    <p className="text-sm leading-6 text-[#55534d]">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <section
              id="apply"
              className="rounded-[1.75rem] border border-[#e5dfd2] bg-white p-6 shadow-[0_18px_50px_rgba(58,48,20,0.08)] sm:p-8"
            >
              <p className="landing-eyebrow">Apply now</p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight">
                Join the affiliate program
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#777269]">
                Tell us who you are. Applications are reviewed before referral
                links become active.
              </p>
              <div className="mt-6">
                <AffiliateApplicationForm storeSlug={store.slug} />
              </div>
            </section>
          </div>
        </section>

        <AffiliateEarningsCalculator
          currency={initialProduct?.currency || store.currency}
          initialPriceCents={initialProduct?.price ?? 10000}
          commissionType={store.affiliateCommissionType}
          commissionValue={store.affiliateCommissionValue}
          commissionDuration={store.affiliateCommissionDuration}
        />

        <section
          className="landing-how"
          id="how-it-works"
          aria-labelledby="affiliate-how-title"
        >
          <div className="landing-how__header">
            <p className="landing-eyebrow">How the affiliate program works</p>
            <h2 id="affiliate-how-title">Share, refer, and earn in three steps.</h2>
            <p>A straightforward path from application to commission.</p>
          </div>
          <ol>
            <li>
              <span>1</span>
              <div>
                <h3>Apply to join</h3>
                <p>Share your name and email so the store can review your application.</p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <h3>Share your link</h3>
                <p>Use your approved personal referral link in content your audience trusts.</p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <h3>Earn commission</h3>
                <p>Eligible attributed purchases are recorded and added to your earnings.</p>
              </div>
            </li>
          </ol>
          <a className="landing-button landing-button--light" href="#apply">
            Apply to join <span aria-hidden="true">→</span>
          </a>
        </section>

        <section
          className="landing-faq mx-auto max-w-[73.75rem]"
          id="faq"
          aria-labelledby="affiliate-faq-title"
        >
          <div className="landing-faq__heading">
            <p className="landing-eyebrow">Frequently asked questions</p>
            <h2 id="affiliate-faq-title">Everything to know before you share.</h2>
            <p>Program basics, attribution, earnings, and payouts.</p>
          </div>
          <div className="landing-faq__list">
            {affiliateFaqs.map((faq, index) => (
              <details key={faq.question} open={index === 0}>
                <summary>
                  {faq.question}<span aria-hidden="true">+</span>
                </summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="landing-final-cta" aria-labelledby="affiliate-cta-title">
          <div>
            <p className="landing-kicker"><span>✦</span> Ready to start earning?</p>
            <h2 id="affiliate-cta-title">Turn trusted recommendations into revenue.</h2>
            <p>Apply today and receive your referral link after approval.</p>
            <a className="landing-button landing-button--hero" href="#apply">
              Join the program <span aria-hidden="true">→</span>
            </a>
          </div>
        </section>
      </main>

      <StorefrontFooter pages={footerPages} basePath={storefrontBasePath} />
    </div>
  );
}
