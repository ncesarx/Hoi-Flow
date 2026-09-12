export type AuditableCategory = {
  name: string;
  slug: string;
  position: number;
  active: boolean;
};

export function buildCategoryAuditSnapshot(
  category: AuditableCategory,
) {
  return {
    name: category.name,
    slug: category.slug,
    position: category.position,
    active: category.active,
  };
}
