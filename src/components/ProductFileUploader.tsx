"use client";

import { File, Trash, UploadSimple } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import type { ProductFile } from "@/lib/product-files.types";
import { formatProductFileSize } from "@/lib/product-files.utils";
import { uploadProductDeliveryFile } from "./product-form.utils";
import type { ProductFileUploaderProps } from "./ProductFileUploader.types";

export function ProductFileUploader({
  files,
  onChange,
  onError,
}: ProductFileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function uploadFiles(selectedFiles: FileList | null) {
    if (!selectedFiles?.length) return;
    const nextFiles = Array.from(selectedFiles).slice(0, 20 - files.length);
    if (!nextFiles.length) {
      onError("A product can include up to 20 files");
      return;
    }

    setUploading(true);
    onError("");
    try {
      const uploaded: ProductFile[] = [];
      for (const file of nextFiles) {
        uploaded.push(await uploadProductDeliveryFile(file));
      }
      onChange([...files, ...uploaded]);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not upload file");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#333]">Product files</p>
          <p className="mt-1 text-xs leading-5 text-[#85859d]">
            Buyers can download these files only after payment.
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || files.length >= 20}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#dedee7] px-2.5 py-1.5 text-xs font-medium hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <UploadSimple size={14} aria-hidden />
          {uploading ? "Uploading…" : "Upload"}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          onChange={(event) => void uploadFiles(event.target.files)}
        />
      </div>

      {!!files.length && (
        <div className="mt-3 space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-2 rounded-lg bg-[#f7f7f8] px-2.5 py-2"
            >
              <File size={15} className="shrink-0 text-[#85859d]" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{file.name}</p>
                <p className="text-[11px] text-muted">
                  {formatProductFileSize(file.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  onChange(files.filter((candidate) => candidate.id !== file.id))
                }
                className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[#9191aa] hover:bg-white hover:text-danger"
                aria-label={`Remove ${file.name}`}
              >
                <Trash size={14} aria-hidden />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
