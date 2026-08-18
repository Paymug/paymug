"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteProductButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    if (!confirm("Delete this product?")) return;
    setLoading(true);
    try {
      await fetch(`/api/products/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={loading}
      className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
    >
      {loading ? "…" : "Delete"}
    </button>
  );
}
