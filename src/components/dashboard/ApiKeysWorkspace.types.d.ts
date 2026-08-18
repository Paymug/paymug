import type {
  ApiKeyRecord,
  CreatedApiKey,
} from "@/lib/feature-records.types";

export interface ApiKeysResponse extends Partial<CreatedApiKey> {
  keys?: ApiKeyRecord[];
  error?: string;
}
