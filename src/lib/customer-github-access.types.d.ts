import type { Order } from "./types";

export interface CustomerGitHubAccessResult {
  username?: string;
  status: Order["githubAccessStatus"];
  error?: string;
}
