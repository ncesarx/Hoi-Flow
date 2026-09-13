import { createHmac, timingSafeEqual } from "node:crypto";

export function safeSecretEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyMetaWebhookSignature(
  rawBody: string,
  signature: string | null,
  appSecret: string,
) {
  if (!signature?.startsWith("sha256=")) return false;
  const expected = `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
  return safeSecretEqual(signature, expected);
}

type ParsedMessage = {
  externalMessageId: string;
  phoneNumberId: string;
  sender: string;
  type: "TEXT" | "UNSUPPORTED";
  text: string | null;
  receivedAt: Date;
  payload: Record<string, unknown>;
};

export function parseMetaWebhookMessages(payload: unknown): ParsedMessage[] {
  if (!payload || typeof payload !== "object") return [];
  const entries = (payload as { entry?: unknown }).entry;
  if (!Array.isArray(entries)) return [];
  const parsed: ParsedMessage[] = [];

  for (const entry of entries) {
    const changes = entry && typeof entry === "object" ? (entry as { changes?: unknown }).changes : null;
    if (!Array.isArray(changes)) continue;
    for (const change of changes) {
      const value = change && typeof change === "object" ? (change as { value?: unknown }).value : null;
      if (!value || typeof value !== "object") continue;
      const record = value as { metadata?: { phone_number_id?: unknown }; messages?: unknown };
      const phoneNumberId = record.metadata?.phone_number_id;
      if (typeof phoneNumberId !== "string" || !Array.isArray(record.messages)) continue;
      for (const message of record.messages) {
        if (!message || typeof message !== "object") continue;
        const item = message as { id?: unknown; from?: unknown; type?: unknown; timestamp?: unknown; text?: { body?: unknown } };
        if (typeof item.id !== "string" || typeof item.from !== "string") continue;
        const isText = item.type === "text" && typeof item.text?.body === "string";
        const timestamp = typeof item.timestamp === "string" ? Number(item.timestamp) : NaN;
        parsed.push({
          externalMessageId: item.id,
          phoneNumberId,
          sender: item.from,
          type: isText ? "TEXT" : "UNSUPPORTED",
          text: isText ? String(item.text?.body).trim() : null,
          receivedAt: Number.isFinite(timestamp) ? new Date(timestamp * 1000) : new Date(),
          payload: message as Record<string, unknown>,
        });
      }
    }
  }
  return parsed;
}
