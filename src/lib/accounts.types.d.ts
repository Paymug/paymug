import type { PayPalMode } from "./types";

export interface CreateAccountInput {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  environment: PayPalMode;
  createdAt: string;
}
