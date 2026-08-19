import type { AboutBackupImportResponse } from "./AboutPanel.types";

export async function downloadAboutBackup(): Promise<void> {
  const response = await fetch("/api/about/data/export", { cache: "no-store" });
  if (!response.ok) {
    const data = (await response.json()) as { error?: string };
    throw new Error(data.error || "Could not export store data");
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `paymug-store-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function uploadAboutBackup(
  file: File,
  preserveIds: boolean,
): Promise<AboutBackupImportResponse> {
  const response = await fetch(
    `/api/about/data/import?preserveIds=${preserveIds ? "true" : "false"}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: await file.text(),
    },
  );
  const data = (await response.json()) as AboutBackupImportResponse;
  if (!response.ok) throw new Error(data.error || "Could not import backup");
  return data;
}
