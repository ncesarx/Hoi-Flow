CREATE TYPE "WhatsAppMessageType" AS ENUM ('TEXT', 'UNSUPPORTED');

CREATE TABLE "WhatsAppInboundMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalMessageId" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "type" "WhatsAppMessageType" NOT NULL,
    "text" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WhatsAppInboundMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsAppInboundMessage_tenantId_externalMessageId_key" ON "WhatsAppInboundMessage"("tenantId", "externalMessageId");
CREATE INDEX "WhatsAppInboundMessage_tenantId_processedAt_receivedAt_idx" ON "WhatsAppInboundMessage"("tenantId", "processedAt", "receivedAt");
CREATE INDEX "WhatsAppInboundMessage_phoneNumberId_idx" ON "WhatsAppInboundMessage"("phoneNumberId");

ALTER TABLE "WhatsAppInboundMessage" ADD CONSTRAINT "WhatsAppInboundMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
