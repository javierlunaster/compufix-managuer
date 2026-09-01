import { PartialType } from "@nestjs/mapped-types";
import { CreateDiagnosticDto } from "./create-diagnostic.dto";

export class UpdateDiagnosticDto extends PartialType(CreateDiagnosticDto) {}
