export function sortProductsByOrder<T extends { id: string }>(
  products: T[],
  orderIds?: string[],
): T[] {
  if (!orderIds || orderIds.length === 0) return products;
  const index = new Map(orderIds.map((id, position) => [id, position]));
  return [...products].sort(
    (left, right) =>
      (index.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
      (index.get(right.id) ?? Number.MAX_SAFE_INTEGER),
  );
}
