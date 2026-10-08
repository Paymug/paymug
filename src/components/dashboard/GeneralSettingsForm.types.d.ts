export interface GeneralSettingsFormProps {
  name: string;
  email: string;
  memberSince: string;
  timezone: string;
  timezoneOptions: Array<{ value: string; label: string }>;
}

export interface GeneralSettingsResponse {
  error?: string;
}
