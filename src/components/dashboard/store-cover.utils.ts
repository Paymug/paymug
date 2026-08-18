export function readStoreCoverFile(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return Promise.reject(
      new Error("Choose a JPEG, PNG, or WebP image")
    );
  }
  if (file.size > 1_000_000) {
    return Promise.reject(new Error("Cover image must be smaller than 1 MB"));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("Could not read image"));
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}

export function readStoreLogoFile(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return Promise.reject(
      new Error("Choose a JPEG, PNG, or WebP image")
    );
  }
  if (file.size > 1_000_000) {
    return Promise.reject(new Error("Store logo must be smaller than 1 MB"));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("Could not read image"));
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}
