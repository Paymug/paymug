import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { findUserById } from "./db";
import { getActiveStoreForUser } from "./stores";
import type { PublicUser, Store, User } from "./types";
import { getRequiredRuntimeEnvValue } from "./runtime-env";

const COOKIE_NAME = "paymug_session";

async function getSecret(): Promise<Uint8Array> {
  const secret = await getRequiredRuntimeEnvValue("AUTH_SECRET");
  return new TextEncoder().encode(secret);
}

export function toPublicUser(user: User, store?: Store): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    storeName: store?.name || user.storeName,
    storeSlug: store?.slug || user.storeSlug,
    storeCoverImageUrl: store?.coverImageUrl || user.storeCoverImageUrl,
    storeEmailFrom: store?.emailFrom || user.storeEmailFrom,
    storeEmailReplyTo: store?.emailReplyTo || user.storeEmailReplyTo,
    activeStoreId: store?.id || user.activeStoreId,
    environment: user.environment,
    createdAt: user.createdAt,
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(await getSecret());
}

export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, await getSecret());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getSessionUser(): Promise<PublicUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const userId = await verifySessionToken(token);
  if (!userId) return null;
  const user = await findUserById(userId);
  if (!user) return null;
  const store = await getActiveStoreForUser(user.id, user.activeStoreId);
  return toPublicUser(user, store);
}
