"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateLogDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_log_dto_1 = require("./create-log.dto");
/**
 * Se excluye `technicianId`: la bitácora refleja quién hizo cada
 * procedimiento en su momento — no se reasigna después. Si se registró con
 * el técnico equivocado, se corrige por auditoría, no editando el autor.
 */
class UpdateLogDto extends (0, mapped_types_1.PartialType)((0, mapped_types_1.OmitType)(create_log_dto_1.CreateLogDto, ["technicianId"])) {
}
exports.UpdateLogDto = UpdateLogDto;
