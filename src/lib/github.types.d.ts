import type { Order, Product } from "./types";

export interface GitHubViewer {
  id: number;
  login: string;
  email?: string | null;
}

export interface GitHubUserSearchResponse {
  items?: GitHubViewer[];
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  owner: {
    login: string;
  };
  permissions?: {
    admin?: boolean;
  };
}

export interface GitHubOAuthTokenResponse {
  access_token?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

export interface GitHubCollaboratorInvitation {
  id: number;
}

export interface GitHubAccessTarget {
  order: Order;
  product: Product;
}

export interface GitHubRevokeOptions {
  excludeProductId?: string;
  force?: boolean;
}
