CREATE TYPE "OrderStatus" AS ENUM ('NEW', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED');
CREATE TYPE "OrderChannel" AS ENUM ('WHATSAPP', 'MANUAL');

CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "unitId" TEXT,
    "code" TEXT NOT NULL,
    "channel" "OrderChannel" NOT NULL DEFAULT 'MANUAL',
    "status" "OrderStatus" NOT NULL DEFAULT 'NEW',
    "customerName" TEXT,
    "customerPhone" TEXT,
    "notes" TEXT,
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "confirmedAt" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrderItemOption" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "optionId" TEXT,
    "optionName" TEXT NOT NULL,
    "priceDelta" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderItemOption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Unit_id_tenantId_key" ON "Unit"("id", "tenantId");
CREATE UNIQUE INDEX "Option_id_tenantId_key" ON "Option"("id", "tenantId");
CREATE UNIQUE INDEX "Order_tenantId_code_key" ON "Order"("tenantId", "code");
CREATE UNIQUE INDEX "Order_id_tenantId_key" ON "Order"("id", "tenantId");
CREATE INDEX "Order_tenantId_status_createdAt_idx" ON "Order"("tenantId", "status", "createdAt");
CREATE INDEX "Order_unitId_idx" ON "Order"("unitId");
CREATE INDEX "Order_customerPhone_idx" ON "Order"("customerPhone");
CREATE UNIQUE INDEX "OrderItem_id_tenantId_key" ON "OrderItem"("id", "tenantId");
CREATE INDEX "OrderItem_tenantId_orderId_idx" ON "OrderItem"("tenantId", "orderId");
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");
CREATE INDEX "OrderItemOption_tenantId_orderItemId_idx" ON "OrderItemOption"("tenantId", "orderItemId");
CREATE INDEX "OrderItemOption_optionId_idx" ON "OrderItemOption"("optionId");

ALTER TABLE "Order" ADD CONSTRAINT "Order_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_unitId_tenantId_fkey" FOREIGN KEY ("unitId", "tenantId") REFERENCES "Unit"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_tenantId_fkey" FOREIGN KEY ("orderId", "tenantId") REFERENCES "Order"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_tenantId_fkey" FOREIGN KEY ("productId", "tenantId") REFERENCES "Product"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderItemOption" ADD CONSTRAINT "OrderItemOption_orderItemId_tenantId_fkey" FOREIGN KEY ("orderItemId", "tenantId") REFERENCES "OrderItem"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItemOption" ADD CONSTRAINT "OrderItemOption_optionId_tenantId_fkey" FOREIGN KEY ("optionId", "tenantId") REFERENCES "Option"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
