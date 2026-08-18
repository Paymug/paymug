export interface RequestHeaderReader {
  get(name: string): string | null;
}
