import { IsInt } from "class-validator";

export class AssignQuotationOrderDto {
  @IsInt()
  orderId: number;
}
