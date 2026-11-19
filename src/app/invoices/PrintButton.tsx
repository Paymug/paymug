"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="cursor-pointer rounded-lg border border-[#e0e0e8] bg-white px-4 py-2 text-sm font-semibold text-[#34343e] transition hover:bg-[#f7f7f8]"
    >
      Print / Save PDF
    </button>
  );
}
