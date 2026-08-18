export interface PublicAffiliateApplicationRouteContext {
  params: Promise<{ id: string }>;
}

export interface AffiliateSignupMetadata {
  city: string;
  country: string;
  signupIp: string;
}

export interface CloudflareAffiliateRequest extends Request {
  cf?: {
    city?: string;
    country?: string;
  };
}
