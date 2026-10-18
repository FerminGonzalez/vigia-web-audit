-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "reportStandard" TEXT NOT NULL DEFAULT 'nist-800-61';

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "reportStandard" TEXT;

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "reportStandard" TEXT;
