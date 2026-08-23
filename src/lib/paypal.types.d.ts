export interface PayPalCapturedOrder {
  id: string;
  status: string;
  captureId?: string;
  payerEmail?: string;
  payerName?: string;
  amount?: number;
  currency?: string;
}
