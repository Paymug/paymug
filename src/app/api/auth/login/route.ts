import { z } from "zod";
import { findUserByEmail } from "@/lib/db";
import {
  createSessionToken,
  setSessionCookie,
  toPublicUser,
  verifyPassword,
} from "@/lib/auth";
import {
  createLoginErrorResponse,
  createLoginSuccessResponse,
  readLoginRequest,
} from "./login-request.utils";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  let isBrowserForm = false;

  try {
    const loginRequest = await readLoginRequest(req);
    isBrowserForm = loginRequest.isBrowserForm;
    const parsed = schema.safeParse(loginRequest.payload);
    if (!parsed.success) {
      return await createLoginErrorResponse(
        req,
        "Invalid email or password",
        400,
        isBrowserForm
      );
    }

    const user = await findUserByEmail(parsed.data.email);
    if (!user) {
      return await createLoginErrorResponse(
        req,
        "Invalid email or password",
        401,
        isBrowserForm
      );
    }

    const ok = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!ok) {
      return await createLoginErrorResponse(
        req,
        "Invalid email or password",
        401,
        isBrowserForm
      );
    }

    const token = await createSessionToken(user.id);
    await setSessionCookie(token);

    return await createLoginSuccessResponse(
      req,
      toPublicUser(user),
      isBrowserForm
    );
  } catch {
    return await createLoginErrorResponse(
      req,
      "Login failed",
      500,
      isBrowserForm
    );
  }
}
