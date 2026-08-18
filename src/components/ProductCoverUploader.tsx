"use client";

import { ImageSquare, Trash, UploadSimple } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { uploadProductCoverImage } from "./product-form.utils";
import type { ProductCoverUploaderProps } from "./ProductCoverUploader.types";

export function ProductCoverUploader({
  imageUrl,
  onChange,
  onError,
}: ProductCoverUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function selectImage(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    onError("");
    try {
      onChange(await uploadProductCoverImage(file));
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not upload cover");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="relative">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#333]">Cover photo</p>
          <p className="mt-1 text-xs leading-5 text-[#85859d]">
            JPEG, PNG, or WebP. Up to 5 MB.
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium hover:border-accent disabled:cursor-not-allowed disabled:opacity-50 absolute bottom-2 left-2 z-10 bg-white shadow"
        >
          <UploadSimple size={14} aria-hidden />
          {uploading ? "Uploading…" : imageUrl ? "Replace" : "Upload"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => void selectImage(event.target.files?.[0])}
        />
      </div>

      {imageUrl && (
        <div className="relative mt-3 overflow-hidden rounded-xl border border-[#e8e8ee] bg-[#f7f7f8]">
          <img
            src={imageUrl}
            alt="Product cover preview"
            className="aspect-[16/9] w-full object-cover"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/95 text-[#77778e] shadow-sm hover:text-danger"
            aria-label="Remove cover photo"
          >
            <Trash size={15} aria-hidden />
          </button>
        </div>
      )}

      {!imageUrl && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="mt-3 grid aspect-[16/9] w-full place-items-center rounded-xl border border-dashed border-[#d9d9e2] bg-[#fafafa] text-[#9a9aae] transition hover:border-accent hover:text-accent-hover"
          aria-label="Upload a product cover photo"
        >
          <ImageSquare size={28} aria-hidden />
        </button>
      )}
    </div>
  );
}
