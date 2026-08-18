"use client";

import {
  PencilSimple,
  PaperPlaneTilt,
  Plus,
  Trash,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, Spinner } from "@/components/ui";
import { AffiliateDetailsDrawer } from "./AffiliateDetailsDrawer";
import { RightDrawerModal } from "./RightDrawerModal";
import { FeatureImportButton } from "./FeatureImportButton";
import { FeatureRecordForm } from "./FeatureRecordForm";
import { EnvironmentCopyMenu } from "./EnvironmentCopyMenu";
import { useRowSelection } from "./use-row-selection";
import {
  deleteDiscountRecord,
  updateDiscountStatus,
} from "./discount-edit.utils";
import type { FeatureRecord } from "@/lib/feature-records.types";
import type { FeatureRecordsResponse } from "./DashboardFeaturePage.types";
import type { RightDrawerModalHandle } from "./RightDrawerModal.types";
import {
  dashboardCardClass,
  dashboardIconButtonClass,
} from "./dashboard.styles";
import type {
  FeatureFormValues,
  FeatureProductOptionsResponse,
  FeatureWorkspaceProps,
} from "./FeatureWorkspace.types";
import {
  createEmptyFeatureValues,
  createFeatureRecordInput,
  createFeatureValuesFromRecord,
  getFeatureDrawerMeta,
  getFeatureFormConfig,
  getFeatureListValue,
} from "./feature-workspace.utils";

