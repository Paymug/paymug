import type {
  StorePage,
  StorePageNavigation,
  StorePageStatus,
} from "@/lib/store-pages.types";

export interface PageEditorProps {
  page?: StorePage;
}

export interface PageEditorResponse {
  page?: StorePage;
  error?: string;
}

export interface PageContentEditorProps {
  value: string;
  onChange(value: string): void;
}

export interface PageCoverUploaderProps {
  imageUrl: string;
  onChange(imageUrl: string): void;
  onError(message: string): void;
}

export interface PageEditorState {
  title: string;
  slug: string;
  description: string;
  coverImageUrl: string;
  content: string;
  navigation: StorePageNavigation;
  navigationLabel: string;
  status: StorePageStatus;
}
