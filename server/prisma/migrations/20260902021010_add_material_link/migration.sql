-- AlterTable
ALTER TABLE "Material" ADD COLUMN     "linkUrl" TEXT,
ALTER COLUMN "fileData" DROP NOT NULL;
