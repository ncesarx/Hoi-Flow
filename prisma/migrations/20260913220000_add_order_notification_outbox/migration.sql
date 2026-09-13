CREATE TYPE "NotificationChannel" AS ENUM ('WHATSAPP');
CREATE TYPE "OrderNotificationEvent" AS ENUM ('ORDER_CONFIRMED', 'ORDER_PREPARING', 'ORDER_READY', 'ORDER_COMPLETED', 'ORDER_CANCELLED');
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

CREATE TABLE "OrderNotification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'WHATSAPP',
    "event" "OrderNotificationEvent" NOT NULL,
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "recipient" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OrderNotification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrderNotification_orderId_event_key" ON "OrderNotification"("orderId", "event");
CREATE INDEX "OrderNotification_tenantId_status_availableAt_idx" ON "OrderNotification"("tenantId", "status", "availableAt");
CREATE INDEX "OrderNotification_tenantId_orderId_idx" ON "OrderNotification"("tenantId", "orderId");

ALTER TABLE "OrderNotification" ADD CONSTRAINT "OrderNotification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderNotification" ADD CONSTRAINT "OrderNotification_orderId_tenantId_fkey" FOREIGN KEY ("orderId", "tenantId") REFERENCES "Order"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;
