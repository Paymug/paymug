import type { PublicUser } from "@/lib/types";
import { getRuntimeAbsoluteUrl } from "@/lib/runtime-env";
import { jsonError } from "@/lib/utils";
import type {
  LoginRequestPayload,
  LoginSuccessBody,
} from "./login.types";

const formContentTypes = [
  "application/x-www-form-urlencoded",
  "multipart/form-data",
];

export async function readLoginRequest(
  req: Request
): Promise<LoginRequestPayload> {
  const contentType = req.headers.get("content-type")?.toLowerCase() ?? "";
  const isBrowserForm = formContentTypes.some((type) =>
    contentType.includes(type)
  );

  if (!isBrowserForm) {
    return {
      payload: await req.json(),
      isBrowserForm: false,
    };
  }

  const formData = await req.formData();
  return {
    payload: {
      email: formData.get("email"),
      password: formData.get("password"),
    },
    isBrowserForm: true,
  };
}

export async function createLoginErrorResponse(
  req: Request,
  message: string,
  status: number,
  isBrowserForm: boolean
): Promise<Response> {
  if (!isBrowserForm) {
    return jsonError(message, status);
  }

  const loginUrl = new URL(
    await getRuntimeAbsoluteUrl("/login", req.url)
  );
  loginUrl.searchParams.set("error", "invalid_credentials");
  return Response.redirect(loginUrl, 303);
}

export async function createLoginSuccessResponse(
  req: Request,
  user: PublicUser,
  isBrowserForm: boolean
): Promise<Response> {
  if (isBrowserForm) {
    return Response.redirect(
      await getRuntimeAbsoluteUrl("/dashboard", req.url),
      303
    );
  }

  const body: LoginSuccessBody = { user };
  return Response.json(body);
}
