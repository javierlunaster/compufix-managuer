import { Type } from "class-transformer";
import { ArrayMinSize, ValidateNested } from "class-validator";
import { CreateMeasurementDto } from "./create-measurement.dto";

export class BulkCreateMeasurementsDto {
  @ValidateNested({ each: true })
  @Type(() => CreateMeasurementDto)
  @ArrayMinSize(1, { message: "Envía al menos una medición" })
  measurements: CreateMeasurementDto[];
}
