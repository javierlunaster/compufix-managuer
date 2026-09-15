import { PartialType } from "@nestjs/mapped-types";
import { CreateHardwareTestResultDto } from "./create-hardware-test-result.dto";

export class UpdateHardwareTestResultDto extends PartialType(CreateHardwareTestResultDto) {}
