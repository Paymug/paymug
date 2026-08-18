import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ServiceWorkerCleanup } from "@/components/ServiceWorkerCleanup";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ),
  title: {
    default: "Sell Digital Products With Your Own Payments | Paymug",
    template: "%s · Paymug",
  },
  description:
    "Create a digital product storefront, accept PayPal or Stripe, sell subscriptions, automate delivery, licenses, email, discounts and affiliates with Paymug.",
  applicationName: "Paymug",
  keywords: [
    "sell digital products",
    "digital product platform",
    "sell downloads online",
    "creator storefront",
    "sell subscriptions online",
    "PayPal digital products",
    "Stripe digital products",
    "digital product checkout",
    "creator commerce platform",
  ],
  category: "commerce",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Paymug",
    title: "Sell Digital Products With Your Own Payments | Paymug",
    description:
      "Launch a creator storefront, sell downloads and subscriptions, and keep control of your payment and customer relationships.",
    images: [
      {
        url: "/og.png",
        width: 1728,
        height: 909,
        alt: "Paymug — Sell digital products on your terms",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sell Digital Products With Your Own Payments | Paymug",
    description:
      "Launch a creator storefront, sell downloads and subscriptions, and keep control of your payment and customer relationships.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        <script
          defer
          src="https://gumanalytics.com/js/analytics.js?v=be9add48f624"
          data-domain="paymug.co"
          data-session-replay="true"
          data-replay-sample-rate="100"
          data-heatmap="true"
          data-heatmap-sample-rate="100"
        ></script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ServiceWorkerCleanup />
        {children}
      </body>
    </html>
  );
}
