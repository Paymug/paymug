export interface ProductDescriptionBlock {
  id?: string;
  type: "paragraph" | "header" | "list" | "image" | string;
  data: Record<string, unknown>;
}

export interface ProductDescriptionData {
  time?: number;
  version?: string;
  blocks: ProductDescriptionBlock[];
}

export interface ProductDescriptionEditorProps {
  value: string;
  onChange(value: string): void;
}

export interface ProductDescriptionProps {
  value: string;
  className?: string;
}

export interface ProductDescriptionListItem {
  content: string;
  items: ProductDescriptionListItem[];
}

export interface ProductDescriptionListProps {
  items: Array<string | ProductDescriptionListItem>;
  ordered: boolean;
}
