import "dotenv/config";

import { prisma } from "../lib/db/prisma";
import { createMetaWhatsAppSender } from "../lib/notifications/meta-whatsapp";
import { dispatchNextWhatsAppReply, releaseExpiredWhatsAppReplyClaims } from "../lib/whatsapp/outbound-dispatcher";

const tenantId = process.env.WHATSAPP_TENANT_ID;
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
const graphApiVersion = process.env.WHATSAPP_GRAPH_API_VERSION ?? "v23.0";

if (!tenantId) throw new Error("WHATSAPP_TENANT_ID não configurado.");
if (!phoneNumberId) throw new Error("WHATSAPP_PHONE_NUMBER_ID não configurado.");
if (!accessToken) throw new Error("WHATSAPP_ACCESS_TOKEN não configurado.");

const sender = createMetaWhatsAppSender({ accessToken, phoneNumberId, graphApiVersion });

try {
  await releaseExpiredWhatsAppReplyClaims(tenantId, phoneNumberId);
  for (let processed = 0; processed < 50; processed += 1) {
    const result = await dispatchNextWhatsAppReply(tenantId, phoneNumberId, sender);
    if (!result.processed) break;
  }
} finally {
  await prisma.$disconnect();
}
