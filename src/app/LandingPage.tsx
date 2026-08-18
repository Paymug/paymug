import Link from "next/link";
import { Logo } from "@/components/Logo";
import {
  landingBenefits,
  landingFaqs,
  landingNavLinks,
  landingProofNotes,
} from "./landing.config";
import type { LandingPageProps } from "./landing.types";

export function LandingPage({ isAuthenticated }: LandingPageProps) {
  const primaryHref = isAuthenticated ? "/dashboard" : "/signup";
  const primaryLabel = isAuthenticated ? "Open dashboard" : "Start selling free";
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "Paymug",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        ...(siteUrl ? { url: siteUrl } : {}),
        description:
          "A creator commerce platform for selling digital products and subscriptions with your own PayPal or Stripe account.",
        featureList: landingBenefits.map((benefit) => benefit.title),
      },
      {
        "@type": "FAQPage",
        mainEntity: landingFaqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      },
    ],
  };

  return (
    <div className="landing-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <header className="landing-header">
        <div className="landing-header__inner">
          <Logo />
          <nav className="landing-nav" aria-label="Main navigation">
            {landingNavLinks.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>
          <div className="landing-header__actions">
            {isAuthenticated ? (
              <Link className="landing-link-button" href="/dashboard">
                Dashboard
              </Link>
            ) : (
              <Link className="landing-link-button landing-sign-in" href="/login">
                Sign in
              </Link>
            )}
            <Link className="landing-button landing-button--small" href={primaryHref}>
              {isAuthenticated ? "Open app" : "Get started"}
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-hero__glow" aria-hidden="true" />
          <div className="landing-proof-notes" aria-hidden="true">
            {landingProofNotes.map((note) => (
              <div
                className={`landing-proof-card landing-proof-card--${note.tone}`}
                key={note.title}
              >
                <span className="landing-proof-card__mark">{note.icon}</span>
                <p>{note.eyebrow}</p>
                <strong>{note.title}</strong>
                <small>{note.detail}</small>
              </div>
            ))}
          </div>

          <div className="landing-hero__content">
            <p className="landing-kicker">
              <span>✦</span> Creator commerce, without the lock-in
            </p>
            <h1 id="landing-title">
              Sell digital products
              <span>on your terms.</span>
            </h1>
            <p className="landing-hero__copy">
              Build a storefront, accept payments through your own PayPal or
              Stripe account, and grow one-time buyers into a business you own.
            </p>
            <div className="landing-hero__actions">
              <Link className="landing-button landing-button--hero" href={primaryHref}>
                {primaryLabel} <span aria-hidden="true">→</span>
              </Link>
              <a className="landing-text-link" href="#features">
                Explore every feature
              </a>
            </div>
            <p className="landing-hero__note">
              No merchant-of-record lock-in · Sandbox included · Launch in minutes
            </p>
          </div>
        </section>

        <section className="landing-integrations" aria-label="Supported platform capabilities">
          <p>One platform for your entire creator business</p>
          <div>
            <span><b>P</b> PayPal</span>
            <span><b>S</b> Stripe</span>
            <span><b>G</b> GitHub</span>
            <span><b>@</b> Email</span>
            <span><b>{"{}"}</b> API</span>
          </div>
        </section>

        <div className="landing-feature-region" id="features">
          <section className="landing-feature-panel" aria-labelledby="payments-title">
            <div className="landing-section-copy">
              <p className="landing-eyebrow">PAYMENTS</p>
              <h2 id="payments-title">Accept payments directly, without giving up control.</h2>
              <p>
                Connect your own PayPal or Stripe account. Paymug hosts the
                checkout, records every order and delivers the purchase while
                your payment provider handles the funds.
              </p>
              <ul className="landing-inline-benefits">
                <li><span>✓</span> Your payment account</li>
                <li><span>✓</span> Your customer relationship</li>
                <li><span>✓</span> Sandbox and live modes</li>
              </ul>
            </div>

            <div className="payment-scene" aria-label="Example Paymug checkout">
              <div className="payment-float payment-float--left">
                <span>New order</span>
                <strong>+$49.00</strong>
                <small>Paid via Stripe</small>
              </div>
              <div className="checkout-card">
                <div className="checkout-card__top">
                  <span className="checkout-lock">●</span>
                  Secure checkout
                </div>
                <div className="checkout-product">
                  <div className="checkout-product__art">C</div>
                  <div>
                    <p>Creator Launch Kit</p>
                    <span>Digital download</span>
                  </div>
                  <strong>$49</strong>
                </div>
                <label>Email address</label>
                <div className="checkout-input">you@example.com</div>
                <button className="checkout-pay checkout-pay--paypal" type="button" tabIndex={-1}>
                  PayPal
                </button>
                <button className="checkout-pay checkout-pay--stripe" type="button" tabIndex={-1}>
                  Pay with card
                </button>
                <p className="checkout-secure">Encrypted checkout · Instant delivery</p>
              </div>
              <div className="payment-float payment-float--right">
                <span>Gateway</span>
                <strong>Your account</strong>
                <small>Paymug never holds funds</small>
              </div>
            </div>
          </section>

          <section className="landing-feature-panel" aria-labelledby="products-title">
            <div className="landing-section-copy">
              <p className="landing-eyebrow">PRODUCTS &amp; SUBSCRIPTIONS</p>
              <h2 id="products-title">Sell once, or earn recurring revenue.</h2>
              <p>
                Turn your expertise into digital products, paid resources and
                memberships. Offer one-time purchases alongside monthly or yearly
                plans from the same storefront.
              </p>
            </div>

            <div className="product-scene" aria-label="Digital product and subscription examples">
              <div className="mini-product mini-product--back">
                <div className="mini-product__cover mini-product__cover--green">
                  <span>PDF</span>
                  <strong>Brand<br />Playbook</strong>
                </div>
                <p>Brand Playbook</p>
                <strong>$29</strong>
              </div>
              <div className="mini-product mini-product--main">
                <div className="mini-product__cover mini-product__cover--yellow">
                  <span>48 LESSONS</span>
                  <strong>Creator<br />Course</strong>
                </div>
                <p>Creator Course</p>
                <div className="mini-rating">★★★★★ <span>4.9</span></div>
                <button type="button" tabIndex={-1}>Buy now · $79</button>
              </div>
              <div className="membership-card">
                <span>PRO MEMBERSHIP</span>
                <strong>$15<small>/month</small></strong>
                <ul>
                  <li>✓ Exclusive downloads</li>
                  <li>✓ Member updates</li>
                  <li>✓ Private resources</li>
                </ul>
                <button type="button" tabIndex={-1}>Join membership</button>
              </div>
              <div className="product-stat product-stat--sales">
                <span>Products sold</span>
                <strong>753</strong>
              </div>
              <div className="product-stat product-stat--members">
                <span>Active members</span>
                <strong>286</strong>
              </div>
            </div>
          </section>

          <section className="landing-feature-panel" aria-labelledby="delivery-title">
            <div className="landing-section-copy">
              <p className="landing-eyebrow">DELIVERY &amp; ACCESS</p>
              <h2 id="delivery-title">Deliver every purchase automatically.</h2>
              <p>
                Give buyers instant access after payment. Paymug keeps downloads,
                licenses, private repository access and order history organized in
                one secure customer portal.
              </p>
            </div>

            <div className="portal-scene" aria-label="Example customer purchase portal">
              <div className="portal-window">
                <div className="portal-window__bar">
                  <div><i /><i /><i /></div>
                  <span>My purchases</span>
                  <b>JD</b>
                </div>
                <div className="portal-window__body">
                  <aside>
                    <strong>Customer portal</strong>
                    <span className="is-active">Purchases</span>
                    <span>Subscriptions</span>
                    <span>Account</span>
                  </aside>
                  <div className="portal-content">
                    <p>AVAILABLE NOW</p>
                    <div className="portal-purchase">
                      <div className="portal-purchase__icon">↓</div>
                      <div>
                        <strong>Creator Launch Kit</strong>
                        <span>Delivery content ready</span>
                      </div>
                      <button type="button" tabIndex={-1}>Download</button>
                    </div>
                    <div className="portal-purchase">
                      <div className="portal-purchase__icon portal-purchase__icon--dark">GH</div>
                      <div>
                        <strong>Private code library</strong>
                        <span>GitHub access granted</span>
                      </div>
                      <button type="button" tabIndex={-1}>Open repo</button>
                    </div>
                    <div className="license-row">
                      <span>LICENSE KEY</span>
                      <code>PAYMUG-8AF21B-91D4C2</code>
                      <b>Active</b>
                    </div>
                  </div>
                </div>
              </div>
              <div className="portal-toast">
                <span>✓</span>
                <div><strong>Purchase delivered</strong><small>Email sent automatically</small></div>
              </div>
            </div>
          </section>

          <section className="landing-feature-panel" aria-labelledby="growth-title">
            <div className="landing-section-copy">
              <p className="landing-eyebrow">GROWTH</p>
              <h2 id="growth-title">Turn every sale into your next customer.</h2>
              <p>
                Build an audience you can reach again. Capture subscribers, send
                email campaigns, reward loyal buyers and let affiliates bring new
                customers to your store.
              </p>
            </div>

            <div className="growth-scene" aria-label="Email and affiliate growth tools">
              <div className="campaign-card">
                <div className="campaign-card__head">
                  <div><span>CAMPAIGN</span><strong>New product launch</strong></div>
                  <b>Sent</b>
                </div>
                <div className="campaign-chart" aria-hidden="true">
                  <i style={{ height: "32%" }} /><i style={{ height: "51%" }} />
                  <i style={{ height: "43%" }} /><i style={{ height: "74%" }} />
                  <i style={{ height: "62%" }} /><i style={{ height: "92%" }} />
                  <i style={{ height: "81%" }} /><i style={{ height: "100%" }} />
                </div>
                <div className="campaign-stats">
                  <span><small>Delivered</small><strong>1,248</strong></span>
                  <span><small>Status</small><strong>Sent</strong></span>
                  <span><small>Audience</small><strong>Main list</strong></span>
                </div>
              </div>
              <div className="affiliate-card">
                <span>AFFILIATE SALE</span>
                <strong>+$12.25</strong>
                <p>Referred by maya.design</p>
                <div><i>↗</i><small>Commission tracked</small><b>25%</b></div>
              </div>
              <div className="discount-card">
                <span>Discount</span>
                <strong>LAUNCH20</strong>
                <b>20% off</b>
              </div>
              <div className="subscriber-card">
                <span>New subscribers</span>
                <strong>+184</strong>
                <small>This month</small>
              </div>
            </div>
          </section>
        </div>

        <section className="landing-ownership" id="benefits" aria-labelledby="ownership-title">
          <div className="landing-ownership__inner">
            <div className="landing-section-copy landing-section-copy--centered">
              <p className="landing-eyebrow">BUILT FOR INDEPENDENCE</p>
              <h2 id="ownership-title">Creator-friendly commerce, without the platform dependency.</h2>
              <p>
                Paymug gives independent sellers the tools of a larger commerce
                stack while keeping the parts that matter under their control.
              </p>
            </div>
            <div className="ownership-grid">
              <article>
                <span>✓</span>
                <div><h3>Own the payment relationship</h3><p>Connect the PayPal or Stripe account you already use. Payments go through the provider you choose.</p></div>
              </article>
              <article>
                <span>✓</span>
                <div><h3>Own the customer relationship</h3><p>Keep useful customer, subscriber and order records in your own creator workspace.</p></div>
              </article>
              <article>
                <span>✓</span>
                <div><h3>Get every tool in one place</h3><p>Replace disconnected checkout, delivery, email, affiliate and analytics tools with one workflow.</p></div>
              </article>
              <article>
                <span>✓</span>
                <div><h3>Launch safely</h3><p>Use separate sandbox and live environments to test purchases before sharing your store.</p></div>
              </article>
            </div>
          </div>
        </section>

        <section className="landing-all-benefits" aria-labelledby="all-benefits-title">
          <div className="landing-section-copy landing-section-copy--centered">
            <p className="landing-eyebrow">EVERYTHING INCLUDED</p>
            <h2 id="all-benefits-title">One digital selling platform, every essential covered.</h2>
            <p>
              From your first product page to repeat purchases and recurring
              revenue, Paymug gives you a practical creator commerce stack.
            </p>
          </div>
          <div className="benefit-grid">
            {landingBenefits.map((benefit) => (
              <article key={benefit.title}>
                <span aria-hidden="true">{benefit.icon}</span>
                <h3>{benefit.title}</h3>
                <p>{benefit.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-how" id="how-it-works" aria-labelledby="how-title">
          <div className="landing-how__header">
            <p className="landing-eyebrow">HOW PAYMUG WORKS</p>
            <h2 id="how-title">From idea to first sale in three steps.</h2>
            <p>No complex commerce stack. No hand-built delivery workflow.</p>
          </div>
          <ol>
            <li><span>1</span><div><h3>Create your storefront</h3><p>Choose a store name, publish a digital product or subscription and add the content customers receive.</p></div></li>
            <li><span>2</span><div><h3>Connect your payment gateway</h3><p>Add your PayPal or Stripe credentials, test the complete checkout in sandbox and switch to live when ready.</p></div></li>
            <li><span>3</span><div><h3>Share, sell and grow</h3><p>Send a product or storefront link. Paymug tracks the order, unlocks access and helps you nurture the buyer.</p></div></li>
          </ol>
          <Link className="landing-button landing-button--light" href={primaryHref}>
            {primaryLabel} <span aria-hidden="true">→</span>
          </Link>
        </section>

        <section className="landing-faq" id="faq" aria-labelledby="faq-title">
          <div className="landing-faq__heading">
            <p className="landing-eyebrow">FREQUENTLY ASKED QUESTIONS</p>
            <h2 id="faq-title">Questions about selling digital products with Paymug.</h2>
            <p>Everything you need to know before opening your creator storefront.</p>
          </div>
          <div className="landing-faq__list">
            {landingFaqs.map((faq, index) => (
              <details key={faq.question} open={index === 0}>
                <summary>{faq.question}<span aria-hidden="true">+</span></summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="landing-final-cta" aria-labelledby="final-cta-title">
          <div>
            <p className="landing-kicker"><span>✦</span> Your next sale starts here</p>
            <h2 id="final-cta-title">Build the digital business you actually own.</h2>
            <p>Launch your store, connect your gateway and start selling in minutes.</p>
            <Link className="landing-button landing-button--hero" href={primaryHref}>
              {primaryLabel} <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer__main">
          <div>
            <Logo size="lg" />
            <p>Sell digital products and subscriptions with your own payments.</p>
          </div>
          <nav aria-label="Footer navigation">
            {landingNavLinks.map((link) => (
              <a key={link.href} href={link.href}>{link.label}</a>
            ))}
            <Link href={isAuthenticated ? "/dashboard" : "/login"}>
              {isAuthenticated ? "Dashboard" : "Sign in"}
            </Link>
          </nav>
        </div>
        <div className="landing-footer__bottom">
          <p>© {new Date().getFullYear()} Paymug. Creator commerce, on your terms.</p>
          <p>PayPal · Stripe · Digital products · Subscriptions</p>
        </div>
      </footer>
    </div>
  );
}
