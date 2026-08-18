"use client";

import { ImageSquare, Trash } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppIcon } from "@/components/dashboard/Icon";
import { uploadProductCoverImage } from "@/components/product-form.utils";
import { Alert, Button, Input, Select, Textarea } from "@/components/ui";
import { readStoreLogoFile } from "./store-cover.utils";
import type {
  StoreSettingsFormProps,
  StoreSettingsResponse,
  StoreTransactionFeeSelection,
} from "./StoreSettingsForm.types";

export function StoreSettingsForm({
  storeId,
  initialName,
  initialDescription,
  initialLogoImageUrl,
  initialCoverImageUrl,
  initialEmailFrom,
  initialEmailReplyTo,
  initialCurrency,
  initialTransactionFeeType,
  initialTransactionFeeValue,
}: StoreSettingsFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [logoImageUrl, setLogoImageUrl] = useState(initialLogoImageUrl || "");
  const [coverImageUrl, setCoverImageUrl] = useState(
    initialCoverImageUrl || ""
  );
  const [emailFrom, setEmailFrom] = useState(initialEmailFrom || "");
  const [emailReplyTo, setEmailReplyTo] = useState(
    initialEmailReplyTo || ""
  );
  const [currency, setCurrency] = useState(initialCurrency);
  const [transactionFeeType, setTransactionFeeType] =
    useState<StoreTransactionFeeSelection>(
      initialTransactionFeeValue > 0 ? initialTransactionFeeType : "none",
    );
  const [transactionFeeValue, setTransactionFeeValue] = useState(
    (initialTransactionFeeValue / 100).toFixed(2),
  );
  const [saving, setSaving] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function selectCover(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setCoverUploading(true);
    try {
      setCoverImageUrl(await uploadProductCoverImage(file));
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Could not upload cover image"
      );
    } finally {
      setCoverUploading(false);
      event.target.value = "";
    }
  }

  async function selectLogo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      setLogoImageUrl(await readStoreLogoFile(file));
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Could not read store logo"
      );
    }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    const normalizedTransactionFeeValue =
      transactionFeeType === "none"
        ? 0
        : Math.round(Number.parseFloat(transactionFeeValue || "0") * 100);
    if (
      !Number.isFinite(normalizedTransactionFeeValue) ||
      normalizedTransactionFeeValue < 0 ||
      (transactionFeeType === "percentage" &&
        normalizedTransactionFeeValue > 10000)
    ) {
      setSaving(false);
      setError(
        transactionFeeType === "percentage"
          ? "Enter a transaction fee percentage between 0 and 100"
          : "Enter a valid transaction fee amount",
      );
      return;
    }
    const response = await fetch(`/api/stores/${storeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        logoImageUrl,
        coverImageUrl,
        emailFrom,
        emailReplyTo,
        currency,
        transactionFeeType:
          transactionFeeType === "none" ? "fixed" : transactionFeeType,
        transactionFeeValue: normalizedTransactionFeeValue,
      }),
    });
    const data = (await response.json()) as StoreSettingsResponse;
    setSaving(false);
    if (!response.ok) {
      setError(data.error || "Could not save store");
      return;
    }
    setSuccess(true);
    router.refresh();
  }

  return (
    <form
      onSubmit={save}
      className="mt-6 flex flex-col rounded-2xl border border-[#e8e8ee] divide-[#e8e8ee] lg:flex-row lg:divide-x"
    >
      <section className="relative min-h-full min-w-0 flex-1 lg:sticky lg:top-0 lg:self-start">
        <Link
          href="/"
          target="_blank"
          className="absolute right-4 top-4 z-10 rounded-lg bg-white/90 px-3 py-2 text-sm font-medium text-accent-dark shadow-sm backdrop-blur hover:underline"
        >
          Open storefront
        </Link>
        <div className="relative">
          <label
            htmlFor="store-cover"
            className="group block cursor-pointer"
          >
            {coverImageUrl ? (
              <img
                src={coverImageUrl}
                alt="Store cover preview"
                className="aspect-3/1 w-full rounded-tl-2xl object-cover"
              />
            ) : (
              <div className="grid aspect-3/1 w-full rounded-tl-2xl place-items-center bg-accent-soft text-accent-hover">
                <ImageSquare size={30} />
              </div>
            )}
            <span className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-lg bg-white/90 px-3 py-2 text-sm font-medium text-foreground shadow-sm backdrop-blur transition group-hover:bg-white">
              <ImageSquare size={17} />
              {coverUploading
                ? "Uploading…"
                : coverImageUrl
                  ? "Replace cover"
                  : "Upload cover"}
            </span>
          </label>
          <input
            id="store-cover"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={selectCover}
            disabled={coverUploading}
            className="sr-only"
          />
          {coverImageUrl && (
            <button
              type="button"
              onClick={() => setCoverImageUrl("")}
              className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-lg bg-white/90 text-red-600 shadow-sm backdrop-blur hover:bg-white"
              aria-label="Remove store cover"
            >
              <Trash size={17} />
            </button>
          )}
        </div>
        <div
          className={`relative flex flex-col items-center px-5 text-center ${
            coverImageUrl ? "-mt-7" : "mt-5"
          }`}
        >
          <div className="relative shrink-0">
            <label
              htmlFor="store-logo"
              className={`group grid h-14 w-14 cursor-pointer place-items-center overflow-hidden rounded-xl border border-dashed border-border bg-[#f7f7f8] text-muted ${
                coverImageUrl ? "ring-4 ring-white" : ""
              }`}
              aria-label={logoImageUrl ? "Replace store logo" : "Upload store logo"}
            >
              {logoImageUrl ? (
                <img
                  src={logoImageUrl}
                  alt="Store logo preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <AppIcon size={32} />
              )}
              <span className="absolute inset-0 grid place-items-center bg-black/35 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
                {logoImageUrl ? "Replace" : "Upload"}
              </span>
            </label>
            <input
              id="store-logo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={selectLogo}
              className="sr-only"
            />
            {logoImageUrl && (
              <button
                type="button"
                onClick={() => setLogoImageUrl("")}
                className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-white text-red-600 shadow-sm"
                aria-label="Remove store logo"
              >
                <Trash size={12} />
              </button>
            )}
          </div>
          <p className="mt-4 text-xl font-semibold">{name || "Store name"}</p>
          <p className="mt-2 max-w-xl whitespace-pre-line text-sm text-muted">
            {description || "Add a description for your store."}
          </p>
        </div>
        <div className="p-5">
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="h-20 rounded-xl bg-[#f7f7f8]" />
            <div className="h-20 rounded-xl bg-[#f7f7f8]" />
          </div>
        </div>
      </section>

      <div className="w-full space-y-4 rounded-xl p-5 lg:max-w-82">
        <Input
          label="Store name"
          name="storeName"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <Input
          label="Store contact email (optional)"
          name="emailFrom"
          type="email"
          value={emailFrom}
          onChange={(event) => setEmailFrom(event.target.value)}
          placeholder="support@your-store.com"
        />
        <Textarea
          label="Store description"
          name="storeDescription"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={1000}
          placeholder="Tell customers about your store"
        />
        <Input
          label="Customer reply-to override (optional)"
          name="emailReplyTo"
          type="email"
          value={emailReplyTo}
          onChange={(event) => setEmailReplyTo(event.target.value)}
          placeholder={emailFrom || "Same as store email"}
        />
        <p className="text-sm text-muted">
          Emails are sent from the verified Paymug address. Customer replies
          go here, while store alerts go to your Paymug account email.
        </p>
        <Select
          label="Currency"
          name="currency"
          value={currency}
          onValueChange={setCurrency}
          options={[
            { value: "USD", label: "USD" },
            { value: "EUR", label: "EUR" },
            { value: "GBP", label: "GBP" },
            { value: "CAD", label: "CAD" },
            { value: "AUD", label: "AUD" },
          ]}
        />
        <Select
          label="Transaction fee"
          name="transactionFeeType"
          value={transactionFeeType}
          onValueChange={(value) =>
            setTransactionFeeType(value as StoreTransactionFeeSelection)
          }
          options={[
            { value: "none", label: "None" },
            { value: "fixed", label: "Fixed amount" },
            { value: "percentage", label: "Percentage" },
          ]}
        />
        {transactionFeeType !== "none" && (
          <Input
            label={
              transactionFeeType === "percentage"
                ? "Transaction fee (%)"
                : `Transaction fee (${currency})`
            }
            name="transactionFeeValue"
            type="number"
            min="0"
            max={transactionFeeType === "percentage" ? "100" : undefined}
            step="0.01"
            value={transactionFeeValue}
            onChange={(event) => setTransactionFeeValue(event.target.value)}
          />
        )}
        <p className="text-sm text-muted">
          Currency and transaction fee are used as defaults for new products.
        </p>
        {error && <Alert>{error}</Alert>}
        {success && <Alert variant="success">Store saved.</Alert>}
        <div className="sticky bottom-0 bg-white py-3">
          <Button
            type="submit"
            disabled={saving || coverUploading}
            className="w-full py-3"
          >
            {saving ? "Saving…" : "Update"}
          </Button>
        </div>
      </div>
    </form>
  );
}
