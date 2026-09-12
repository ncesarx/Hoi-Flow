export type AuditableOptionGroup = {
  name: string;
  slug: string;
  selectionType: string;
  minSelections: number;
  maxSelections: number;
  required: boolean;
  position: number;
  active: boolean;
};

export function buildOptionGroupAuditSnapshot(
  group: AuditableOptionGroup,
) {
  return {
    name: group.name,
    slug: group.slug,
    selectionType: group.selectionType,
    minSelections: group.minSelections,
    maxSelections: group.maxSelections,
    required: group.required,
    position: group.position,
    active: group.active,
  };
}
