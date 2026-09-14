import "dotenv/config";

import { prisma } from "../lib/db/prisma";
import { processNextWhatsAppMessage, releaseExpiredWhatsAppMessageClaims } from "../lib/whatsapp/conversations";

const tenantId = process.env.WHATSAPP_TENANT_ID;
if (!tenantId) throw new Error("WHATSAPP_TENANT_ID não configurado.");

try {
  await releaseExpiredWhatsAppMessageClaims(tenantId);
  for (let processed = 0; processed < 50; processed += 1) {
    if (!await processNextWhatsAppMessage(tenantId)) break;
  }
} finally {
  await prisma.$disconnect();
}
