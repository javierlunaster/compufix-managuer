import { Controller, Get, Query, BadRequestException } from "@nestjs/common";
import { FinanceService } from "./finance.service";
import { Roles } from "../auth/decorators/roles.decorator";

@Controller("finance")
@Roles("Administrador", "Gerente")
export class FinanceController {
  constructor(private financeService: FinanceService) {}

  @Get("daily")
  getDaily(@Query("year") year: string, @Query("month") month: string) {
    const yearNum = Number(year);
    const monthNum = Number(month);
    if (!yearNum || !monthNum) {
      throw new BadRequestException("Debes indicar year y month");
    }
    return this.financeService.getDailyBreakdown(yearNum, monthNum);
  }
}
