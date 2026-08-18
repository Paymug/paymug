import type {
  LandingBenefit,
  LandingFaq,
  LandingNavLink,
  LandingProofNote,
} from "./landing.types";

export const landingNavLinks: LandingNavLink[] = [
  { href: "#features", label: "Features" },
  { href: "#benefits", label: "Benefits" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#faq", label: "FAQ" },
];

export const landingProofNotes: LandingProofNote[] = [
  {
    icon: "$",
    eyebrow: "DIRECT PAYMENTS",
    title: "Your gateway, your payout",
    detail: "Connect PayPal or Stripe",
    tone: "yellow",
  },
  {
    icon: "✓",
    eyebrow: "AUTOMATIC DELIVERY",
    title: "Sell while you sleep",
    detail: "Files, keys and access",
    tone: "green",
  },
  {
    icon: "∞",
    eyebrow: "RECURRING REVENUE",
    title: "Memberships made simple",
    detail: "Monthly or yearly plans",
    tone: "peach",
  },
  {
    icon: "+",
    eyebrow: "AUDIENCE GROWTH",
    title: "Customers stay yours",
    detail: "Email, discounts and affiliates",
    tone: "blue",
  },
];

export const landingBenefits: LandingBenefit[] = [
  {
    icon: "↗",
    title: "Direct PayPal and Stripe payments",
    description:
      "Connect your own payment gateway so customer payments settle with your provider instead of passing through a merchant of record.",
  },
  {
    icon: "▣",
    title: "Digital product storefront",
    description:
      "Publish polished product pages and a public storefront for downloads, templates, courses, software and other digital goods.",
  },
  {
    icon: "∞",
    title: "Recurring subscriptions",
    description:
      "Create monthly or yearly membership plans, share approval links and manage recurring customers from one dashboard.",
  },
  {
    icon: "⚡",
    title: "Instant digital delivery",
    description:
      "Automatically unlock purchase content after payment and keep order-specific delivery details available to the buyer.",
  },
  {
    icon: "⌁",
    title: "Private GitHub access",
    description:
      "Sell access to private repositories and automate collaborator invitations for software, code and developer products.",
  },
  {
    icon: "⌘",
    title: "Software license keys",
    description:
      "Generate unique license keys for eligible purchases and manage active, expired or revoked licenses in Paymug.",
  },
  {
    icon: "%",
    title: "Discount codes",
    description:
      "Run fixed or percentage promotions with product restrictions, expiration dates and usage limits.",
  },
  {
    icon: "◎",
    title: "Affiliate sales tracking",
    description:
      "Create partner links and track clicks, referrals, commission amounts and affiliate payouts from first visit to sale.",
  },
  {
    icon: "✉",
    title: "Email audience and campaigns",
    description:
      "Capture subscribers at checkout, manage your audience and send product updates or campaigns from your store workspace.",
  },
  {
    icon: "◫",
    title: "Customer self-service portal",
    description:
      "Give buyers a secure place to revisit purchases, delivery content, license keys, subscriptions and payment history.",
  },
  {
    icon: "⌁",
    title: "Sales analytics and order tracking",
    description:
      "Monitor revenue, orders, average order value and refunds across custom date ranges with live store reporting.",
  },
  {
    icon: "◆",
    title: "Bring your own payment gateway",
    description:
      "Connect your own PayPal or Stripe account and receive customer payments directly through your provider.",
  },
  {
    icon: "◉",
    title: "Sandbox and live environments",
    description:
      "Test checkout and delivery workflows safely before switching your store to production payments.",
  },
  {
    icon: "{ }",
    title: "Commerce API keys",
    description:
      "Create revocable API keys and connect your own workflows to products, orders and customer records.",
  },
  {
    icon: "✓",
    title: "Buyer emails and notifications",
    description:
      "Send purchase confirmations automatically and stay informed when payments and important store events happen.",
  },
];

export const landingFaqs: LandingFaq[] = [
  {
    question: "What can I sell with Paymug?",
    answer:
      "Paymug is built for digital products and creator commerce, including ebooks, templates, courses, design assets, downloads, memberships, software licenses and access to private GitHub repositories.",
  },
  {
    question: "Does Paymug hold my money?",
    answer:
      "No. You connect your own PayPal or Stripe account, and payments are processed by the gateway you select. Paymug records the order and handles the customer experience without acting as the merchant of record.",
  },
  {
    question: "Can I sell subscriptions and one-time products?",
    answer:
      "Yes. You can sell one-time digital products and create monthly or yearly subscription plans, then manage purchases, renewals and customers from the same dashboard.",
  },
  {
    question: "How do customers receive their purchase?",
    answer:
      "After a successful payment, Paymug unlocks the product delivery content, sends a purchase confirmation and makes the order available in the customer portal. Eligible products can also issue a license key or grant private GitHub access.",
  },
  {
    question: "Can I grow my audience after a sale?",
    answer:
      "Yes. Paymug includes subscriber management, email campaigns, discount codes and affiliate tracking so you can turn a first purchase into a long-term customer relationship.",
  },
  {
    question: "Can I test my checkout before launching?",
    answer:
      "Yes. Paymug separates sandbox and live environments, so you can test payment, delivery and customer flows before accepting production payments.",
  },
];
