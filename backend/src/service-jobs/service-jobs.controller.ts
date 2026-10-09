import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from "@nestjs/common";
import { PaymentStatus } from "@prisma/client";
import { ServiceJobsService } from "./service-jobs.service";
import { CreateServiceJobDto } from "./dto/create-service-job.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

// Sin @Roles() para crear/consultar: cualquier personal registra o revisa
// un servicio externo, igual que una orden de reparación o una venta. Solo
// pagarle al técnico (mueve dinero de caja) queda restringido, ver abajo.
@Controller("service-jobs")
export class ServiceJobsController {
  constructor(private serviceJobsService: ServiceJobsService) {}

  @Post()
  create(@Body() dto: CreateServiceJobDto, @CurrentUser() actingUser: AuthenticatedUser) {
    return this.serviceJobsService.create(dto, actingUser.id);
  }

  // GET /service-jobs?technicianId=&paymentStatus=
  @Get()
  findAll(
    @Query("technicianId") technicianId?: string,
    @Query("paymentStatus") paymentStatus?: PaymentStatus,
  ) {
    return this.serviceJobsService.findAll({
      technicianId: technicianId ? Number(technicianId) : undefined,
      paymentStatus,
    });
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.serviceJobsService.findOne(id);
  }

  // Paga al técnico su comisión: dinero real saliendo de caja, restringido
  // igual que la devolución a un cliente (ver PaymentsController.refund).
  @Post(":id/mark-technician-paid")
  @Roles("Administrador", "Gerente")
  markTechnicianPaid(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.serviceJobsService.markTechnicianPaid(id, actingUser.id);
  }
}
