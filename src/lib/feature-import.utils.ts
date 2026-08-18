import type {
  FeatureImportRow,
  ImportableFeatureKey,
  ImportedFeatureData,
  PreparedFeatureImportRecord,
  PreparedFeatureImportResult,
} from "./feature-import.types";
import type {
  FeatureRecord,
  FeatureRecordInput,
  FeatureRecordValue,
} from "./feature-records.types";

const importableFeatures: ImportableFeatureKey[] = [
  "customers",
  "affiliates",
  "subscribers",
];

export function isImportableFeatureKey(
  feature: string
): feature is ImportableFeatureKey {
  return importableFeatures.includes(feature as ImportableFeatureKey);
}

export function normalizeImportKey(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function toCamelCase(value: string): string {
  const words = value
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);
  if (words.length === 0) return "field";
  return words
    .map((word, index) => {
      const lower = word.toLowerCase();
      return index === 0
        ? lower
        : `${lower.charAt(0).toUpperCase()}${lower.slice(1)}`;
    })
    .join("");
}

function countDelimiter(line: string, delimiter: string): number {
  let count = 0;
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] === '"') quoted = !quoted;
    else if (!quoted && line[index] === delimiter) count += 1;
  }
  return count;
}

function detectCsvDelimiter(content: string): string {
  const firstLine = content.split(/\r?\n/, 1)[0] || "";
  return [",", ";", "\t"].sort(
    (left, right) =>
      countDelimiter(firstLine, right) - countDelimiter(firstLine, left)
  )[0];
}

function parseCsv(content: string): FeatureImportRow[] {
  const delimiter = detectCsvDelimiter(content);
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    const nextCharacter = content[index + 1];
    if (character === '"') {
      if (quoted && nextCharacter === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && character === delimiter) {
      row.push(value);
      value = "";
    } else if (!quoted && (character === "\n" || character === "\r")) {
      row.push(value);
      value = "";
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      if (character === "\r" && nextCharacter === "\n") index += 1;
    } else {
      value += character;
    }
  }

  if (quoted) throw new Error("The CSV file contains an unclosed quoted value");
  row.push(value);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  const headers = (rows.shift() || []).map((header) =>
    header.replace(/^\uFEFF/, "").trim()
  );
  if (headers.length === 0) throw new Error("The CSV file has no header row");

  return rows.map((cells) =>
    Object.fromEntries(
      headers.map((header, index) => [header, cells[index]?.trim() || ""])
    )
  );
}

function flattenJsonRow(value: unknown): FeatureImportRow | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const row = value as FeatureImportRow;
  if (
    row.attributes &&
    typeof row.attributes === "object" &&
    !Array.isArray(row.attributes)
  ) {
    return {
      ...(row.attributes as FeatureImportRow),
      ...(row.id !== undefined ? { identifier: row.id } : {}),
    };
  }
  return row;
}

function parseJson(content: string): FeatureImportRow[] {
  const parsed = JSON.parse(content) as unknown;
  let values: unknown[] = [];
  if (Array.isArray(parsed)) {
    values = parsed;
  } else if (parsed && typeof parsed === "object") {
    const object = parsed as FeatureImportRow;
    const nestedKeys = [
      "data",
      "records",
      "items",
      "customers",
      "affiliates",
      "subscribers",
    ];
    const nestedRows = nestedKeys.map((key) => object[key]).find(Array.isArray);
    const nestedRecord = nestedKeys
      .map((key) => object[key])
      .find(
        (value) =>
          Boolean(value) && typeof value === "object" && !Array.isArray(value)
      );
    const firstArray = Object.values(object).find(Array.isArray);
    values = nestedRows || firstArray || [nestedRecord || object];
  }
  return values
    .map(flattenJsonRow)
    .filter((row): row is FeatureImportRow => Boolean(row));
}

