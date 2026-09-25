import "dotenv/config";

import { prisma } from "../lib/db/prisma";
import { createMetaWhatsAppSender } from "../lib/notifications/meta-whatsapp";
import { readWhatsAppWorkerConfig } from "../lib/whatsapp/worker-config";
import {
  runWhatsAppWorkerCycle,
  whatsAppWorkerDidWork,
} from "../lib/whatsapp/worker";

const config = readWhatsAppWorkerConfig(process.env);
const sender = createMetaWhatsAppSender(config);
let stopping = false;

function requestStop() {
  stopping = true;
}

process.once("SIGINT", requestStop);
process.once("SIGTERM", requestStop);

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

try {
  console.info("Worker WhatsApp iniciado.", {
    tenantId: config.tenantId,
    phoneNumberId: config.phoneNumberId,
    pollIntervalMs: config.pollIntervalMs,
    batchSize: config.batchSize,
    conversationTtlMinutes: config.conversationTtlMinutes,
  });

  while (!stopping) {
    const result = await runWhatsAppWorkerCycle({ ...config, sender });
    if (whatsAppWorkerDidWork(result)) {
      console.info("Ciclo WhatsApp processado.", result);
      continue;
    }
    await wait(config.pollIntervalMs);
  }
} catch (error) {
  console.error("Worker WhatsApp interrompido por erro.", {
    error: error instanceof Error ? error.message : "Erro desconhecido",
  });
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
  console.info("Worker WhatsApp finalizado.");
}
