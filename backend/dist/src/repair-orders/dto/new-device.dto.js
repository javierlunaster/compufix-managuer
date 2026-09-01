"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewDeviceDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_device_dto_1 = require("../../devices/dto/create-device.dto");
/**
 * Igual a CreateDeviceDto pero sin `customerId`: cuando se recibe un equipo
 * nuevo (que nunca había pasado por el taller) al mismo tiempo que se crea
 * la orden, el cliente ya se conoce por `CreateRepairOrderDto.customerId` —
 * no tiene sentido pedirlo dos veces.
 */
class NewDeviceDto extends (0, mapped_types_1.OmitType)(create_device_dto_1.CreateDeviceDto, [
    "customerId",
]) {
}
exports.NewDeviceDto = NewDeviceDto;
