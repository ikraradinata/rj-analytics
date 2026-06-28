-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- CreateTable
CREATE TABLE "DoctorDailyMetric" (
    "id" SERIAL NOT NULL,
    "serviceDate" DATE NOT NULL,
    "doctorName" TEXT NOT NULL,
    "patientCount" INTEGER NOT NULL,
    "dcpNumerator" INTEGER NOT NULL,
    "dcpDenominator" INTEGER NOT NULL,
    "cwtTotalSeconds" INTEGER NOT NULL,
    "cwtCount" INTEGER NOT NULL,
    "appointment" INTEGER NOT NULL DEFAULT 0,
    "walkIn" INTEGER NOT NULL DEFAULT 0,
    "bpjs" INTEGER NOT NULL DEFAULT 0,
    "regular" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorDailyMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientMixDaily" (
    "id" SERIAL NOT NULL,
    "serviceDate" DATE NOT NULL,
    "doctorName" TEXT NOT NULL,
    "newPatient" INTEGER NOT NULL,
    "existingPatient" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientMixDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadLog" (
    "id" SERIAL NOT NULL,
    "fileName" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "rangeFrom" DATE NOT NULL,
    "rangeTo" DATE NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT,

    CONSTRAINT "UploadLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthAuditLog" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "ipAddress" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DoctorDailyMetric_doctorName_idx" ON "DoctorDailyMetric"("doctorName");

-- CreateIndex
CREATE INDEX "DoctorDailyMetric_serviceDate_idx" ON "DoctorDailyMetric"("serviceDate");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorDailyMetric_serviceDate_doctorName_key" ON "DoctorDailyMetric"("serviceDate", "doctorName");

-- CreateIndex
CREATE INDEX "PatientMixDaily_serviceDate_idx" ON "PatientMixDaily"("serviceDate");

-- CreateIndex
CREATE UNIQUE INDEX "PatientMixDaily_serviceDate_doctorName_key" ON "PatientMixDaily"("serviceDate", "doctorName");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "AuthAuditLog_username_idx" ON "AuthAuditLog"("username");
