import type { PublicUser } from "@/lib/types";

export interface LoginRequestPayload {
  payload: unknown;
  isBrowserForm: boolean;
}

export interface LoginSuccessBody {
  user: PublicUser;
}
