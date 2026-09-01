"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateProductDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_product_dto_1 = require("./create-product.dto");
/**
 * Se excluye `initialStock`: una vez creado el producto, cualquier cambio
 * de existencias pasa por un InventoryMovement explícito (endpoint de
 * movimientos), nunca por una edición general del producto.
 */
class UpdateProductDto extends (0, mapped_types_1.PartialType)((0, mapped_types_1.OmitType)(create_product_dto_1.CreateProductDto, ["initialStock"])) {
}
exports.UpdateProductDto = UpdateProductDto;
