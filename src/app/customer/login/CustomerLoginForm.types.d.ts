export interface CustomerAuthResponse {
  ok?: boolean;
  message?: string;
  error?: string;
}

export interface CustomerLoginFormProps {
  nextPath?: string;
}
