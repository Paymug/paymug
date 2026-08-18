export interface BuyPageProps {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{
    cancelled?: string;
    discount?: string;
    preview?: string;
    ref?: string;
  }>;
}
