"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateMeasurementDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_measurement_dto_1 = require("./create-measurement.dto");
class UpdateMeasurementDto extends (0, mapped_types_1.PartialType)(create_measurement_dto_1.CreateMeasurementDto) {
}
exports.UpdateMeasurementDto = UpdateMeasurementDto;
