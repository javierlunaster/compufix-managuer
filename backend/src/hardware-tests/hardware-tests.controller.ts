import { Body, Controller, Delete, Param, ParseIntPipe, Patch } from "@nestjs/common";
import { HardwareTestsService } from "./hardware-tests.service";
import { RepairOrdersService } from "../repair-orders/repair-orders.service";
import { UpdateHardwareTestResultDto } from "./dto/update-hardware-test-result.dto";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Controller("hardware-tests")
export class HardwareTestsController {
  constructor(
    private hardwareTestsService: HardwareTestsService,
    private repairOrdersService: RepairOrdersService,
  ) {}

  @Patch(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateHardwareTestResultDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    const orderId = await this.hardwareTestsService.getOrderId(id);
    await this.repairOrdersService.assertTechnicianAccess(actingUser, orderId);
    return this.hardwareTestsService.update(id, dto, actingUser.id);
  }

  @Delete(":id")
  async remove(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    const orderId = await this.hardwareTestsService.getOrderId(id);
    await this.repairOrdersService.assertTechnicianAccess(actingUser, orderId);
    return this.hardwareTestsService.remove(id, actingUser.id);
  }
}
