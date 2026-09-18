import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Body,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Throttle } from "@nestjs/throttler";
import { Public } from "../common/decorators/public.decorator";
import { photoUploadOptions } from "../attachments/multer.config";
import { CustomerPortalService } from "./customer-portal.service";
import { CustomerPortalLoginDto } from "./dto/customer-portal-login.dto";
import { CustomerJwtAuthGuard } from "./customer-jwt-auth.guard";
import { CurrentCustomer } from "./current-customer.decorator";
import type { AuthenticatedCustomer } from "./customer-jwt.strategy";

/**
 * @Public() a nivel de todo el controlador: así el guard GLOBAL del
 * personal (JwtAuthGuard, registrado en AppModule) ignora por completo
 * este controlador — nunca hay riesgo de que interfiera. La protección
 * real de las rutas que sí la necesitan viene de @UseGuards(CustomerJwtAuthGuard)
 * puesto explícitamente en cada una.
 */
@Controller("customer-portal")
@Public()
export class CustomerPortalController {
  constructor(private customerPortalService: CustomerPortalService) {}

  // El documento como contraseña es adivinable con suficientes intentos
  // — limitar los intentos por IP es la única barrera real disponible
  // dado ese diseño. Mismo patrón que ya usa el login del personal
  // (Fase 14).
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post("login")
  login(@Body() dto: CustomerPortalLoginDto) {
    return this.customerPortalService.login(dto);
  }

  @UseGuards(CustomerJwtAuthGuard)
  @Get("my-orders")
  findMyOrders(@CurrentCustomer() customer: AuthenticatedCustomer) {
    return this.customerPortalService.findMyOrders(customer.id);
  }

  @UseGuards(CustomerJwtAuthGuard)
  @Get("my-orders/:id")
  findMyOrderDetail(
    @CurrentCustomer() customer: AuthenticatedCustomer,
    @Param("id", ParseIntPipe) orderId: number,
  ) {
    return this.customerPortalService.findMyOrderDetail(customer.id, orderId);
  }

  @UseGuards(CustomerJwtAuthGuard)
  @Get("my-quotations")
  findMyQuotations(@CurrentCustomer() customer: AuthenticatedCustomer) {
    return this.customerPortalService.findMyQuotations(customer.id);
  }

  @UseGuards(CustomerJwtAuthGuard)
  @Get("my-quotations/:id")
  findMyQuotationDetail(
    @CurrentCustomer() customer: AuthenticatedCustomer,
    @Param("id", ParseIntPipe) quotationId: number,
  ) {
    return this.customerPortalService.findMyQuotationDetail(customer.id, quotationId);
  }

  @UseGuards(CustomerJwtAuthGuard)
  @Post("my-orders/:id/signature")
  @UseInterceptors(FileInterceptor("file", photoUploadOptions))
  signMyOrder(
    @CurrentCustomer() customer: AuthenticatedCustomer,
    @Param("id", ParseIntPipe) orderId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.customerPortalService.signMyOrder(customer.id, orderId, file);
  }

  @UseGuards(CustomerJwtAuthGuard)
  @Post("my-quotations/:id/approve")
  approveMyQuotation(
    @CurrentCustomer() customer: AuthenticatedCustomer,
    @Param("id", ParseIntPipe) quotationId: number,
  ) {
    return this.customerPortalService.approveMyQuotation(customer.id, quotationId);
  }

  @UseGuards(CustomerJwtAuthGuard)
  @Post("my-quotations/:id/reject")
  rejectMyQuotation(
    @CurrentCustomer() customer: AuthenticatedCustomer,
    @Param("id", ParseIntPipe) quotationId: number,
  ) {
    return this.customerPortalService.rejectMyQuotation(customer.id, quotationId);
  }
}
