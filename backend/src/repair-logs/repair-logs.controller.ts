import { Body, Controller, Get, Param, ParseIntPipe, Patch } from "@nestjs/common";
import { RepairLogsService } from "./repair-logs.service";
import { UpdateLogDto } from "./dto/update-log.dto";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Controller("repair-logs")
export class RepairLogsController {
  constructor(private repairLogsService: RepairLogsService) {}

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.repairLogsService.findOne(id);
  }

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateLogDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.repairLogsService.update(id, dto, actingUser.id);
  }
}
