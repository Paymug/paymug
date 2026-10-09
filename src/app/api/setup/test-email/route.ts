import { getSessionUser } from "@/lib/auth";
import { sendSetupTestEmail } from "@/lib/transactional-emails";
import { jsonError } from "@/lib/utils";

export async function POST() {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  try {
    await sendSetupTestEmail(user.id, user.email);
  } catch (error) {
    console.error("Setup test email failed", error);
    return jsonError(
      error instanceof Error ? error.message : "Could not send the test email",
      502
    );
  }
  return Response.json({ sent: true, to: user.email });
}
