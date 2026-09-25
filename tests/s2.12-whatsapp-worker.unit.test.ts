import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { readWhatsAppWorkerConfig } from "../lib/whatsapp/worker-config";
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
  });

  test("detecta ciclos com e sem trabalho", () => {
    assert.equal(
      whatsAppWorkerDidWork({ inbound: 0, replies: 0, notifications: 0 }),
      false,
    );
    assert.equal(
      whatsAppWorkerDidWork({ inbound: 1, replies: 1, notifications: 0 }),
      true,
    );
  });
});
