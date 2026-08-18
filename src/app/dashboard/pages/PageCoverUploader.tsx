"use client";

import { ImageSquare, Trash, UploadSimple } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { uploadProductCoverImage } from "@/components/product-form.utils";
import type { PageCoverUploaderProps } from "./PageEditor.types";

export function PageCoverUploader({
  imageUrl,
  onChange,
  onError,
}: PageCoverUploaderProps) {
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
    <div className="group relative overflow-hidden rounded-2xl bg-[#f5f5f3]">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="Page cover"
          className="aspect-[2.4/1] w-full object-cover"
        />
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="grid aspect-[2.4/1] w-full place-items-center text-[#aaa9a4] hover:text-[#77756f]"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <ImageSquare size={20} /> Add cover
          </span>
        </button>
      )}
      <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 transition group-hover:opacity-100">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-medium shadow"
        >
          <UploadSimple size={14} /> {uploading ? "Uploading…" : "Replace"}
        </button>
        {imageUrl && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="grid h-8 w-8 place-items-center rounded-full bg-white text-red-600 shadow"
            aria-label="Remove cover"
          >
            <Trash size={14} />
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => void selectImage(event.target.files?.[0])}
      />
    </div>
  );
}