export function FeatureWorkspace({ feature }: FeatureWorkspaceProps) {
  const [records, setRecords] = useState<FeatureRecord[]>([]);
  const [productOptions, setProductOptions] = useState<
    Array<{ label: string; value: string }>
  >([]);
  const [values, setValues] = useState<FeatureFormValues>(() =>
    createEmptyFeatureValues(feature)
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedAffiliate, setSelectedAffiliate] =
    useState<FeatureRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const drawerRef = useRef<RightDrawerModalHandle>(null);
  const formFeature = getFeatureFormConfig(feature, Boolean(editingId));
  const selectable = feature.key === "customers" || feature.key === "campaigns";
  const selection = useRowSelection(records.map((record) => record.id));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/features/${feature.key}`);
      const data = (await response.json()) as FeatureRecordsResponse;
      if (!response.ok) throw new Error(data.error || "Could not load records");
      setRecords(data.records || []);
      if (feature.fields.some((field) => field.optionsSource === "products")) {
        const productResponse = await fetch("/api/products");
        const productData =
          (await productResponse.json()) as FeatureProductOptionsResponse;
        if (!productResponse.ok) {
          throw new Error(productData.error || "Could not load products");
        }
        setProductOptions(
          (productData.products || []).map((product) => ({
            label: product.name,
            value: product.id,
          }))
        );
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Could not load records"
      );
    } finally {
      setLoading(false);
    }
  }, [feature.key]);

  useEffect(() => {
    void load();
  }, [load]);

  const editingRecord = editingId
    ? records.find((item) => item.id === editingId)
    : undefined;
  const editingIsActive = editingRecord?.status === "active";
  const isEditing = Boolean(editingId);
  const drawerMeta = getFeatureDrawerMeta(
    feature,
    isEditing,
    editingRecord?.title
  );
  const showDiscountStatusToggle =
    feature.key === "discounts" && isEditing && Boolean(editingRecord);

  function startCreate() {
    setEditingId(null);
    setValues(createEmptyFeatureValues(feature));
    setError(null);
    setFormOpen(true);
  }

  function startEdit(record: FeatureRecord) {
    setEditingId(record.id);
    setValues(createFeatureValuesFromRecord(feature, record));
    setError(null);
    setFormOpen(true);
  }

  function closeForm() {
    setEditingId(null);
    setFormOpen(false);
    setError(null);
  }

  function requestCloseForm() {
    drawerRef.current?.close();
  }

  async function toggleDiscountStatus(record: FeatureRecord) {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateDiscountStatus(
        record,
        record.status === "active" ? "disabled" : "active"
      );
      setRecords((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not update discount"
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeEditingRecord() {
    if (!editingRecord) return;
    if (!confirm(`Delete “${editingRecord.title}”?`)) return;
    setSaving(true);
    setError(null);
    try {
      if (feature.key === "discounts") {
        await deleteDiscountRecord(editingRecord.id);
      } else {
        const response = await fetch(
          `/api/features/${feature.key}/${editingRecord.id}`,
          { method: "DELETE" }
        );
        const data = (await response.json()) as FeatureRecordsResponse;
        if (!response.ok) {
          throw new Error(data.error || "Could not delete record");
        }
      }
      setRecords((current) =>
        current.filter((item) => item.id !== editingRecord.id)
      );
      requestCloseForm();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not delete record"
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveRecord(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const endpoint = editingId
      ? `/api/features/${feature.key}/${editingId}`
      : `/api/features/${feature.key}`;
    const existingRecord = editingId
      ? records.find((record) => record.id === editingId)
      : undefined;

    try {
      const response = await fetch(endpoint, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          createFeatureRecordInput(feature, values, existingRecord?.data)
        ),
      });
      const data = (await response.json()) as FeatureRecordsResponse;
      if (!response.ok) throw new Error(data.error || "Could not save record");
      await load();
      requestCloseForm();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Could not save record"
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeRecord(record: FeatureRecord) {
    if (!confirm(`Delete “${record.title}”?`)) return;
    setError(null);
    const response = await fetch(
      `/api/features/${feature.key}/${record.id}`,
      { method: "DELETE" }
    );
    const data = (await response.json()) as FeatureRecordsResponse;
    if (!response.ok) {
      setError(data.error || "Could not delete record");
      return;
    }
    setRecords((current) =>
      current.filter((item) => item.id !== record.id)
    );
  }

  async function sendCampaign(record: FeatureRecord) {
    if (!confirm(`Send “${record.title}” to all active subscribers?`)) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/features/campaigns/${record.id}/send`,
        { method: "POST" }
      );
      const data = (await response.json()) as FeatureRecordsResponse;
      if (!response.ok) {
        throw new Error(data.error || "Could not send campaign");
      }
      await load();
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Could not send campaign"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6">
      <div className="flex items-start justify-end gap-2">
        {feature.allowCreate && !formOpen && (
          <Button type="button" onClick={startCreate}>
            <Plus size={15} weight="bold" aria-hidden />
            {feature.createLabel}
          </Button>
        )}
        {feature.allowImport &&
          (feature.key === "customers" ||
            feature.key === "affiliates" ||
            feature.key === "subscribers") && (
            <FeatureImportButton feature={feature.key} onImported={load} />
          )}
        {selectable && (
          <EnvironmentCopyMenu
            kind={feature.key as "customers" | "campaigns"}
            selectedIds={[...selection.selectedIds]}
            environment={records[0]?.environment || "sandbox"}
          />
        )}
      </div>

      {formOpen && (
        <RightDrawerModal
          ref={drawerRef}
          eyebrow={drawerMeta.eyebrow}
          title={drawerMeta.title}
          description={drawerMeta.description}
          onClose={closeForm}
        >
          {showDiscountStatusToggle && (
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[#2a2a33]">Status</p>
                <p className="mt-0.5 text-xs text-[#8b8ba3]">
                  {editingIsActive
                    ? "Available at checkout"
                    : "Hidden from checkout"}
                </p>
              </div>
              <button
                type="button"
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-0 p-0 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-65 ${
                  editingIsActive ? "bg-accent" : "bg-[#d7d7df]"
                }`}
                role="switch"
                aria-checked={editingIsActive}
                aria-label={
                  editingIsActive ? "Disable discount" : "Enable discount"
                }
                disabled={saving || !editingRecord}
                onClick={() => {
                  if (editingRecord) void toggleDiscountStatus(editingRecord);
                }}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-[0_1px_2px_rgb(39_39_47/22%)] transition-transform ${
                    editingIsActive ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          )}
          <FeatureRecordForm
            feature={formFeature}
            values={values}
            productOptions={productOptions}
            editing={isEditing}
            saving={saving}
            error={error}
            layout="stack"
            showCancel={false}
            footerStart={
              isEditing ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="!px-2.5 text-danger hover:bg-red-50"
                  disabled={saving || !editingRecord}
                  onClick={() => void removeEditingRecord()}
                >
                  Delete
                </Button>
              ) : undefined
            }
            onSubmit={saveRecord}
            onClose={requestCloseForm}
            onValueChange={(name, value) =>
              setValues((current) => ({ ...current, [name]: value }))
            }
          />
        </RightDrawerModal>
      )}

      {!formOpen && error && <Alert>{error}</Alert>}

      <div className={`${dashboardCardClass} mt-3 overflow-hidden`}>
        {loading ? (
          <div className="flex min-h-56 items-center justify-center text-sm text-muted">
            <Spinner className="mr-2 h-4 w-4" /> Loading…
          </div>
        ) : records.length === 0 ? (
          <div className="flex min-h-56 items-center justify-center p-8 text-center">
            <div className="max-w-sm">
              <h2 className="text-sm font-semibold">{feature.emptyTitle}</h2>
              <p className="mt-2 text-sm leading-5 text-muted">
                {feature.emptyDescription}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table
              className="w-full text-left text-sm"
              style={{
                minWidth: `${Math.max(680, (feature.listFields.length + 1) * 140)}px`,
              }}
            >
              <thead>
                <tr className="border-b border-border text-muted">
                  {selectable && (
                    <th className="w-12 px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label="Select all rows"
                        className={`h-4 w-4 accent-[#d8ad00] transition-opacity ${
                          selection.hasSelection ? "opacity-100" : "opacity-0"
                        }`}
                        checked={
                          records.length > 0 &&
                          selection.selectedIds.size === records.length
                        }
                        onChange={selection.toggleAll}
                      />
                    </th>
                  )}
                  {feature.listFields.map((field) => (
                    <th
                      key={`${field.source}-${field.name || field.label}`}
                      className="px-4 py-3 font-medium"
                    >
                      {field.label}
                    </th>
                  ))}
                  <th className="w-24 px-4 py-3 text-right font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {records.map((record, index) => (
                  <tr
                    key={record.id}
                    className={`group border-b border-border last:border-0 ${
                      selection.isSelected(record.id) ? "bg-accent-soft/40" : ""
                    } ${
                      feature.key === "affiliates" ||
                      feature.key === "discounts"
                        ? "cursor-pointer transition hover:bg-[#fafafd]"
                        : ""
                    }`}
                    onMouseEnter={() => {
                      if (selectable) selection.enterDrag(record.id);
                    }}
                    onClick={() => {
                      if (feature.key === "affiliates") {
                        setSelectedAffiliate(record);
                      } else if (feature.key === "discounts") {
                        startEdit(record);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (
                        (feature.key === "affiliates" ||
                          feature.key === "discounts") &&
                        (event.key === "Enter" || event.key === " ")
                      ) {
                        event.preventDefault();
                        if (feature.key === "affiliates") {
                          setSelectedAffiliate(record);
                        } else {
                          startEdit(record);
                        }
                      }
                    }}
                    tabIndex={
                      feature.key === "affiliates" ||
                      feature.key === "discounts"
                        ? 0
                        : undefined
                    }
                  >
                    {selectable && (
                      <td
                        className="w-12 px-4 py-3"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          aria-label={`Select ${record.title}`}
                          className={`h-4 w-4 accent-[#d8ad00] transition-opacity ${
                            selection.hasSelection
                              ? "opacity-100"
                              : "opacity-0 group-hover:opacity-100"
                          }`}
                          checked={selection.isSelected(record.id)}
                          onMouseDown={() => selection.beginDrag(record.id)}
                          onChange={(event) =>
                            selection.toggle(
                              record.id,
                              index,
                              (event.nativeEvent as MouseEvent).shiftKey
                            )
                          }
                        />
                      </td>
                    )}
                    {feature.listFields.map((field) => {
                      const value = getFeatureListValue(record, field);
                      return (
                        <td
                          key={`${record.id}-${field.source}-${field.name || field.label}`}
                          className="max-w-56 truncate px-4 py-3"
                        >
                          {(field.name === "approvalUrl" ||
                            field.name === "trackingPath") &&
                          value !== "—" ? (
                            <a
                              href={value}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-accent-hover underline"
                            >
                              {field.name === "approvalUrl"
                                ? "Open approval"
                                : value}
                            </a>
                          ) : (
                            value
                          )}
                        </td>
                      );
                    })}
                    <td
                      className="px-4 py-3"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="flex justify-end gap-1">
                        {feature.key === "campaigns" &&
                          record.status !== "sent" && (
                            <button
                              type="button"
                              className={`${dashboardIconButtonClass} !h-8 !w-8`}
                              onClick={() => void sendCampaign(record)}
                              aria-label={`Send ${record.title}`}
                              disabled={saving}
                            >
                              <PaperPlaneTilt size={15} aria-hidden />
                            </button>
                          )}
                        {feature.key !== "affiliate-clicks" && (
                          <button
                            type="button"
                            className={`${dashboardIconButtonClass} !h-8 !w-8`}
                            onClick={() => startEdit(record)}
                            aria-label={`Edit ${record.title}`}
                          >
                            <PencilSimple size={15} aria-hidden />
                          </button>
                        )}
                        <button
                          type="button"
                          className={`${dashboardIconButtonClass} !h-8 !w-8 hover:!text-red-500`}
                          onClick={() => void removeRecord(record)}
                          aria-label={`Delete ${record.title}`}
                        >
                          <Trash size={15} aria-hidden />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {selectedAffiliate && (
        <AffiliateDetailsDrawer
          affiliate={selectedAffiliate}
          onClose={() => setSelectedAffiliate(null)}
          onUpdated={(updated) => {
            const enriched = {
              ...updated,
              data: { ...selectedAffiliate.data, ...updated.data },
            };
            setRecords((current) =>
              current.map((record) =>
                record.id === enriched.id ? enriched : record
              )
            );
            setSelectedAffiliate(enriched);
          }}
        />
      )}
    </div>
  );
}
