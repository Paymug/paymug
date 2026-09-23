export interface AbandonmentSurveyProps {
  storeId: string;
  productId: string;
  question: string;
  options: string[];
  hasEmail: boolean;
  email?: string;
  completed: boolean;
}
