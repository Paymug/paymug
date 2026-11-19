"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Spinner, Textarea } from "@/components/ui";
import { dashboardPageClass } from "@/components/dashboard/dashboard.styles";

export function RedirectSettings() {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/settings/redirects");
        const body = (await response.json()) as {
          allowedRedirectDomains?: string[];
          error?: string;
        };
        if (!response.ok) throw new Error(body.error || "Could not load settings");
        setValue((body.allowedRedirectDomains ?? []).join("\n"));
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Could not load settings",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const response = await fetch("/api/settings/redirects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allowedRedirectDomains: value.split(/[\s,]+/).filter(Boolean),
        }),
      });
      const body = (await response.json()) as {
        allowedRedirectDomains?: string[];
        error?: string;
      };
      if (!response.ok) throw new Error(body.error || "Could not save");
      setValue((body.allowedRedirectDomains ?? []).join("\n"));
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted">
        <Spinner className="mr-2 h-5 w-5" /> Loading…
      </div>
    );
  }

  return (
    <div className={`${dashboardPageClass} !max-w-xl pb-12`}>
      <h1 className="sr-only">Redirects</h1>
      <section className="py-8 text-center sm:py-12">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent-hover">
          Redirects
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#333]">
          Allowed redirect domains
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-[#74748f]">
          A checkout link can send buyers back to your app with{" "}
          <code>?[return_url]=https://…</code>. Only hosts listed here are
          honored; anything else falls back to the product redirect URL.
        </p>
      </section>

      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <section className="rounded-2xl border border-[#e8e8ee] bg-white px-5 py-5 sm:px-6">
        <Textarea
          label="Domains (one per line)"
          name="allowedRedirectDomains"
          rows={6}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setSaved(false);
          }}
          placeholder={"app.example.com\n*.example.com"}
        />
        <p className="mt-2 text-xs leading-5 text-[#85859d]">
          <code>*.example.com</code> matches every subdomain but not{" "}
          <code>example.com</code> itself. Return URLs must use https; http is
          only accepted for localhost in sandbox mode.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
          {saved && <span className="text-sm text-[#85859d]">Saved</span>}
        </div>
      </section>
    </div>
  );
}
