"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateDeviceDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_device_dto_1 = require("./create-device.dto");
/**
 * Se quita `customerId`: si un equipo cambió de dueño, se registra como un
 * Device nuevo (y se conserva el histórico bajo el cliente original) en vez
 * de reasignarlo — reasignar borraría silenciosamente a quién perteneció.
 */
class UpdateDeviceDto extends (0, mapped_types_1.PartialType)((0, mapped_types_1.OmitType)(create_device_dto_1.CreateDeviceDto, ["customerId"])) {
}
exports.UpdateDeviceDto = UpdateDeviceDto;
