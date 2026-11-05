import { PartialType } from "@nestjs/mapped-types";
import { CreateScrapBoardDto } from "./create-scrap-board.dto";

export class UpdateScrapBoardDto extends PartialType(CreateScrapBoardDto) {}
