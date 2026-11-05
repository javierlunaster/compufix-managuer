-- CreateEnum
CREATE TYPE "ScrapComponentStatus" AS ENUM ('AVAILABLE', 'REMOVED');

-- CreateTable
CREATE TABLE "scrap_boards" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "brandId" INTEGER,
    "deviceTypeId" INTEGER,
    "location" TEXT,
    "notes" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scrap_boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scrap_components" (
    "id" SERIAL NOT NULL,
    "scrapBoardId" INTEGER NOT NULL,
    "designator" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" "ScrapComponentStatus" NOT NULL DEFAULT 'AVAILABLE',
    "removedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scrap_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scrap_board_files" (
    "id" SERIAL NOT NULL,
    "scrapBoardId" INTEGER NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "uploadedById" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scrap_board_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scrap_boards_code_key" ON "scrap_boards"("code");

-- AddForeignKey
ALTER TABLE "scrap_boards" ADD CONSTRAINT "scrap_boards_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scrap_boards" ADD CONSTRAINT "scrap_boards_deviceTypeId_fkey" FOREIGN KEY ("deviceTypeId") REFERENCES "device_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scrap_components" ADD CONSTRAINT "scrap_components_scrapBoardId_fkey" FOREIGN KEY ("scrapBoardId") REFERENCES "scrap_boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scrap_board_files" ADD CONSTRAINT "scrap_board_files_scrapBoardId_fkey" FOREIGN KEY ("scrapBoardId") REFERENCES "scrap_boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scrap_board_files" ADD CONSTRAINT "scrap_board_files_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
