ALTER TYPE "NotificationDeliveryStatus" ADD VALUE 'PROCESSING';

ALTER TABLE "OrderNotification"
ADD COLUMN "lockedAt" TIMESTAMP(3),
ADD COLUMN "providerMessageId" TEXT;
