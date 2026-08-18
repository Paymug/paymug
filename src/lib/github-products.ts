import "server-only";

import { decryptSecret } from "./crypto";
import { getGitHubConnection } from "./db";
import {
  findGitHubUserByPublicEmail,
  getGitHubUser,
  listGitHubAdminRepositories,
} from "./github-api";

export async function validateGitHubProductRepository(
  userId: string,
  storeId: string,
  owner?: string | null,
  repository?: string | null
): Promise<void> {
  if (!owner && !repository) return;
  if (!owner || !repository) {
    throw new Error("Choose a complete GitHub repository");
  }

  const connection = await getGitHubConnection(userId, storeId);
  if (!connection) {
    throw new Error("Authorize GitHub before selecting a private repository");
  }
  const repositories = await listGitHubAdminRepositories(
    await decryptSecret(connection.accessTokenEncrypted)
  );
  const selected = repositories.some(
    (candidate) =>
      candidate.owner.login.toLowerCase() === owner.toLowerCase() &&
      candidate.name.toLowerCase() === repository.toLowerCase()
  );
  if (!selected) {
    throw new Error(
      "The selected private repository is unavailable or requires administrator permission"
    );
  }
}

export async function validateGitHubBuyerUsername(
  userId: string,
  storeId: string,
  username: string
): Promise<string> {
  const connection = await getGitHubConnection(userId, storeId);
  if (!connection) {
    throw new Error(
      "The seller must reconnect GitHub before this product can be purchased"
    );
  }
  const user = await getGitHubUser(
    await decryptSecret(connection.accessTokenEncrypted),
    username
  );
  return user.login;
}

export async function resolveGitHubBuyerIdentity(
  userId: string,
  storeId: string,
  identity: string
): Promise<string> {
  const normalizedIdentity = identity.trim();
  const username = normalizedIdentity.startsWith("@")
    ? normalizedIdentity.slice(1)
    : normalizedIdentity;
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedIdentity);
  if (!isEmail) {
    if (!/^(?!-)(?!.*--)[A-Za-z0-9-]{1,39}(?<!-)$/.test(username)) {
      throw new Error("Enter a valid GitHub username or public profile email");
    }
    return validateGitHubBuyerUsername(userId, storeId, username);
  }
  const connection = await getGitHubConnection(userId, storeId);
  if (!connection) {
    throw new Error(
      "The seller must reconnect GitHub before repository access can be granted"
    );
  }
  const user = await findGitHubUserByPublicEmail(
    await decryptSecret(connection.accessTokenEncrypted),
    normalizedIdentity
  );
  if (!user) {
    throw new Error(
      "GitHub could not find a profile with that public email. Enter the GitHub username instead."
    );
  }
  return user.login;
}
