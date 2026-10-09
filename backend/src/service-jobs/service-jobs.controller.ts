import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from "@nestjs/common";
import { PaymentStatus } from "@prisma/client";
import { ServiceJobsService } from "./service-jobs.service";
import { CreateServiceJobDto } from "./dto/create-service-job.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

// Sin @Roles() para crear/consultar/registrar el pago del cliente:
// cualquier personal lo hace, igual que un abono normal (ver
// PaymentsController.create). Solo pagarle al técnico (mueve dinero de
// caja hacia afuera) queda restringido, ver abajo.
@Controller("service-jobs")
export class ServiceJobsController {
  constructor(private serviceJobsService: ServiceJobsService) {}

  @Post()
  create(@Body() dto: CreateServiceJobDto, @CurrentUser() actingUser: AuthenticatedUser) {
    return this.serviceJobsService.create(dto, actingUser.id);
  }

  // GET /service-jobs?technicianId=&clientPaymentStatus=&technicianPaymentStatus=
  @Get()
  findAll(
    @Query("technicianId") technicianId?: string,
    @Query("clientPaymentStatus") clientPaymentStatus?: PaymentStatus,
    @Query("technicianPaymentStatus") technicianPaymentStatus?: PaymentStatus,
  ) {
    return this.serviceJobsService.findAll({
      technicianId: technicianId ? Number(technicianId) : undefined,
      clientPaymentStatus,
      technicianPaymentStatus,
    });
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.serviceJobsService.findOne(id);
  }

  // Registra que el cliente pagó la cuenta de cobro — dinero real
  // entrando a caja, pero mismo criterio que un abono normal: cualquier
  // personal lo puede registrar.
  @Post(":id/mark-client-paid")
  markClientPaid(@Param("id", ParseIntPipe) id: number, @CurrentUser() actingUser: AuthenticatedUser) {
    return this.serviceJobsService.markClientPaid(id, actingUser.id);
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
