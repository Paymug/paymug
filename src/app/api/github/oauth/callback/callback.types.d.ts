export type GitHubOAuthCallbackStage =
  | "exchange"
  | "scope"
  | "profile"
  | "encryption"
  | "storage"
  | "store";
