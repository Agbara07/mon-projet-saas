-- CreateTable
CREATE TABLE "BRVMPriceHistory" (
    "id" SERIAL NOT NULL,
    "symbol" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BRVMPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BRVMPriceHistory_symbol_idx" ON "BRVMPriceHistory"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "BRVMPriceHistory_symbol_date_key" ON "BRVMPriceHistory"("symbol", "date");
