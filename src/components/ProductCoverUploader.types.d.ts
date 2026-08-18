export interface ProductCoverUploaderProps {
  imageUrl: string;
  onChange(imageUrl: string): void;
  onError(message: string): void;
}
