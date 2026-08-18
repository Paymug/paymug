import { getSessionUser } from "@/lib/auth";
import {
  createUniqueAffiliateCode,
  getFeatureImportIdentity,
  isImportableFeatureKey,
  parseFeatureImportFile,
  prepareFeatureImportRows,
} from "@/lib/feature-import.utils";
import { createFeatureRecord, listFeatureRecords } from "@/lib/feature-records";
import type { FeatureRecordValue } from "@/lib/feature-records.types";
import { jsonError } from "@/lib/utils";
import type { FeatureRouteContext } from "../route.types";
import {
  getDashboardFeatureProRequirement,
  requireProFeature,
} from "@/lib/pro-feature-access";

const MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024;
const MAX_IMPORT_ROWS = 5000;

export async function POST(req: Request, { params }: FeatureRouteContext) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const { feature } = await params;
  const proFeature = getDashboardFeatureProRequirement(feature);
  if (proFeature) {
    const denied = await requireProFeature(proFeature);
    if (denied) return denied;
  }
  if (!isImportableFeatureKey(feature)) return jsonError("Not found", 404);

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return jsonError("Choose a CSV or JSON file");
  if (file.size > MAX_IMPORT_FILE_SIZE) {
    return jsonError("Import files must be 5 MB or smaller");
  }
  if (!/\.(csv|json)$/i.test(file.name)) {
    return jsonError("Only CSV and JSON files are supported");
  }

  try {
    const rows = parseFeatureImportFile(await file.text(), file.name);
    if (rows.length > MAX_IMPORT_ROWS) {
      return jsonError(`Import up to ${MAX_IMPORT_ROWS} rows at a time`);
    }
    const prepared = prepareFeatureImportRows(feature, rows);
    const existingRecords = await listFeatureRecords(
      user.id,
      feature,
      user.environment
    );
    const identities = new Set(
      existingRecords.map((record) => getFeatureImportIdentity(feature, record))
    );
    const usedAffiliateCodes = new Set(
      existingRecords.map((record) =>
        String(record.data.code || "").trim().toLowerCase()
      )
    );
    let imported = 0;
    let skipped = 0;

    for (const preparedRecord of prepared.records) {
      if (identities.has(preparedRecord.identity)) {
        skipped += 1;
        continue;
      }
      const data: Record<string, FeatureRecordValue> = {
        ...preparedRecord.input.data,
        storeId: user.activeStoreId,
      };
      if (feature === "affiliates") {
        const code = createUniqueAffiliateCode(
          String(data.code || "affiliate"),
          usedAffiliateCodes
        );
        data.code = code;
        data.trackingPath = `/r/${user.storeSlug}/${code}`;
      }
      try {
        await createFeatureRecord(user.id, feature, {
          ...preparedRecord.input,
          environment: user.environment,
          data,
        });
        identities.add(preparedRecord.identity);
        imported += 1;
      } catch (error) {
        prepared.errors.push(
          `Row ${preparedRecord.rowNumber}: ${
            error instanceof Error ? error.message : "could not save"
          }`
        );
      }
    }

    return Response.json({
      imported,
      skipped,
      failed: prepared.errors.length,
      errors: prepared.errors.slice(0, 20),
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not import the file"
    );
  }
}
