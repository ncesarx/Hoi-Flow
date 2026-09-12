export type AuditableOption = {
  optionGroupId: string;
  name: string;
  position: number;
  active: boolean;
  priceDelta: {
    toFixed(decimalPlaces: number): string;
  };
};

export function buildOptionAuditSnapshot(
  option: AuditableOption,
) {
  return {
    optionGroupId: option.optionGroupId,
    name: option.name,
    position: option.position,
    active: option.active,
    priceDelta: option.priceDelta.toFixed(2),
  };
}
