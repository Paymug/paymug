import { md5 } from "./md5";

export function getGravatarUrl(email: string, size = 160): string {
  const hash = md5(email.trim().toLowerCase());
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=404`;
}

export function resolveCustomerAvatarUrl(
  input: { email: string; avatarImageUrl?: string },
  size = 160,
): string | undefined {
  if (input.avatarImageUrl) return input.avatarImageUrl;
  if (!input.email.trim()) return undefined;
  return getGravatarUrl(input.email, size);
}
