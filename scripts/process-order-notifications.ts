import "dotenv/config";

import { dispatchNextOrderNotification, releaseExpiredNotificationClaims } from "../lib/notifications/dispatcher";
import { createMetaWhatsAppSender } from "../lib/notifications/meta-whatsapp";
import { prisma } from "../lib/db/prisma";

const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const graphApiVersion = process.env.WHATSAPP_GRAPH_API_VERSION;
const tenantId = process.env.WHATSAPP_TENANT_ID;

if (!accessToken || !phoneNumberId || !graphApiVersion || !tenantId) {
  throw new Error("WhatsApp não configurado. Defina tenant, token, phone number ID e versão da Graph API.");
}

const sender = createMetaWhatsAppSender({ accessToken, phoneNumberId, graphApiVersion });

try {
  await releaseExpiredNotificationClaims(tenantId);
  for (let processed = 0; processed < 50; processed += 1) {
    const result = await dispatchNextOrderNotification(tenantId, sender);
    if (!result.processed) break;
  }
} finally {
  await prisma.$disconnect();
}
