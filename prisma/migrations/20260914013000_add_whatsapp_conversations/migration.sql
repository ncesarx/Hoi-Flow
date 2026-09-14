CREATE TYPE "WhatsAppConversationStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'HANDED_OFF', 'EXPIRED');
CREATE TYPE "WhatsAppIntent" AS ENUM ('START', 'MENU', 'ORDER', 'STATUS', 'HELP', 'CANCEL', 'UNKNOWN');

ALTER TABLE "WhatsAppInboundMessage"
ADD COLUMN "processingAt" TIMESTAMP(3),
ADD COLUMN "conversationId" TEXT;

CREATE TABLE "WhatsAppConversation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "status" "WhatsAppConversationStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastIntent" "WhatsAppIntent",
    "draft" JSONB NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WhatsAppConversation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsAppConversation_tenantId_customerPhone_key" ON "WhatsAppConversation"("tenantId", "customerPhone");
CREATE INDEX "WhatsAppConversation_tenantId_status_lastMessageAt_idx" ON "WhatsAppConversation"("tenantId", "status", "lastMessageAt");
CREATE INDEX "WhatsAppInboundMessage_conversationId_idx" ON "WhatsAppInboundMessage"("conversationId");

ALTER TABLE "WhatsAppConversation" ADD CONSTRAINT "WhatsAppConversation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WhatsAppInboundMessage" ADD CONSTRAINT "WhatsAppInboundMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "WhatsAppConversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
