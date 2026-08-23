function serializePaymentFailurePayload(payload: unknown) {
  if (payload === undefined) return "";
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
}

export function formatPaymentFailureDetails(
  provider: string,
  message: string,
  payload?: unknown,
) {
  const summary = `${provider}: ${message}`;
  const serializedPayload = serializePaymentFailurePayload(payload);
  return serializedPayload ? `${summary}\n\n${serializedPayload}` : summary;
}

export function getPaymentFailureMessage(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return undefined;
  }
  const record = payload as Record<string, unknown>;
  if (typeof record.message === "string" && record.message) {
    return record.message;
  }
  if (typeof record.reason === "string" && record.reason) {
    return record.reason;
  }
  const lastPaymentError = record.last_payment_error;
  if (
    lastPaymentError &&
    typeof lastPaymentError === "object" &&
    !Array.isArray(lastPaymentError) &&
    typeof (lastPaymentError as Record<string, unknown>).message === "string"
  ) {
    return (lastPaymentError as Record<string, unknown>).message as string;
  }
  return undefined;
}
