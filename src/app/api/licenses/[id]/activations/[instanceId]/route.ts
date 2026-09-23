import { getSessionUser } from "@/lib/auth";
import { removeStoreLicenseActivation } from "@/lib/customer-license-activations";
import { jsonError } from "@/lib/utils";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; instanceId: string }> },
) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const { id, instanceId } = await context.params;
  try {
    const result = await removeStoreLicenseActivation({
      licenseId: id,
      userId: user.id,
      storeId: user.activeStoreId,
      instanceId,
    });
    return Response.json(result);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not remove device",
      404,
    );
  }
}
