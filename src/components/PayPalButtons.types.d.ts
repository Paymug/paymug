export interface PayPalButtonsInstance {
  render: (element: HTMLElement) => Promise<void>;
  close: () => Promise<void>;
}

export interface PayPalButtonActions {
  disable: () => void;
  enable: () => void;
}

export interface PayPalCardField {
  render: (element: HTMLElement | string) => Promise<void>;
  close?: () => Promise<void>;
}

export interface PayPalCardFieldOptions {
  placeholder?: string;
}

export interface PayPalCardFieldsInstance {
  isEligible: () => boolean;
  NameField: (options?: PayPalCardFieldOptions) => PayPalCardField;
  NumberField: (options?: PayPalCardFieldOptions) => PayPalCardField;
  ExpiryField: (options?: PayPalCardFieldOptions) => PayPalCardField;
  CVVField: (options?: PayPalCardFieldOptions) => PayPalCardField;
  submit: () => Promise<void>;
}

export interface PayPalNamespace {
  Buttons: (config: Record<string, unknown>) => PayPalButtonsInstance;
  CardFields?: (
    config: Record<string, unknown>
  ) => PayPalCardFieldsInstance;
}

export interface PayPalCheckoutDetails {
  productId: string;
  customerEmail: string;
  customerName?: string;
  githubUsername?: string;
  discountCode?: string;
  affiliateCode?: string;
  marketingOptIn?: boolean;
}

export interface PayPalCreatedOrder {
  orderId: string;
  paypalOrderId: string;
}

export interface PayPalButtonsProps {
  productId: string;
  customerEmail: string;
  customerName?: string;
  githubUsername?: string;
  discountCode?: string;
  affiliateCode?: string;
  marketingOptIn?: boolean;
  clientId: string;
  mode: "sandbox" | "live";
  currency?: string;
  disabled?: boolean;
  onSuccess: (orderId: string) => void;
  onError?: (message: string) => void;
}
