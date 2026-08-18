import { getSessionUser } from "@/lib/auth";
import { storeProductFile } from "@/lib/product-file-storage";
import type { ProductFileUploadKind } from "@/lib/product-files.types";
import { jsonError } from "@/lib/utils";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const kind = formData.get("kind");
    if (!(file instanceof File)) return jsonError("Choose a file");
    if (kind !== "description" && kind !== "delivery") {
      return jsonError("Invalid upload type");
    }

    const storedFile = await storeProductFile(
      file,
      user.id,
      kind as ProductFileUploadKind
    );
    return Response.json(
      kind === "description"
        ? {
            url: `/api/product-files/image?key=${encodeURIComponent(storedFile.storageKey)}`,
          }
        : { file: storedFile },
      { status: 201 }
    );
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not upload file",
      500
    );
  }
}
