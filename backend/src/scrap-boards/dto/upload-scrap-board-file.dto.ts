import { IsIn, IsOptional, IsString } from "class-validator";

const SCRAP_FILE_CATEGORIES = ["foto", "esquematico", "boardview"] as const;

export { SCRAP_FILE_CATEGORIES };

export class UploadScrapBoardFileDto {
  @IsIn(SCRAP_FILE_CATEGORIES, {
    message: `La categoría debe ser una de: ${SCRAP_FILE_CATEGORIES.join(", ")}`,
  })
  category: (typeof SCRAP_FILE_CATEGORIES)[number];

  @IsOptional()
  @IsString()
  description?: string;
}
