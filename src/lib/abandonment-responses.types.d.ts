export interface AbandonmentResponse {
  id: string;
  productId?: string;
  email?: string;
  question: string;
  answer?: string;
  marketingOptIn: boolean;
  createdAt: string;
}
