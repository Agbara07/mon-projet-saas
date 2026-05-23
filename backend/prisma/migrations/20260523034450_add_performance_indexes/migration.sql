-- CreateIndex
CREATE INDEX "Alert_userId_idx" ON "Alert"("userId");

-- CreateIndex
CREATE INDEX "Alert_symbol_idx" ON "Alert"("symbol");

-- CreateIndex
CREATE INDEX "Alert_active_idx" ON "Alert"("active");

-- CreateIndex
CREATE INDEX "Holding_symbol_idx" ON "Holding"("symbol");

-- CreateIndex
CREATE INDEX "WatchlistItem_userId_idx" ON "WatchlistItem"("userId");
