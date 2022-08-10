-- CreateTable
CREATE TABLE "Configuration" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Configuration_key_key" ON "Configuration"("key");
