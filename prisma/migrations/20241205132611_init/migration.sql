/*
  Warnings:

  - You are about to drop the column `avaiable` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "avaiable",
ADD COLUMN     "available" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "paidAt" TIMESTAMP(3);
