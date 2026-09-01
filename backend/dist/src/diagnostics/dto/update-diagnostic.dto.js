"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateDiagnosticDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_diagnostic_dto_1 = require("./create-diagnostic.dto");
class UpdateDiagnosticDto extends (0, mapped_types_1.PartialType)(create_diagnostic_dto_1.CreateDiagnosticDto) {
}
exports.UpdateDiagnosticDto = UpdateDiagnosticDto;
