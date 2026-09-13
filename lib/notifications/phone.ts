export function normalizeWhatsAppPhone(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return { valid: true as const, value: null };
  }
  if (typeof value !== "string") {
    return { valid: false as const };
  }

  const digits = value.replace(/\D/g, "");
  const normalized = digits.length === 10 || digits.length === 11
    ? `55${digits}`
    : digits;

  if (!/^\d{12,13}$/.test(normalized)) {
    return { valid: false as const };
  }

  return { valid: true as const, value: normalized };
}
