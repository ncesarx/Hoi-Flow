export type AuditableProductOptionGroup = {
  productId: string;
  optionGroupId: string;
  position: number;
};

export function buildProductOptionGroupAuditSnapshot(
  relation: AuditableProductOptionGroup,
) {
  return {
    productId: relation.productId,
    optionGroupId: relation.optionGroupId,
    position: relation.position,
  };
}

export function productOptionGroupEntityId(
  relation: Pick<
    AuditableProductOptionGroup,
    "productId" | "optionGroupId"
  >,
) {
  return `${relation.productId}:${relation.optionGroupId}`;
}
