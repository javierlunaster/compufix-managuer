import { Controller, Get, Header, Param, ParseIntPipe, StreamableFile } from "@nestjs/common";
import { DocumentsService } from "./documents.service";
import { CurrentUser, AuthenticatedUser } from "../auth/decorators/current-user.decorator";

function asAttachment(filename: string) {
  return `attachment; filename="${filename}"`;
}

@Controller()
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Get("repair-orders/:orderId/documents/technical-report")
  @Header("Content-Type", "application/pdf")
  async technicalReport(
    @Param("orderId", ParseIntPipe) orderId: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    const { buffer, filename } = await this.documentsService.generateTechnicalReport(
      orderId,
      actingUser.id,
    );
    return new StreamableFile(buffer, {
      type: "application/pdf",
      disposition: asAttachment(filename),
    });
  }

  @Get("repair-orders/:orderId/documents/intake-receipt")
  @Header("Content-Type", "application/pdf")
  async intakeReceipt(@Param("orderId", ParseIntPipe) orderId: number) {
    const { buffer, filename } = await this.documentsService.generateIntakeReceipt(orderId);
    return new StreamableFile(buffer, {
      type: "application/pdf",
      disposition: asAttachment(filename),
    });
  }

  @Get("repair-orders/:orderId/documents/delivery-receipt")
  @Header("Content-Type", "application/pdf")
  async deliveryReceipt(@Param("orderId", ParseIntPipe) orderId: number) {
    const { buffer, filename } = await this.documentsService.generateDeliveryReceipt(orderId);
    return new StreamableFile(buffer, {
      type: "application/pdf",
      disposition: asAttachment(filename),
    });
  }

  @Get("warranties/:warrantyId/document")
  @Header("Content-Type", "application/pdf")
  async warrantyCertificate(@Param("warrantyId", ParseIntPipe) warrantyId: number) {
    const { buffer, filename } = await this.documentsService.generateWarrantyCertificate(
      warrantyId,
    );
    return new StreamableFile(buffer, {
      type: "application/pdf",
      disposition: asAttachment(filename),
    });
  }

  @Get("quotations/:quotationId/document")
  @Header("Content-Type", "application/pdf")
  async quotationPdf(
    @Param("quotationId", ParseIntPipe) quotationId: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ) {
    const { buffer, filename } = await this.documentsService.generateQuotationPdf(
      quotationId,
      actingUser.id,
    );
    return new StreamableFile(buffer, {
      type: "application/pdf",
      disposition: asAttachment(filename),
    });
  }
}
