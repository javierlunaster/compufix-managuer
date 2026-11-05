import { Module } from "@nestjs/common";
import { ScrapBoardsController } from "./scrap-boards.controller";
import { ScrapBoardsService } from "./scrap-boards.service";

@Module({
  controllers: [ScrapBoardsController],
  providers: [ScrapBoardsService],
})
export class ScrapBoardsModule {}
