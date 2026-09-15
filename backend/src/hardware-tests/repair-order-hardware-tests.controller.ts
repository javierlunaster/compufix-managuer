import { Body, Controller, Param, ParseIntPipe, Post } from "@nestjs/common";
import { HardwareTestsService } from "./hardware-tests.service";
import { RepairOrdersService } from "../repair-orders/repair-orders.service";
import { CreateHardwareTestResultDto } from "./dto/create-hardware-test-result.dto";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Controller("repair-orders/:orderId/hardware-tests")
export class RepairOrderHardwareTestsController {
  constructor(
    private hardwareTestsService: HardwareTestsService,
    private repairOrdersService: RepairOrdersService,
  ) {}

  @Post()
  async create(
    @Param("orderId", ParseIntPipe) orderId: number,
    @Body() dto: CreateHardwareTestResultDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    await this.repairOrdersService.assertTechnicianAccess(actingUser, orderId);
    return this.hardwareTestsService.create(orderId, dto, actingUser.id);
  }
}
