import type {
  InitialSetupConfigurationResponse,
  InitialSetupMigrationResponse,
} from "./setup.types";

async function readSetupResponse<T extends { error?: string }>(
  response: Response,
): Promise<T> {
  const data = (await response.json()) as T;
  if (!response.ok) throw new Error(data.error || "Setup request failed");
  return data;
}

export async function migrateSetupDatabase(): Promise<InitialSetupMigrationResponse> {
  return readSetupResponse(
    await fetch("/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }),
  );
}

export async function fetchSetupConfiguration(): Promise<InitialSetupConfigurationResponse> {
  return readSetupResponse(
    await fetch("/api/setup", { cache: "no-store" }),
  );
}
