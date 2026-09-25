CREATE TABLE "WhatsAppOutboundMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "inReplyToId" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "providerMessageId" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppOutboundMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsAppInboundMessage_id_tenantId_key" ON "WhatsAppInboundMessage"("id", "tenantId");
CREATE UNIQUE INDEX "WhatsAppConversation_id_tenantId_key" ON "WhatsAppConversation"("id", "tenantId");
CREATE UNIQUE INDEX "WhatsAppOutboundMessage_inReplyToId_tenantId_key" ON "WhatsAppOutboundMessage"("inReplyToId", "tenantId");
CREATE INDEX "WhatsAppOutboundMessage_tenantId_status_availableAt_idx" ON "WhatsAppOutboundMessage"("tenantId", "status", "availableAt");
CREATE INDEX "WhatsAppOutboundMessage_tenantId_conversationId_idx" ON "WhatsAppOutboundMessage"("tenantId", "conversationId");

ALTER TABLE "WhatsAppOutboundMessage" ADD CONSTRAINT "WhatsAppOutboundMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WhatsAppOutboundMessage" ADD CONSTRAINT "WhatsAppOutboundMessage_conversationId_tenantId_fkey" FOREIGN KEY ("conversationId", "tenantId") REFERENCES "WhatsAppConversation"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WhatsAppOutboundMessage" ADD CONSTRAINT "WhatsAppOutboundMessage_inReplyToId_tenantId_fkey" FOREIGN KEY ("inReplyToId", "tenantId") REFERENCES "WhatsAppInboundMessage"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;
