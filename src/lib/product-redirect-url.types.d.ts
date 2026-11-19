export interface ProductRedirectValues {
  orderId: string;
  email: string;
  productId: string;
  /** Checkout custom data, available as [custom][name] placeholders. */
  custom?: Record<string, string>;
}
