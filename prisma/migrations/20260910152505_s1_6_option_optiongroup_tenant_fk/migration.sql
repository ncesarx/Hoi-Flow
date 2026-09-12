/*
  Warnings:

  - A unique constraint covering the columns `[id,tenantId]` on the table `OptionGroup` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "OptionGroup_id_tenantId_key" ON "OptionGroup"("id", "tenantId");
