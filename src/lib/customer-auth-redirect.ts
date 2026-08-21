export function getCustomerAuthRedirectPath(value?: string): string {
  return value?.startsWith("/customer/") ? value : "/customer";
}
