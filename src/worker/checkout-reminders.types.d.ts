export interface WorkerCheckoutReminderRow {
  id: string;
  store_id: string;
  product_id: string;
  customer_email: string;
  customer_name: string | null;
  product_name: string;
  checkout_url: string;
  created_at: string;
  store_name: string;
  store_email_from: string | null;
  store_email_reply_to: string | null;
}

export interface CheckoutReminderProcessingResult {
  sent: number;
  cancelled: number;
  failed: number;
}
