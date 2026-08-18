"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ProductDescriptionEditor } from "./ProductDescriptionEditor";
import { ProductCoverUploader } from "./ProductCoverUploader";
import { ProductFileUploader } from "./ProductFileUploader";
import { Alert, Button, Input, Select } from "./ui";
import { inputClass, labelClass } from "./ui.styles";
import {
  formatProductIntervalLabel,
  formatProductPriceSuffix,
} from "@/lib/product-billing";
import type {
  ProductBillingType,
  ProductIntervalUnit,
  ProductLicenseType,
  ProductLicenseUpdatePeriodUnit,
} from "@/lib/types";
import { formatLicenseUpdatePeriodLabel } from "@/lib/license-entitlements";
import {
  fetchGitHubRepositories,
  findGitHubRepository,
  formatProductPreviewPrice,
} from "./product-form.utils";
import { useProductAutosave } from "./use-product-autosave";
import type {
  ProductFormSavePayload,
  ProductSaveResponse,
} from "./product-autosave.types";
import type {
  GitHubRepositoryOption,
  ProductFormProps,
  ProductTransactionFeeSelection,
} from "./ProductForm.types";
import { ArrowSquareOutIcon } from "@phosphor-icons/react";

export function ProductForm({
  product,
  storeCurrency,
  storeTransactionFeeType,
  storeTransactionFeeValue,
}: ProductFormProps) {
  const router = useRouter();
  const [name, setName] = useState(product?.name || "");
  const [description, setDescription] = useState(product?.description || "");
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || "");
  const [price, setPrice] = useState(
    product ? (product.price / 100).toFixed(2) : "",
  );
  const storeTransactionFeeSelection: ProductTransactionFeeSelection =
    storeTransactionFeeValue > 0 ? storeTransactionFeeType : "none";
  const storeTransactionFeeDisplayValue = (
    storeTransactionFeeValue / 100
  ).toFixed(2);
  const [transactionFeeType, setTransactionFeeType] =
    useState<ProductTransactionFeeSelection>(
      product
        ? product.transactionFeeValue > 0
          ? product.transactionFeeType
          : "none"
        : storeTransactionFeeSelection,
    );
  const [transactionFeeValue, setTransactionFeeValue] = useState(
    ((product?.transactionFeeValue ?? storeTransactionFeeValue) / 100).toFixed(
      2,
    ),
  );
  const currency = product?.currency || storeCurrency;
  const [status, setStatus] = useState<"draft" | "published">(
    product?.status || "draft",
  );
  const [deliveryContent, setDeliveryContent] = useState(
    product?.deliveryContent || "",
  );
  const [productFiles, setProductFiles] = useState(product?.productFiles || []);
  const [generateLicense, setGenerateLicense] = useState(
    product?.generateLicense || false,
  );
  const [licenseType, setLicenseType] = useState<ProductLicenseType>(
    product?.licenseType || "standard",
  );
  const [licenseUpdatePeriodUnit, setLicenseUpdatePeriodUnit] =
    useState<ProductLicenseUpdatePeriodUnit>(
      product?.licenseUpdatePeriodUnit === "week"
        ? "day"
        : product?.licenseUpdatePeriodUnit || "year",
    );
  const [licenseUpdatePeriodCount, setLicenseUpdatePeriodCount] = useState(
    String(
      product?.licenseUpdatePeriodUnit === "week"
        ? Math.max(1, product.licenseUpdatePeriodCount || 1) * 7
        : product?.licenseUpdatePeriodCount || 1,
    ),
  );
  const [billingType, setBillingType] = useState<ProductBillingType>(
    product?.billingType || "one_time",
  );
  const [intervalUnit, setIntervalUnit] = useState<ProductIntervalUnit>(
    product?.intervalUnit || "month",
  );
  const [intervalCount, setIntervalCount] = useState(
    String(product?.intervalCount || 1),
  );
  const [trialDays, setTrialDays] = useState(String(product?.trialDays || 0));
  const [githubDelivery, setGitHubDelivery] = useState(
    Boolean(product?.githubRepoOwner && product.githubRepoName),
  );
  const [githubRepoFullName, setGitHubRepoFullName] = useState(
    product?.githubRepoOwner && product.githubRepoName
      ? `${product.githubRepoOwner}/${product.githubRepoName}`
      : "",
  );
  const [githubConnected, setGitHubConnected] = useState(false);
  const [githubRepositories, setGitHubRepositories] = useState<
    GitHubRepositoryOption[]
  >([]);
  const [githubLoading, setGitHubLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const descriptionReadyRef = useRef(false);
  const githubAutosaveReadyRef = useRef(false);

  const selectedGitHubRepository = findGitHubRepository(
    githubRepositories,
    githubRepoFullName,
  );
  const parsedPriceCents = Math.round(parseFloat(price) * 100);
  const autosavePriceCents =
    Number.isFinite(parsedPriceCents) && parsedPriceCents >= 0
      ? parsedPriceCents
      : 0;
  const parsedTransactionFeeValue = Math.round(
    parseFloat(transactionFeeValue || "0") * 100,
  );
  const autosaveTransactionFeeValue =
    transactionFeeType !== "none" &&
    Number.isFinite(parsedTransactionFeeValue) &&
    parsedTransactionFeeValue >= 0
      ? parsedTransactionFeeValue
      : 0;
  const parsedIntervalCount = Math.max(
    1,
    Number.parseInt(intervalCount || "1", 10) || 1,
  );
  const parsedTrialDays = Math.max(
    0,
    Number.parseInt(trialDays || "0", 10) || 0,
  );
  const parsedLicenseUpdatePeriodCount = Math.max(
    1,
    Number.parseInt(licenseUpdatePeriodCount || "1", 10) || 1,
  );
  const perpetualLicenseEnabled =
    generateLicense && licenseType === "perpetual";
  const priceSuffix =
    billingType === "subscription"
      ? formatProductPriceSuffix({
          billingType,
          intervalUnit,
          intervalCount: parsedIntervalCount,
          trialDays: parsedTrialDays,
        })
      : "";
  const savePayload: ProductFormSavePayload = {
    name: name.trim() || "Untitled product",
    description,
    imageUrl,
    price: autosavePriceCents,
    transactionFeeType:
      transactionFeeType === "none" ? "fixed" : transactionFeeType,
    transactionFeeValue: autosaveTransactionFeeValue,
    currency,
    status,
    deliveryContent: deliveryContent || undefined,
    productFiles,
    generateLicense,
    licenseType: perpetualLicenseEnabled ? "perpetual" : "standard",
    licenseUpdatePeriodUnit: perpetualLicenseEnabled
      ? billingType === "subscription"
        ? intervalUnit
        : licenseUpdatePeriodUnit
      : null,
    licenseUpdatePeriodCount: perpetualLicenseEnabled
      ? billingType === "subscription"
        ? parsedIntervalCount
        : parsedLicenseUpdatePeriodCount
      : 1,
    billingType,
    intervalUnit: billingType === "subscription" ? intervalUnit : null,
    intervalCount:
      billingType === "subscription" ? parsedIntervalCount : 1,
    trialDays: billingType === "subscription" ? parsedTrialDays : 0,
    githubRepoOwner: githubDelivery
      ? selectedGitHubRepository?.owner || product?.githubRepoOwner || null
      : null,
    githubRepoName: githubDelivery
      ? selectedGitHubRepository?.name || product?.githubRepoName || null
      : null,
  };
  const hasMeaningfulContent = Boolean(
    name.trim() ||
    description.trim() ||
    imageUrl ||
    price.trim() ||
    deliveryContent.trim() ||
    productFiles.length ||
    generateLicense ||
    githubDelivery ||
    transactionFeeType !== storeTransactionFeeSelection ||
    transactionFeeValue !== storeTransactionFeeDisplayValue ||
    status !== "draft",
  );
  const {
    productId,
    status: autosaveStatus,
    requestAutosave,
    waitForAutosave,
  } = useProductAutosave({
    initialProductId: product?.id,
    payload: savePayload,
    hasMeaningfulContent,
    onCreated: (createdProduct) => {
      setStatus(createdProduct.status);
      window.history.replaceState(
        window.history.state,
        "",
        `/dashboard/products/${createdProduct.id}`,
      );
    },
    onError: setError,
    onSaved: () => setError(null),
  });

  useEffect(() => {
    void fetchGitHubRepositories()
      .then((data) => {
        setGitHubConnected(data.connected);
        setGitHubRepositories(data.repositories);
      })
      .catch(() => {
        setGitHubConnected(false);
      })
      .finally(() => setGitHubLoading(false));
  }, []);

  useEffect(() => {
    if (!descriptionReadyRef.current) {
      descriptionReadyRef.current = true;
      return;
    }
    requestAutosave(1200);
  }, [description, requestAutosave]);

  useEffect(() => {
    if (!githubAutosaveReadyRef.current) {
      githubAutosaveReadyRef.current = true;
      return;
    }
    requestAutosave(150);
  }, [githubDelivery, githubRepoFullName, requestAutosave]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const priceCents = Math.round(parseFloat(price) * 100);
    if (!Number.isFinite(priceCents) || priceCents < 1) {
      setError("Enter a valid price greater than 0");
      setSaving(false);
      return;
    }
    const normalizedTransactionFeeValue =
      transactionFeeType === "none"
        ? 0
        : Math.round(parseFloat(transactionFeeValue || "0") * 100);
    if (
      transactionFeeType !== "none" &&
      (!Number.isFinite(normalizedTransactionFeeValue) ||
        normalizedTransactionFeeValue < 0 ||
        (transactionFeeType === "percentage" &&
          normalizedTransactionFeeValue > 10000))
    ) {
      setError(
        transactionFeeType === "percentage"
          ? "Enter a transaction fee percentage between 0 and 100"
          : "Enter a valid transaction fee amount",
      );
      setSaving(false);
      return;
    }
    if (githubDelivery && (!githubConnected || !selectedGitHubRepository)) {
      setError(
        githubConnected
          ? "Choose a private GitHub repository"
          : "Authorize GitHub before enabling repository delivery",
      );
      setSaving(false);
      return;
    }

    const payload: ProductFormSavePayload = {
      ...savePayload,
      name,
      price: priceCents,
      transactionFeeValue: normalizedTransactionFeeValue,
      githubRepoOwner: githubDelivery ? selectedGitHubRepository?.owner : null,
      githubRepoName: githubDelivery ? selectedGitHubRepository?.name : null,
    };

    try {
      const activeProductId = await waitForAutosave();
      const res = await fetch(
        activeProductId ? `/api/products/${activeProductId}` : "/api/products",
        {
          method: activeProductId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await res.json()) as ProductSaveResponse;
      if (!res.ok) throw new Error(data.error || "Save failed");
      router.push("/dashboard/products");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      onBlurCapture={() => requestAutosave()}
      className="flex flex-row rounded-2xl border border-[#e8e8ee] lg:divide-x divide-[#e8e8ee] relative"
    >
      <div className="flex-1 min-w-0 lg:sticky lg:top-0 lg:self-start">
        <div className="p-6 sm:p-8">
          <Link
            href={`/buy/${productId}${
              status === "published" && product?.environment === "live"
                ? ""
                : "?preview"
            }`}
            target="_blank"
            className="absolute right-4 top-4 z-10 rounded-lg bg-white/90 px-3 py-2 text-sm font-medium text-accent-dark shadow-sm backdrop-blur hover:underline"
          >
            <ArrowSquareOutIcon />
          </Link>

          {error && (
            <div className="lg:col-span-2">
              <Alert>{error}</Alert>
            </div>
          )}

          <div className="mb-6">
            <ProductCoverUploader
              imageUrl={imageUrl}
              onChange={(nextImageUrl) => {
                setImageUrl(nextImageUrl);
                requestAutosave(1);
              }}
              onError={(message) => setError(message || null)}
            />
          </div>

          <h2 className="text-2xl font-semibold tracking-[-0.035em]">
            {name || "Untitled product"}
          </h2>
          <p className="mt-3 text-2xl font-semibold">
            {formatProductPreviewPrice(price, currency, priceSuffix)}
          </p>
          {billingType === "subscription" && (
            <p className="mt-1 text-sm text-muted">
              Every {formatProductIntervalLabel(intervalUnit, parsedIntervalCount)}
              {parsedTrialDays > 0
                ? ` · ${parsedTrialDays}-day free trial`
                : ""}
            </p>
          )}
          {perpetualLicenseEnabled && (
            <p className="mt-1 text-sm text-muted">
              Lifetime use · {billingType === "subscription"
                ? formatProductIntervalLabel(intervalUnit, parsedIntervalCount)
                : formatLicenseUpdatePeriodLabel(
                    licenseUpdatePeriodUnit,
                    parsedLicenseUpdatePeriodCount,
                  )} of updates
            </p>
          )}
          <ProductDescriptionEditor
            value={description}
            onChange={setDescription}
          />
        </div>
      </div>

      <div className="space-y-5 rounded-xl p-5 w-full lg:max-w-82">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#333]">Published</p>
            <p className="mt-1 text-xs leading-5 text-[#85859d]">
              {status === "published"
                ? "Product is available to customers."
                : "Draft and hidden from customers."}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={status === "published"}
            aria-label="Publish product"
            onClick={() => {
              setStatus((current) =>
                current === "published" ? "draft" : "published",
              );
              requestAutosave(1);
            }}
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${
              status === "published" ? "bg-accent" : "bg-[#d9d9e2]"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                status === "published" ? "left-5.5" : "left-0.5"
              }`}
            />
          </button>
        </div>

        <Input
          label="Product name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Ultimate UI Kit"
          required
        />

        <div>
          <label className={labelClass} htmlFor="price">
            Price
          </label>
          <div className="flex">
            <input
              id="price"
              name="price"
              type="number"
              min="0.01"
              step="0.01"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="29.00"
              required
              className={`${inputClass} !rounded-r-none !border-r-0 focus:relative focus:z-10`}
            />
            <span className="inline-flex h-[48px] w-20 shrink-0 items-center justify-center rounded-r-xl border border-border bg-[#f7f7f8] px-3 text-sm font-medium text-muted">
              {currency}
            </span>
          </div>
        </div>

        <Select
          label="Billing"
          name="billingType"
          value={billingType}
          onValueChange={(value) => {
            setBillingType(value as ProductBillingType);
            requestAutosave(1);
          }}
          options={[
            { value: "one_time", label: "One-time purchase" },
            { value: "subscription", label: "Subscription" },
          ]}
        />

        {billingType === "subscription" && (
          <div className="space-y-4 rounded-xl border border-border bg-[#fafafd] p-4">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
              Subscription plan
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Every"
                name="intervalCount"
                type="number"
                min="1"
                max={intervalUnit === "year" ? "1" : intervalUnit === "month" ? "12" : "52"}
                step="1"
                value={intervalCount}
                onChange={(event) => setIntervalCount(event.target.value)}
              />
              <Select
                label="Period"
                name="intervalUnit"
                value={intervalUnit}
                onValueChange={(value) => {
                  setIntervalUnit(value as ProductIntervalUnit);
                  if (value === "year") setIntervalCount("1");
                  requestAutosave(1);
                }}
                options={[
                  { value: "week", label: "Week(s)" },
                  { value: "month", label: "Month(s)" },
                  { value: "year", label: "Year" },
                ]}
              />
            </div>
            <Input
              label="Free trial (days)"
              name="trialDays"
              type="number"
              min="0"
              max="365"
              step="1"
              value={trialDays}
              onChange={(event) => setTrialDays(event.target.value)}
              placeholder="0"
            />
            <p className="text-xs leading-5 text-muted">
              Customers are billed every{" "}
              {formatProductIntervalLabel(intervalUnit, parsedIntervalCount)}
              {parsedTrialDays > 0
                ? ` after a ${parsedTrialDays}-day free trial`
                : ""}
              .
            </p>
          </div>
        )}

        <Select
          label="Transaction fee"
          name="transactionFeeType"
          value={transactionFeeType}
          onValueChange={(value) => {
            setTransactionFeeType(value as ProductTransactionFeeSelection);
            requestAutosave(1);
          }}
          options={[
            { value: "none", label: "None" },
            { value: "fixed", label: "Fixed amount" },
            { value: "percentage", label: "Percentage" },
          ]}
        />
        {transactionFeeType !== "none" && (
          <>
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
              placeholder="0.00"
            />
            <p className="-mt-3 text-xs leading-5 text-muted">
              Charged on each checkout transaction after discounts.
            </p>
          </>
        )}

        <div>
          <p className={labelClass}>Delivery content (shown after purchase)</p>
          <div className="rounded-xl border border-border bg-white px-3.5 [&>div]:!mt-0">
            <ProductDescriptionEditor
              value={deliveryContent}
              onChange={(value) => {
                setDeliveryContent(value);
                requestAutosave(1200);
              }}
            />
          </div>
        </div>

        <ProductFileUploader
          files={productFiles}
          onChange={(nextProductFiles) => {
            setProductFiles(nextProductFiles);
            requestAutosave(1);
          }}
          onError={(message) => setError(message || null)}
        />

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#333]">License key</p>
            <p className="mt-1 text-xs leading-5 text-[#85859d]">
              Create a unique license after each successful purchase.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={generateLicense}
            aria-label="Generate a license key"
            onClick={() => {
              setGenerateLicense((enabled) => !enabled);
              requestAutosave(1);
            }}
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${
              generateLicense ? "bg-accent" : "bg-[#d9d9e2]"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                generateLicense ? "left-5.5" : "left-0.5"
              }`}
            />
          </button>
        </div>

        {generateLicense && (
          <div className="space-y-4 rounded-xl border border-border bg-[#fafafd] p-4">
            <Select
              label="License model"
              name="licenseType"
              value={licenseType}
              onValueChange={(value) => {
                setLicenseType(value as ProductLicenseType);
                requestAutosave(1);
              }}
              options={[
                { value: "standard", label: "Standard license" },
                { value: "perpetual", label: "Perpetual license" },
              ]}
            />

            {licenseType === "perpetual" && billingType === "subscription" && (
              <p className="text-xs leading-5 text-muted">
                Updates renew with each successful subscription payment. If
                the subscription ends, the customer keeps the purchased
                version forever.
              </p>
            )}

            {licenseType === "perpetual" && billingType === "one_time" && (
              <>
                <div>
                  <label className={labelClass} htmlFor="licenseUpdatePeriodCount">
                    Update period
                  </label>
                  <div className="flex">
                    <input
                      id="licenseUpdatePeriodCount"
                      name="licenseUpdatePeriodCount"
                      type="number"
                      min="1"
                      max={
                        licenseUpdatePeriodUnit === "year"
                          ? "10"
                          : licenseUpdatePeriodUnit === "month"
                            ? "120"
                            : "3650"
                      }
                      step="1"
                      value={licenseUpdatePeriodCount}
                      onChange={(event) =>
                        setLicenseUpdatePeriodCount(event.target.value)
                      }
                      className={`${inputClass} !rounded-r-none`}
                    />
                    <Select
                      name="licenseUpdatePeriodUnit"
                      value={licenseUpdatePeriodUnit}
                      onValueChange={(value) => {
                        setLicenseUpdatePeriodUnit(
                          value as ProductLicenseUpdatePeriodUnit,
                        );
                        requestAutosave(1);
                      }}
                      ariaLabel="Update period unit"
                      className="w-32 shrink-0"
                      triggerClassName="!rounded-l-none !border-l-0"
                      options={[
                        { value: "day", label: "Day(s)" },
                        { value: "month", label: "Month(s)" },
                        { value: "year", label: "Year(s)" },
                      ]}
                    />
                  </div>
                </div>
                <p className="text-xs leading-5 text-muted">
                  Customers can use their purchased version forever. New
                  versions and repository updates are included for this period.
                </p>
              </>
            )}
          </div>
        )}

        <div className="">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[#333]">
                Private GitHub repository
              </p>
              <p className="mt-1 text-xs leading-5 text-[#85859d]">
                Invite paid customers with read access and revoke it when their
                order or license becomes invalid.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={githubDelivery}
              aria-label="Deliver a private GitHub repository"
              onClick={() => setGitHubDelivery((enabled) => !enabled)}
              disabled={!githubConnected && !githubDelivery}
              className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${
                githubDelivery ? "bg-accent" : "bg-[#d9d9e2]"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                  githubDelivery ? "left-5.5" : "left-0.5"
                }`}
              />
            </button>
          </div>

          {githubLoading ? (
            <p className="mt-3 text-xs text-muted">
              Loading GitHub repositories…
            </p>
          ) : !githubConnected ? (
            <p className="mt-3 text-xs leading-5 text-muted">
              <Link
                href="/dashboard/settings/github"
                className="font-medium text-accent-hover hover:underline"
              >
                Authorize GitHub
              </Link>{" "}
              to choose a private repository.
            </p>
          ) : githubDelivery ? (
            <div className="mt-4">
              <Select
                label="Private repository"
                name="githubRepository"
                value={githubRepoFullName}
                onValueChange={setGitHubRepoFullName}
                onOpenChange={(open) => {
                  if (!open) return;
                  void fetchGitHubRepositories()
                    .then((data) => {
                      setGitHubConnected(data.connected);
                      setGitHubRepositories(data.repositories);
                    })
                    .catch((repositoryError) => {
                      setError(
                        repositoryError instanceof Error
                          ? repositoryError.message
                          : "Could not refresh GitHub repositories",
                      );
                    });
                }}
                searchable
                searchPlaceholder="Search private repositories…"
                menuClassName="!w-full !max-w-none"
                required
                options={[
                  { value: "", label: "Choose a repository" },
                  ...githubRepositories.map((repository) => ({
                    value: repository.fullName,
                    label: repository.disabledReason
                      ? `${repository.fullName} — ${repository.disabledReason}`
                      : repository.fullName,
                    disabled: repository.disabled,
                  })),
                ]}
              />
              <p className="mt-2 text-xs leading-5 text-muted">
                Private repositories refresh whenever this menu opens.
                Repositories without administrator permission cannot be used
                to invite customers.
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col py-3 sticky bottom-0 bg-white">
          {autosaveStatus !== "idle" && (
            <p
              className={`mb-2 text-center text-xs ${
                autosaveStatus === "error" ? "text-danger" : "text-muted"
              }`}
              aria-live="polite"
            >
              {autosaveStatus === "saving"
                ? "Autosaving…"
                : autosaveStatus === "saved"
                  ? "Changes saved"
                  : "Autosave failed"}
            </p>
          )}
          <div className="flex flex-row items-center gap-2">
            <Button className="py-3 flex-1" type="submit" disabled={saving}>
              {saving ? "Saving…" : productId ? "Update" : "Create product"}
            </Button>
          </div>
          {/* <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/products")}
          >
            Cancel
          </Button> */}
        </div>
      </div>
    </form>
  );
}
