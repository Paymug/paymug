import { execFileSync } from "node:child_process";

function readGit(args) {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function parseGitHubRepository(remoteUrl) {
  const match = remoteUrl
    .replace(/\.git$/, "")
    .match(/github\.com[/:]([^/]+\/[^/]+)$/i);
  return match?.[1] || "";
}

export async function resolvePaymugBuildInfo(args) {
  const repository =
    args[0] ||
    process.env.GITHUB_REPOSITORY ||
    parseGitHubRepository(readGit(["remote", "get-url", "origin"]));

  return {
    repository,
  };
}
