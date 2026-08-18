import type { CustomerGitHubAccessResponse } from "./CustomerGitHubAccessCard.types";

async function readGitHubAccessResponse(
  response: Response,
): Promise<CustomerGitHubAccessResponse> {
  const data = (await response.json()) as CustomerGitHubAccessResponse & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(data.error || "Could not update GitHub access");
  }
  return data;
}

export async function invitePurchaseGitHubAccess(
  orderId: string,
  identity: string,
): Promise<CustomerGitHubAccessResponse> {
  return readGitHubAccessResponse(
    await fetch(`/api/customer/orders/${encodeURIComponent(orderId)}/github-access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity }),
    }),
  );
}

export async function revokePurchaseGitHubAccess(
  orderId: string,
): Promise<CustomerGitHubAccessResponse> {
  return readGitHubAccessResponse(
    await fetch(`/api/customer/orders/${encodeURIComponent(orderId)}/github-access`, {
      method: "DELETE",
    }),
  );
}
