import type {
  FeatureRecord,
  FeatureRecordInput,
} from "@/lib/feature-records.types";
import type {
  DashboardFeatureConfig,
  DashboardFeatureListField,
} from "./DashboardFeaturePage.types";
import type { FeatureFormValues } from "./FeatureWorkspace.types";

export function createEmptyFeatureValues(
  feature: DashboardFeatureConfig
): FeatureFormValues {
  return Object.fromEntries(
    feature.fields.map((field) => [
      field.name,
      field.options?.[0]?.value || "",
    ])
  );
}

const discountEditableFieldNames = [
  "description",
  "type",
  "value",
  "subscriptionPeriods",
  "productIds",
];

export function getFeatureFormConfig(
  feature: DashboardFeatureConfig,
  editing: boolean
): DashboardFeatureConfig {
  if (!editing || feature.key !== "discounts") return feature;
  return {
    ...feature,
    fields: feature.fields.filter((field) =>
      discountEditableFieldNames.includes(field.name)
    ),
  };
}

const featureDrawerLabels: Record<
  string,
  { eyebrow: string; createDescription: string; editDescription: string }
> = {
  discounts: {
    eyebrow: "Discount",
    createDescription: "Add a code, amount, and availability.",
    editDescription: "Update code, amount, and availability.",
  },
  customers: {
    eyebrow: "Customer",
    createDescription: "Add a customer profile to your store.",
    editDescription: "Update this customer’s details.",
  },
  licenses: {
    eyebrow: "License",
    createDescription: "Issue a license key for a digital product.",
    editDescription: "Update this license key and assignment.",
  },
  affiliates: {
    eyebrow: "Affiliate",
    createDescription: "Add an affiliate partner to your program.",
    editDescription: "Update this affiliate’s profile and status.",
  },
  campaigns: {
    eyebrow: "Campaign",
    createDescription: "Draft an email campaign for your audience.",
    editDescription: "Update this campaign’s content and status.",
  },
  subscribers: {
    eyebrow: "Subscriber",
    createDescription: "Add someone to your email audience.",
    editDescription: "Update this subscriber’s details.",
  },
  subscriptions: {
    eyebrow: "Subscription",
    createDescription: "Add a recurring plan for a customer.",
    editDescription: "Update this subscription’s details.",
  },
};

export function getFeatureDrawerMeta(
  feature: DashboardFeatureConfig,
  editing: boolean,
  recordTitle?: string
): { eyebrow: string; title: string; description: string } {
  const labels = featureDrawerLabels[feature.key] || {
    eyebrow: feature.title.replace(/s$/, "") || feature.title,
    createDescription: feature.description,
    editDescription: `Update this ${feature.title.toLowerCase().replace(/s$/, "")}.`,
  };

  return {
    eyebrow: labels.eyebrow,
    title: editing
      ? recordTitle || `Edit ${labels.eyebrow.toLowerCase()}`
      : feature.createLabel,
    description: editing
      ? labels.editDescription
      : labels.createDescription,
  };
}

export function createFeatureValuesFromRecord(
  feature: DashboardFeatureConfig,
  record: FeatureRecord
): FeatureFormValues {
  return Object.fromEntries(
    feature.fields.map((field) => {
      if (field.source === "title") return [field.name, record.title];
      if (field.source === "subtitle") {
        return [field.name, record.subtitle || ""];
      }
      if (field.source === "status") return [field.name, record.status];
      if (field.type === "multi-select") {
        const storedValue =
          record.data[field.name] ??
          record.data.productId ??
          field.options?.[0]?.value ??
          "all";
        return [
          field.name,
          Array.isArray(storedValue)
            ? storedValue.join(",")
            : String(storedValue),
        ];
      }
      return [
        field.name,
        String(
          record.data[field.name] ?? field.options?.[0]?.value ?? ""
        ),
      ];
    })
  );
}

export function createFeatureRecordInput(
  feature: DashboardFeatureConfig,
  values: FeatureFormValues,
  existingData: FeatureRecord["data"] = {}
): FeatureRecordInput {
  const data: FeatureRecordInput["data"] = { ...existingData };
  let title = "";
  let subtitle = "";
  let status = "active";

  for (const field of feature.fields) {
    const value = values[field.name] || "";
    if (field.source === "title") title = value;
    else if (field.source === "subtitle") subtitle = value;
    else if (field.source === "status") status = value;
    else {
      data[field.name] =
        field.type === "number" && value !== ""
          ? Number(value)
          : field.type === "multi-select"
            ? value.split(",").filter(Boolean)
            : value;
    }
  }

  return {
    title: feature.key === "discounts" ? title.toUpperCase() : title,
    subtitle,
    status,
    data,
  };
}

export function getFeatureListValue(
  record: FeatureRecord,
  field: DashboardFeatureListField
): string {
  if (field.source === "title") return record.title;
  if (field.source === "subtitle") return record.subtitle || "—";
  if (field.source === "status") return record.status;
  if (
    field.name === "productNames" &&
    record.data.productNames === undefined
  ) {
    return String(record.data.productName || "All products");
  }
  if (
    field.name === "countryFormatted" &&
    record.data.countryFormatted === undefined
  ) {
    return String(record.data.country || "—");
  }
  if (field.name === "trialDays") {
    const days = Number(record.data.trialDays || 0);
    return days > 0 ? `${days} day${days === 1 ? "" : "s"}` : "No trial";
  }
  if (field.name === "subscriptionPeriods") {
    const periods = Number(record.data.subscriptionPeriods || 0);
    return periods > 0
      ? `${periods} ${periods === 1 ? "period" : "periods"}`
      : "All periods";
  }
  return String(record.data[field.name || ""] ?? "—");
}
