export interface StorefrontPageProps {
  params: Promise<{ slug: string }>;
  renderPrimaryStore?: boolean;
}
