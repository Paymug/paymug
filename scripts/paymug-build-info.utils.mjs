import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

export const paymugUpstreamRepository = "hieunc/paymug";

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

async function readExistingBuildInfo(outputPath) {
  try {
    const source = await readFile(outputPath, "utf8");
    const match = source.match(/paymugBuildInfo\s*=\s*(\{[\s\S]*?\})\s*as const/);
    return match ? JSON.parse(match[1]) : {};
  } catch {
    return {};
  }
}

export async function resolvePaymugBuildInfo(args, outputPath) {
  const existing = await readExistingBuildInfo(outputPath);
  const repository =
    args[0] ||
    process.env.GITHUB_REPOSITORY ||
    parseGitHubRepository(readGit(["remote", "get-url", "origin"]));
  const commitSha =
    args[1] === "-"
      ? existing.commitSha || ""
      : args[1] ||
        process.env.WORKERS_CI_COMMIT_SHA ||
        process.env.GITHUB_SHA ||
        readGit(["rev-parse", "HEAD"]);
  const upstreamRepository =
    args[2] || paymugUpstreamRepository;
  const upstreamSha =
    args[3] ||
    process.env.PAYMUG_INSTALLED_UPSTREAM_SHA ||
    existing.upstreamSha ||
    commitSha;

  return {
    repository,
    upstreamRepository,
    commitSha,
    upstreamSha,
  };
}
