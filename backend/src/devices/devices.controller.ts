import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { DevicesService } from "./devices.service";
import { CreateDeviceDto } from "./dto/create-device.dto";
import { UpdateDeviceDto } from "./dto/update-device.dto";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

@Controller("devices")
export class DevicesController {
  constructor(private devicesService: DevicesService) {}

  @Post()
  create(@Body() dto: CreateDeviceDto, @CurrentUser() actingUser: AuthenticatedUser) {
    return this.devicesService.create(dto, actingUser.id);
  }

  // GET /devices?customerId=12  → equipos de un cliente
  // GET /devices?serial=ABC123  → búsqueda global por número de serie
  @Get()
  find(@Query("customerId") customerId?: string, @Query("serial") serial?: string) {
    if (customerId) {
      return this.devicesService.findByCustomer(Number(customerId));
    }
    if (serial) {
      return this.devicesService.findBySerial(serial);
    }
    return [];
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.devicesService.findOne(id);
  }

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateDeviceDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.devicesService.update(id, dto, actingUser.id);
  }

  @Patch(":id/deactivate")
  deactivate(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    return this.devicesService.deactivate(id, actingUser.id);
  }
}
