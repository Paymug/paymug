import type {
  GitHubRepositoriesResponse,
  GitHubRepositoryOption,
} from "./ProductForm.types";
import type {
  ProductFile,
  ProductFileUploadResponse,
} from "@/lib/product-files.types";
import { formatMoney } from "@/lib/format";

export async function fetchGitHubRepositories(): Promise<GitHubRepositoriesResponse> {
  const response = await fetch("/api/github/repos");
  const data = (await response.json()) as GitHubRepositoriesResponse;
  if (!response.ok) {
    throw new Error(data.error || "Could not load GitHub repositories");
  }
  return data;
}

export function findGitHubRepository(
  repositories: GitHubRepositoryOption[],
  fullName: string
): GitHubRepositoryOption | undefined {
  return repositories.find(
    (repository) => repository.fullName === fullName
  );
}

async function uploadProductFile(
  file: File,
  kind: "description" | "delivery"
) {
  const formData = new FormData();
  formData.set("file", file);
  formData.set("kind", kind);
  const response = await fetch("/api/product-files", {
    method: "POST",
    body: formData,
  });
  const data = (await response.json()) as ProductFileUploadResponse;
  if (!response.ok) {
    throw new Error(data.error || "Could not upload file");
  }
  return data;
}

export async function uploadProductDescriptionImage(file: File) {
  const data = await uploadProductFile(file, "description");
  if (!data.url) throw new Error("Could not upload image");
  return {
    success: 1 as const,
    file: { url: data.url },
  };
}

export async function uploadProductDescriptionImageByUrl(url: string) {
  if (url.startsWith("data:image/")) {
    const response = await fetch(url);
    const blob = await response.blob();
    if (!blob.type.startsWith("image/")) {
      throw new Error("Pasted content is not an image");
    }
    return uploadProductDescriptionImage(
      new File([blob], "pasted-image", { type: blob.type }),
    );
  }

  if (url.startsWith("/api/product-files/image?key=")) {
    return { success: 1 as const, file: { url } };
  }

  const parsedUrl = new URL(url);
  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    throw new Error("Pasted image URL is invalid");
  }
  return { success: 1 as const, file: { url: parsedUrl.toString() } };
}

export async function uploadProductCoverImage(file: File): Promise<string> {
  const data = await uploadProductFile(file, "description");
  if (!data.url) throw new Error("Could not upload cover photo");
  return data.url;
}

export async function uploadProductDeliveryFile(
  file: File
): Promise<ProductFile> {
  const data = await uploadProductFile(file, "delivery");
  if (!data.file) throw new Error("Could not upload file");
  return data.file;
}

export function formatProductPreviewPrice(
  price: string,
  currency: string,
  suffix = ""
) {
  const amount = Math.round(Number.parseFloat(price || "0") * 100);
  return `${formatMoney(Number.isFinite(amount) ? amount : 0, currency)}${suffix}`;
}
