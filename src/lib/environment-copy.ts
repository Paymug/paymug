import "server-only";

import { createProduct, findProductById } from "./db";
import {
  createFeatureRecord,
  findFeatureRecord,
} from "./feature-records";
import { slugify } from "./format";
import { uid } from "./utils";
import type {
  CopyEnvironmentRecordsInput,
  CopyEnvironmentRecordsResult,
} from "./environment-copy.types";

async function copyProductRecord(
  input: CopyEnvironmentRecordsInput,
  id: string
): Promise<boolean> {
  const source = await findProductById(id);
  if (
    !source ||
    source.userId !== input.userId ||
    source.storeId !== input.storeId ||
    source.environment !== input.sourceEnvironment
  ) {
    return false;
  }

  const copiedId = uid();
  const now = new Date().toISOString();
  await createProduct({
    ...source,
    id: copiedId,
    environment: input.targetEnvironment,
    slug: `${slugify(source.name) || "product"}-${copiedId.slice(0, 6)}`,
    createdAt: now,
    updatedAt: now,
  });
  return true;
}

async function copyFeatureRecord(
  input: CopyEnvironmentRecordsInput,
  id: string
): Promise<boolean> {
  const feature =
    input.kind === "customers" || input.kind === "campaigns"
      ? input.kind
      : undefined;
  if (!feature) return false;
  const source = await findFeatureRecord(id, input.userId);
  if (
    !source ||
    source.feature !== feature ||
    source.environment !== input.sourceEnvironment ||
    (source.data.storeId && String(source.data.storeId) !== input.storeId)
  ) {
    return false;
  }

  await createFeatureRecord(input.userId, source.feature, {
    environment: input.targetEnvironment,
    title: source.title,
    subtitle: source.subtitle,
    status: source.status,
    data: {
      ...source.data,
      environment: input.targetEnvironment,
    },
  });
  return true;
}

export async function copyEnvironmentRecords(
  input: CopyEnvironmentRecordsInput
): Promise<CopyEnvironmentRecordsResult> {
  let copied = 0;
  for (const id of [...new Set(input.ids)]) {
    const didCopy =
      input.kind === "products"
        ? await copyProductRecord(input, id)
        : await copyFeatureRecord(input, id);
    if (didCopy) copied += 1;
  }
  return {
    copied,
    skipped: input.ids.length - copied,
  };
}
