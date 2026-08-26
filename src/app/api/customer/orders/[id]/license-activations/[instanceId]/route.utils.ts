import { z } from "zod";
import { getCustomerSession } from "@/lib/customer-auth";
import { removeCustomerLicenseActivation } from "@/lib/customer-license-activations";
import { jsonError } from "@/lib/utils";
import type { CustomerLicenseActivationRouteContext } from "./route.types";

const instanceIdSchema = z.string().uuid();

export async function removeCustomerDevice(
  _request: Request,
  context: CustomerLicenseActivationRouteContext,
): Promise<Response> {
  const customer = await getCustomerSession();
  if (!customer) return jsonError("Unauthorized", 401);
  const { id, instanceId } = await context.params;
  const parsedInstanceId = instanceIdSchema.safeParse(instanceId);
  if (!parsedInstanceId.success) return jsonError("Invalid device", 400);

  try {
    return Response.json(
      await removeCustomerLicenseActivation(
        id,
        customer.email,
        parsedInstanceId.data,
      ),
    );
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not remove device",
      400,
    );
  }
}
