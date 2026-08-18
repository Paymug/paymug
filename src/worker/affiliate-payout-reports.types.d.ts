export interface WorkerFeatureRecordRow {
  id: string;
  user_id: string;
  title: string;
  subtitle: string | null;
  status: string;
  data: string;
}

export interface WorkerEnabledStoreRow {
  id: string;
  user_id: string;
}

export interface WorkerFeatureData {
  affiliateId?: string;
  storeId?: string;
  commission?: number;
  payoutReportId?: string;
  periodKey?: string;
  [key: string]: unknown;
}

export interface AffiliatePayoutReportGenerationResult {
  reportsCreated: number;
  referralsIncluded: number;
}
