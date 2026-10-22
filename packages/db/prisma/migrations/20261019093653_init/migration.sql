-- CreateEnum
CREATE TYPE "BayStatus" AS ENUM ('ready', 'in_use', 'paused', 'power_returned', 'out_of_service');

-- CreateEnum
CREATE TYPE "SessionState" AS ENUM ('pending', 'running', 'paused', 'ended');

-- CreateEnum
CREATE TYPE "CheckoutState" AS ENUM ('awaiting', 'matched', 'pending', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "PaymentState" AS ENUM ('matched', 'unmatched', 'duplicate', 'pending');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('bike', 'car');

-- CreateEnum
CREATE TYPE "DeviceRole" AS ENUM ('listener', 'dashboard');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('open', 'resolved');

-- CreateTable
CREATE TABLE "Station" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerVpa" TEXT NOT NULL,
    "payeeName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Station_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bay" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "BayStatus" NOT NULL DEFAULT 'out_of_service',
    "online" BOOLEAN NOT NULL DEFAULT false,
    "lastHeartbeatAt" TIMESTAMP(3),
    "mqttUser" TEXT,
    "mqttPass" TEXT,
    "currentToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "durationSec" INTEGER NOT NULL,
    "pricePaise" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "bayId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "state" "SessionState" NOT NULL DEFAULT 'pending',
    "cookieId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "remainingSec" INTEGER NOT NULL,
    "pauseUsedSec" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Checkout" (
    "id" TEXT NOT NULL,
    "bayId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "sessionId" TEXT,
    "amountPaise" INTEGER NOT NULL,
    "state" "CheckoutState" NOT NULL DEFAULT 'awaiting',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Checkout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "checkoutId" TEXT,
    "deviceId" TEXT,
    "amountPaise" INTEGER NOT NULL,
    "upiRef" TEXT NOT NULL,
    "senderVpa" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "rawText" TEXT,
    "state" "PaymentState" NOT NULL DEFAULT 'unmatched',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "bayId" TEXT,
    "type" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reading" (
    "id" TEXT NOT NULL,
    "bayId" TEXT NOT NULL,
    "motorOn" BOOLEAN NOT NULL,
    "mains" BOOLEAN NOT NULL,
    "batteryMv" INTEGER,
    "wifiRssi" INTEGER,
    "remainingSec" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "bayId" TEXT,
    "kind" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "contact" TEXT,
    "status" "IssueStatus" NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "DeviceRole" NOT NULL DEFAULT 'listener',
    "signingKey" TEXT NOT NULL,
    "lastHeartbeatAt" TIMESTAMP(3),
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Bay_stationId_idx" ON "Bay"("stationId");

-- CreateIndex
CREATE INDEX "Plan_stationId_idx" ON "Plan"("stationId");

-- CreateIndex
CREATE INDEX "Session_bayId_idx" ON "Session"("bayId");

-- CreateIndex
CREATE INDEX "Session_cookieId_idx" ON "Session"("cookieId");

-- CreateIndex
CREATE UNIQUE INDEX "Checkout_sessionId_key" ON "Checkout"("sessionId");

-- CreateIndex
CREATE INDEX "Checkout_bayId_idx" ON "Checkout"("bayId");

-- CreateIndex
CREATE INDEX "Checkout_state_idx" ON "Checkout"("state");

-- CreateIndex
CREATE INDEX "Checkout_amountPaise_idx" ON "Checkout"("amountPaise");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_upiRef_key" ON "Payment"("upiRef");

-- CreateIndex
CREATE INDEX "Payment_amountPaise_idx" ON "Payment"("amountPaise");

-- CreateIndex
CREATE INDEX "Payment_state_idx" ON "Payment"("state");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_stationId_key_key" ON "Setting"("stationId", "key");

-- CreateIndex
CREATE INDEX "Event_bayId_createdAt_idx" ON "Event"("bayId", "createdAt");

-- CreateIndex
CREATE INDEX "Event_type_idx" ON "Event"("type");

-- CreateIndex
CREATE INDEX "Reading_bayId_createdAt_idx" ON "Reading"("bayId", "createdAt");

-- CreateIndex
CREATE INDEX "Issue_status_idx" ON "Issue"("status");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Bay" ADD CONSTRAINT "Bay_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_bayId_fkey" FOREIGN KEY ("bayId") REFERENCES "Bay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checkout" ADD CONSTRAINT "Checkout_bayId_fkey" FOREIGN KEY ("bayId") REFERENCES "Bay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checkout" ADD CONSTRAINT "Checkout_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checkout" ADD CONSTRAINT "Checkout_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_checkoutId_fkey" FOREIGN KEY ("checkoutId") REFERENCES "Checkout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Setting" ADD CONSTRAINT "Setting_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_bayId_fkey" FOREIGN KEY ("bayId") REFERENCES "Bay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reading" ADD CONSTRAINT "Reading_bayId_fkey" FOREIGN KEY ("bayId") REFERENCES "Bay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_bayId_fkey" FOREIGN KEY ("bayId") REFERENCES "Bay"("id") ON DELETE SET NULL ON UPDATE CASCADE;