export function parseFeatureImportFile(
  content: string,
  fileName: string
): FeatureImportRow[] {
  const trimmed = content.trim();
  if (!trimmed) throw new Error("The selected file is empty");
  const jsonFile =
    fileName.toLowerCase().endsWith(".json") ||
    trimmed.startsWith("[") ||
    trimmed.startsWith("{");
  const rows = jsonFile ? parseJson(trimmed) : parseCsv(content);
  if (rows.length === 0) throw new Error("No data rows were found");
  return rows;
}

function importValue(value: unknown): FeatureRecordValue | undefined {
  if (value === null) return null;
  if (["string", "number", "boolean"].includes(typeof value)) {
    return value as string | number | boolean;
  }
  if (Array.isArray(value)) {
    return value
      .map(importValue)
      .filter((item): item is FeatureRecordValue => item !== undefined);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as FeatureImportRow)
        .map(([key, item]) => [toCamelCase(key), importValue(item)] as const)
        .filter((entry): entry is readonly [string, FeatureRecordValue] =>
          entry[1] !== undefined
        )
    );
  }
  return undefined;
}

function createImportedData(row: FeatureImportRow): ImportedFeatureData {
  return Object.fromEntries(
    Object.entries(row)
      .map(([key, value]) => [toCamelCase(key), importValue(value)] as const)
      .filter((entry): entry is readonly [string, FeatureRecordValue] =>
        entry[1] !== undefined && entry[1] !== ""
      )
  );
}

function getRowValue(row: FeatureImportRow, aliases: string[]): unknown {
  const values = new Map(
    Object.entries(row).map(([key, value]) => [normalizeImportKey(key), value])
  );
  for (const alias of aliases) {
    const value = values.get(normalizeImportKey(alias));
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return undefined;
}

function getText(row: FeatureImportRow, aliases: string[]): string {
  const value = getRowValue(row, aliases);
  return value === undefined ? "" : String(value).trim();
}

function getNumber(
  row: FeatureImportRow,
  aliases: string[]
): number | undefined {
  const value = getRowValue(row, aliases);
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value === undefined) return undefined;
  const normalized = String(value).replace(/[^0-9.-]/g, "");
  if (!normalized) return undefined;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : undefined;
}

function setNumber(
  data: ImportedFeatureData,
  key: string,
  value: number | undefined
) {
  if (value !== undefined) data[key] = value;
}

function normalizeCreatedAt(value: string): string | undefined {
  if (!value) return undefined;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
    return `${value.replace(" ", "T")}Z`;
  }
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? undefined : new Date(timestamp).toISOString();
}

function getName(row: FeatureImportRow): string {
  const name = getText(row, [
    "name",
    "full_name",
    "customer_name",
    "display_name",
  ]);
  if (name) return name;
  return [
    getText(row, ["first_name", "firstname", "given_name"]),
    getText(row, ["last_name", "lastname", "family_name"]),
  ]
    .filter(Boolean)
    .join(" ");
}

function getEmail(row: FeatureImportRow): string {
  return getText(row, [
    "email",
    "email_address",
    "customer_email",
    "subscriber_email",
  ]).toLowerCase();
}

function normalizeStatus(
  feature: ImportableFeatureKey,
  row: FeatureImportRow
): string {
  const status = getText(row, ["status", "status_formatted", "state"])
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (feature === "subscribers") {
    return status.includes("unsub") ||
      Boolean(getText(row, ["unsubscribed_at", "unsubscribedAt"]))
      ? "unsubscribed"
      : "subscribed";
  }
  if (feature === "affiliates") {
    return ["disabled", "inactive", "rejected", "blocked"].includes(status)
      ? "inactive"
      : "active";
  }
  return status === "blocked" ? "blocked" : "active";
}

