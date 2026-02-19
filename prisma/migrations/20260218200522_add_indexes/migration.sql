-- CreateIndex
CREATE INDEX "AnalyticsDaily_urlId_idx" ON "AnalyticsDaily"("urlId");

-- CreateIndex
CREATE INDEX "AnalyticsDaily_date_idx" ON "AnalyticsDaily"("date");

-- CreateIndex
CREATE INDEX "Url_userId_idx" ON "Url"("userId");

-- CreateIndex
CREATE INDEX "Url_shortCode_idx" ON "Url"("shortCode");

-- CreateIndex
CREATE INDEX "Url_userId_isDeleted_idx" ON "Url"("userId", "isDeleted");

-- CreateIndex
CREATE INDEX "Url_createdAt_idx" ON "Url"("createdAt");
