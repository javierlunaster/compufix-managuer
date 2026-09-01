import { PartialType, OmitType } from "@nestjs/mapped-types";
import { CreateLogDto } from "./create-log.dto";

/**
 * Se excluye `technicianId`: la bitácora refleja quién hizo cada
 * procedimiento en su momento — no se reasigna después. Si se registró con
 * el técnico equivocado, se corrige por auditoría, no editando el autor.
 */
export class UpdateLogDto extends PartialType(
  OmitType(CreateLogDto, ["technicianId"] as const),
) {}
