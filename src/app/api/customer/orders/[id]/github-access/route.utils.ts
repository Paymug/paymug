import { z } from "zod";
import { getCustomerSession } from "@/lib/customer-auth";
import {
  inviteCustomerGitHubAccess,
  revokeCustomerGitHubAccess,
} from "@/lib/customer-github-access";
import { jsonError } from "@/lib/utils";
import type { CustomerGitHubAccessRouteContext } from "./route.types";
import { requireProFeature } from "@/lib/pro-feature-access";

const identitySchema = z.object({
  identity: z.string().trim().min(1).max(254),
});

export async function inviteCustomerRepositoryAccess(
  request: Request,
  context: CustomerGitHubAccessRouteContext,
): Promise<Response> {
  const customer = await getCustomerSession();
  if (!customer) return jsonError("Unauthorized", 401);
  const denied = await requireProFeature("private_github");
  if (denied) return denied;
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return jsonError("Enter a GitHub username or email", 400);
  }
  const parsed = identitySchema.safeParse(input);
  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message || "Enter a GitHub username or email",
      400,
    );
  }
  try {
    const { id } = await context.params;
    return Response.json(
      await inviteCustomerGitHubAccess(
        id,
        customer.email,
        parsed.data.identity,
      ),
    );
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Could not send the GitHub invitation",
      400,
    );
  }
}

export async function revokeCustomerRepositoryAccess(
  _request: Request,
  context: CustomerGitHubAccessRouteContext,
): Promise<Response> {
  const customer = await getCustomerSession();
  if (!customer) return jsonError("Unauthorized", 401);
  try {
    const { id } = await context.params;
    return Response.json(
      await revokeCustomerGitHubAccess(id, customer.email),
    );
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Could not revoke GitHub repository access",
      400,
    );
  }
}
