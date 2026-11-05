import { PartialType } from "@nestjs/mapped-types";
import { CreateScrapComponentDto } from "./create-scrap-component.dto";

export class UpdateScrapComponentDto extends PartialType(CreateScrapComponentDto) {}
