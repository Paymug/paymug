export interface PublicPageMetadataInput {
  title: string;
  description: string;
  canonicalPath: string;
  siteName: string;
  imageUrl: string;
  imageAlt: string;
  keywords: string[];
  index?: boolean;
}
