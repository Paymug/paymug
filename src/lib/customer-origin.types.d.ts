export interface OriginVisit {
  visitorId: string;
  source: string;
  city: string;
  country: string;
  createdAt: string;
}

export interface CustomerOrigin {
  source: string;
  city?: string;
  country?: string;
}
