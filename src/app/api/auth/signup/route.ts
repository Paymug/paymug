import { z } from "zod";
import { createAccount } from "@/lib/accounts";
import {
  createSessionToken,
  hashPassword,
  setSessionCookie,
  toPublicUser,
} from "@/lib/auth";
import { jsonError, uid } from "@/lib/utils";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(80),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message || "Invalid input");
    }

    const { email, password, name } = parsed.data;
    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();
    const user = await createAccount({
      id: uid(),
      email,
      name,
      passwordHash,
      environment: "sandbox",
      createdAt: now,
    });

    const token = await createSessionToken(user.id);
    await setSessionCookie(token);

    return Response.json({ user: toPublicUser(user) }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Signup failed";
    if (
      message === "Email already registered" ||
      message === "This installation already has an account"
    ) {
      return jsonError(message, 409);
    }
    return jsonError(message, 500);
  }
}
