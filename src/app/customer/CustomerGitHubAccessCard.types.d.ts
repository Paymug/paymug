import type { Order } from "@/lib/types";

export interface CustomerGitHubAccessCardProps {
  orderId: string;
  repository: string;
  canInvite: boolean;
  initialUsername?: string;
  initialStatus?: Order["githubAccessStatus"];
  initialError?: string;
}

export interface CustomerGitHubAccessResponse {
  username?: string;
  status: Order["githubAccessStatus"];
  error?: string;
}
