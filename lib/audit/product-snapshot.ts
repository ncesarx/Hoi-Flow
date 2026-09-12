export type AuditableProduct = {
  categoryId: string | null;
  name: string;
  slug: string;
  description: string | null;
  basePrice: {
    toFixed(decimalPlaces: number): string;
  } | null;
  status: string;
  imageUrl: string | null;
};

export function buildProductAuditSnapshot(
  product: AuditableProduct,
) {
  return {
    categoryId: product.categoryId,
    name: product.name,
    slug: product.slug,
    description: product.description,
    basePrice:
      product.basePrice?.toFixed(2) ?? null,
    status: product.status,
    imageUrl: product.imageUrl,
  };
}
