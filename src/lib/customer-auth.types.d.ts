export interface CustomerAccount {
  id: string;
  email: string;
  name?: string;
  avatarImageUrl?: string;
  passwordHash?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicCustomer {
  id: string;
  email: string;
  name?: string;
  avatarImageUrl?: string;
  hasPassword: boolean;
}