function slugifyAffiliateCode(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function prepareCustomer(
  row: FeatureImportRow,
  rowNumber: number
): PreparedFeatureImportRecord {
  const email = getEmail(row);
  const name = getName(row) || email;
  if (!email) throw new Error("email is required");
  const data = createImportedData(row);
  setNumber(
    data,
    "subscriptionsCount",
    getNumber(row, ["subscriptions_count", "subscription_count", "subscriptions"])
  );
  setNumber(data, "ordersCount", getNumber(row, ["orders_count", "order_count", "orders"]));
  setNumber(data, "mrr", getNumber(row, ["mrr", "monthly_recurring_revenue"]));
  setNumber(
    data,
    "totalSpent",
    getNumber(row, [
      "total_spent",
      "total_revenue",
      "total_revenue_currency",
      "lifetime_value",
      "revenue",
    ])
  );
  return {
    rowNumber,
    identity: email,
    input: {
      title: name,
      subtitle: email,
      status: normalizeStatus("customers", row),
      createdAt: normalizeCreatedAt(
        getText(row, ["created_at", "created", "date_created", "joined_at"])
      ),
      data,
    },
  };
}

function prepareAffiliate(
  row: FeatureImportRow,
  rowNumber: number
): PreparedFeatureImportRecord {
  const email = getEmail(row);
  const name = getName(row) || email;
  if (!email) throw new Error("email is required");
  const data = createImportedData(row);
  setNumber(data, "commissionRate", getNumber(row, ["rate", "commission_rate", "commission"]));
  setNumber(data, "totalEarnings", getNumber(row, ["total_earnings", "earnings", "total_commission"]));
  setNumber(data, "unpaidEarnings", getNumber(row, ["unpaid_earnings", "unpaid", "balance"]));
  data.code =
    slugifyAffiliateCode(
      getText(row, ["code", "tracking_code", "affiliate_code", "identifier"]) ||
        email.split("@")[0] ||
        name
    ) || `affiliate-${rowNumber}`;
  return {
    rowNumber,
    identity: email,
    input: {
      title: name,
      subtitle: email,
      status: normalizeStatus("affiliates", row),
      createdAt: normalizeCreatedAt(
        getText(row, ["created_at", "created", "date_created", "joined_at"])
      ),
      data,
    },
  };
}

function prepareSubscriber(
  row: FeatureImportRow,
  rowNumber: number
): PreparedFeatureImportRecord {
  const email = getEmail(row);
  if (!email) throw new Error("email is required");
  const data = createImportedData(row);
  data.source = String(data.source || "Imported");
  setNumber(data, "emailSends", getNumber(row, ["email_sends", "emails_sent", "sends"]));
  setNumber(data, "emailOpens", getNumber(row, ["email_opens", "emails_opened", "opens"]));
  setNumber(data, "emailClicks", getNumber(row, ["email_clicks", "emails_clicked", "clicks"]));
  return {
    rowNumber,
    identity: email,
    input: {
      title: email,
      subtitle: getName(row),
      status: normalizeStatus("subscribers", row),
      createdAt: normalizeCreatedAt(
        getText(row, ["created_at", "created", "date_created", "subscribed_at"])
      ),
      data,
    },
  };
}

export function prepareFeatureImportRows(
  feature: ImportableFeatureKey,
  rows: FeatureImportRow[]
): PreparedFeatureImportResult {
  const records: PreparedFeatureImportRecord[] = [];
  const errors: string[] = [];
  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    try {
      records.push(
        feature === "customers"
          ? prepareCustomer(row, rowNumber)
          : feature === "affiliates"
            ? prepareAffiliate(row, rowNumber)
            : prepareSubscriber(row, rowNumber)
      );
    } catch (error) {
      errors.push(
        `Row ${rowNumber}: ${error instanceof Error ? error.message : "invalid data"}`
      );
    }
  });
  return { records, errors };
}

export function getFeatureImportIdentity(
  feature: ImportableFeatureKey,
  record: FeatureRecord
): string {
  return String(
    feature === "subscribers" ? record.title : record.subtitle || ""
  )
    .trim()
    .toLowerCase();
}

export function createUniqueAffiliateCode(
  requestedCode: string,
  usedCodes: Set<string>
): string {
  const base = slugifyAffiliateCode(requestedCode) || "affiliate";
  let code = base;
  let suffix = 2;
  while (usedCodes.has(code.toLowerCase())) {
    code = `${base}-${suffix}`;
    suffix += 1;
  }
  usedCodes.add(code.toLowerCase());
  return code;
}
