import type { Product, User } from "./types";

export type CreateUserInput = Omit<
  User,
  | "activeStoreId"
  | "primaryStoreId"
  | "storeCoverImageUrl"
  | "storeEmailFrom"
  | "storeEmailReplyTo"
> & {
  activeStoreId?: string;
  primaryStoreId?: string;
  storeCoverImageUrl?: string;
  storeEmailFrom?: string;
  storeEmailReplyTo?: string;
};

export type UpdateProductInput = Partial<
  Omit<
    Product,
    | "id"
    | "userId"
    | "createdAt"
    | "imageUrl"
    | "redirectUrl"
    | "categoryId"
    | "categoryIds"
  >
> & {
  imageUrl?: string | null;
  redirectUrl?: string | null;
  categoryId?: string | null;
  categoryIds?: string[];
};
