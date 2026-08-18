import type { Product, User } from "./types";

export type CreateUserInput = Omit<
  User,
  | "activeStoreId"
  | "storeCoverImageUrl"
  | "storeEmailFrom"
  | "storeEmailReplyTo"
> & {
  activeStoreId?: string;
  storeCoverImageUrl?: string;
  storeEmailFrom?: string;
  storeEmailReplyTo?: string;
};

export type UpdateProductInput = Partial<
  Omit<Product, "id" | "userId" | "createdAt" | "imageUrl">
> & {
  imageUrl?: string | null;
};
