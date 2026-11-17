export const paymugUpdateConfig = {
  upstreamRepository: "Paymug/paymug",
  upstreamBranch: "main",
  deploymentsUrl: "https://api.paymug.co/deployments",
  workflowFile: "sync-upstream.yml",
  githubApiUrl: "https://api.github.com",
  githubApiVersion: "2022-11-28",
} as const;
