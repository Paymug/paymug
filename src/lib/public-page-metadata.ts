import type { Metadata } from "next";
import type { PublicPageMetadataInput } from "./public-page-metadata.types";

export function normalizeMetadataDescription(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= 160) return normalized;
  return `${normalized.slice(0, 157).trimEnd()}…`;
}

export function getStoreSocialImagePath(slug: string): string {
  return `/og/store/${encodeURIComponent(slug)}`;
}

export function getProductSocialImagePath(productId: string): string {
  return `/og/product/${encodeURIComponent(productId)}`;
}

export function buildPublicPageMetadata(
  input: PublicPageMetadataInput,
): Metadata {
  const description = normalizeMetadataDescription(input.description);
  const index = input.index !== false;

  return {
    title: input.title,
    description,
    applicationName: "Paymug",
    authors: [{ name: input.siteName }],
    creator: input.siteName,
    publisher: input.siteName,
    category: "commerce",
    keywords: [...new Set(input.keywords.filter(Boolean))],
    alternates: {
      canonical: input.canonicalPath,
    },
    robots: {
      index,
      follow: index,
      googleBot: {
        index,
        follow: index,
      },
    },
    formatDetection: {
      address: false,
      email: false,
      telephone: false,
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: input.canonicalPath,
      siteName: input.siteName,
      title: input.title,
      description,
      images: [
        {
          url: input.imageUrl,
          alt: input.imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description,
      images: [input.imageUrl],
    },
  };
}
