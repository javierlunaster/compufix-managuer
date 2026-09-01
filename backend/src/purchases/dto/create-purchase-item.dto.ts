import { IsInt, IsNumber, Min } from "class-validator";

export class CreatePurchaseItemDto {
  @IsInt()
  productId: number;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitCost: number;
}
