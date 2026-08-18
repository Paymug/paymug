export interface StoreSubscribeFormProps {
  storeSlug: string;
}

export interface StoreSubscribeResponse {
  subscribed?: boolean;
  error?: string;
}
