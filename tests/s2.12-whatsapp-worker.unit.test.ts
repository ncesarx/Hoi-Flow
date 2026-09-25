import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { readWhatsAppWorkerConfig } from "../lib/whatsapp/worker-config";
import { whatsAppConversationExpirationCutoff } from "../lib/whatsapp/lifecycle";
import { whatsAppWorkerDidWork } from "../lib/whatsapp/worker";

const environment = {
  WHATSAPP_TENANT_ID: "tenant-a",
  WHATSAPP_PHONE_NUMBER_ID: "phone-a",
  WHATSAPP_ACCESS_TOKEN: "token-a",
};

describe("S2.12 - worker contínuo do WhatsApp", () => {
  test("carrega configuração segura com limites padrão", () => {
    const config = readWhatsAppWorkerConfig(environment);

    assert.equal(config.graphApiVersion, "v23.0");
    assert.equal(config.pollIntervalMs, 1_000);
    assert.equal(config.batchSize, 50);
    assert.equal(config.conversationTtlMinutes, 30);
  });

  test("rejeita configuração ausente ou fora dos limites", () => {
    assert.throws(
      () =>
        readWhatsAppWorkerConfig({ ...environment, WHATSAPP_ACCESS_TOKEN: "" }),
      /WHATSAPP_ACCESS_TOKEN/,
    );
    assert.throws(
      () =>
        readWhatsAppWorkerConfig({
          ...environment,
          WHATSAPP_WORKER_POLL_MS: "10",
        }),
      /WHATSAPP_WORKER_POLL_MS/,
    );
    assert.throws(
      () =>
        readWhatsAppWorkerConfig({
          ...environment,
          WHATSAPP_WORKER_BATCH_SIZE: "101",
        }),
      /WHATSAPP_WORKER_BATCH_SIZE/,
    );
    assert.throws(
      () =>
        readWhatsAppWorkerConfig({
          ...environment,
          WHATSAPP_CONVERSATION_TTL_MINUTES: "2",
        }),
      /WHATSAPP_CONVERSATION_TTL_MINUTES/,
    );
  });

  test("detecta ciclos com e sem trabalho", () => {
    assert.equal(
      whatsAppWorkerDidWork({
        inbound: 0,
        replies: 0,
        notifications: 0,
        expired: 0,
      }),
      false,
    );
    assert.equal(
      whatsAppWorkerDidWork({
        inbound: 1,
        replies: 1,
        notifications: 0,
        expired: 0,
      }),
      true,
    );
  });

  test("calcula expiração de conversa de forma determinística", () => {
    const now = new Date("2026-09-25T12:00:00.000Z");
    assert.equal(
      whatsAppConversationExpirationCutoff(30, now).toISOString(),
      "2026-09-25T11:30:00.000Z",
    );
  });
});
