// Tipos livianos que reflejan las formas de respuesta del backend (Fases
// 1-9). No son un espejo exacto del schema.prisma completo — solo los
// campos que la interfaz realmente consume en esta fase.

export type Role = { id: number; name: string };

/**
 * Usuario del sistema tal como lo devuelve la gestión de usuarios
 * (Administrador) — distinto de `AuthUser`, que es la sesión actual.
 */
export type SystemUser = {
  id: number;
  fullName: string;
  documentId?: string | null;
  email?: string | null;
  phone?: string | null;
  username: string;
  roleId: number;
  role: { id: number; name: string };
  specialty?: string | null;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
};

export type AuthUser = {
  id: number;
  fullName: string;
  username: string;
  role: string;
};

export type Customer = {
  id: number;
  fullName: string;
  customerType: "PERSON" | "COMPANY";
  documentId?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  notes?: string | null;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  devices?: Device[];
};

export type Device = {
  id: number;
  customerId: number;
  deviceTypeId: number;
  deviceType?: { id: number; name: string };
  brandId?: number | null;
  brand?: { id: number; name: string } | null;
  model?: string | null;
  serialNumber?: string | null;
  boardModel?: string | null;
  cpu?: string | null;
  ram?: string | null;
  disk?: string | null;
  operatingSystem?: string | null;
  notes?: string | null;
  status?: "ACTIVE" | "INACTIVE";
  customer?: { id: number; fullName: string; phone?: string | null };
  repairOrders?: { id: number; orderCode: string; status: RepairStatus; entryDate: string }[];
};

export type Brand = { id: number; name: string };
export type DeviceTypeCatalog = { id: number; name: string };

export const REPAIR_STATUSES = [
  "RECEIVED",
  "DIAGNOSING",
  "QUOTING",
  "AWAITING_APPROVAL",
  "APPROVED",
  "IN_REPAIR",
  "AWAITING_PART",
  "TESTING",
  "REPAIRED",
  "READY_FOR_PICKUP",
  "DELIVERED",
  "NOT_REPAIRED",
  "CANCELLED",
  "WARRANTY",
] as const;

export type RepairStatus = (typeof REPAIR_STATUSES)[number];

export const REPAIR_STATUS_LABELS: Record<RepairStatus, string> = {
  RECEIVED: "Ingresado",
  DIAGNOSING: "En diagnóstico",
  QUOTING: "Cotizando",
  AWAITING_APPROVAL: "Esperando aprobación",
  APPROVED: "Aprobado",
  IN_REPAIR: "En reparación",
  AWAITING_PART: "Esperando repuesto",
  TESTING: "En pruebas",
  REPAIRED: "Reparado",
  READY_FOR_PICKUP: "Listo para entrega",
  DELIVERED: "Entregado",
  NOT_REPAIRED: "No reparado",
  CANCELLED: "Cancelado",
  WARRANTY: "En garantía",
};

export type RepairOrderListItem = {
  id: number;
  orderCode: string;
  status: RepairStatus;
  entryDate: string;
  totalValue: string;
  paidAmount: string;
  customer: { id: number; fullName: string; phone?: string | null };
  device: { id: number; model?: string | null; serialNumber?: string | null };
  technician?: { id: number; fullName: string } | null;
};

export type StatusHistoryEntry = {
  id: number;
  previousStatus: RepairStatus | null;
  newStatus: RepairStatus;
  changedAt: string;
  notes?: string | null;
  user: { id: number; fullName: string };
};

export type DiagnosticMeasurement = {
  id: number;
  pointName: string;
  expectedValue?: string | null;
  measuredValue?: string | null;
  unit?: string | null;
  status?: string | null;
};

export type Diagnostic = {
  id: number;
  boardReference?: string | null;
  chargerIc?: string | null;
  initialSymptom?: string | null;
  componentSuspected?: string | null;
  componentReplaced?: string | null;
  biosReprogrammed: boolean;
  ecReviewed: boolean;
  ecReprogrammed: boolean;
  proceduresPerformed?: string | null;
  result?: string | null;
  createdAt: string;
  technician?: { id: number; fullName: string } | null;
  measurements: DiagnosticMeasurement[];
  photos: Attachment[];
};

export type Attachment = {
  id: number;
  fileUrl: string;
  fileType: string;
  category?: string | null;
  description?: string | null;
  uploadedAt: string;
  uploadedBy: { id: number; fullName: string };
};

export type RepairLogEntry = {
  id: number;
  date: string;
  procedure?: string | null;
  measurement?: string | null;
  component?: string | null;
  reference?: string | null;
  result?: string | null;
  notes?: string | null;
  technician: { id: number; fullName: string };
  photos: Attachment[];
};

export type RepairProcedureEntry = {
  id: number;
  description: string;
  performedAt: string;
};

export type RepairPartEntry = {
  id: number;
  productId: number;
  quantity: number;
  unitCost: string;
  unitPrice: string;
  product: { id: number; sku: string; description: string };
};

export type RepairServiceEntry = {
  id: number;
  serviceId: number;
  price: string;
  service: { id: number; code?: string | null; name: string };
};

export type PaymentEntry = {
  id: number;
  amount: string;
  method: string;
  date: string;
  reference?: string | null;
  user: { id: number; fullName: string };
};

export type QuotationSummary = {
  id: number;
  quotationNumber: string;
  status: string;
  total: string;
};

export type WarrantyStatus = "ACTIVE" | "EXPIRED" | "CLAIMED";

export const WARRANTY_STATUS_LABELS: Record<WarrantyStatus, string> = {
  ACTIVE: "Vigente",
  EXPIRED: "Vencida",
  CLAIMED: "Reclamada",
};

export type Warranty = {
  id: number;
  deliveryDate: string;
  warrantyStartDate: string;
  warrantyEndDate: string;
  coverageDescription: string;
  status: WarrantyStatus;
  claimNotes?: string | null;
  repairOrder?: {
    id: number;
    orderCode: string;
    customerId?: number;
    deviceId?: number;
    customer?: { id: number; fullName: string; phone?: string | null };
  };
  claimingCustomer?: { id: number; fullName: string } | null;
};

export type RepairOrderDetail = {
  id: number;
  orderCode: string;
  status: RepairStatus;
  entryDate: string;
  deliveryDate?: string | null;
  reportedIssue: string;
  entryReason?: string | null;
  physicalCondition?: string | null;
  accessoriesNotes?: string | null;
  chargerReceived: boolean;
  batteryReceived: boolean;
  keyboardReceived: boolean;
  mouseReceived: boolean;
  notes?: string | null;
  totalValue: string;
  paidAmount: string;
  balance: string;
  customer: Customer;
  technician?: { id: number; fullName: string; specialty?: string | null } | null;
  device: Device;
  statusHistory: StatusHistoryEntry[];
  procedures: RepairProcedureEntry[];
  diagnostics: Diagnostic[];
  logs: RepairLogEntry[];
  partsUsed: RepairPartEntry[];
  servicesUsed: RepairServiceEntry[];
  quotations: QuotationSummary[];
  payments: PaymentEntry[];
  photos: Attachment[];
  warranties: Warranty[];
};

export type PartsCostSummary = {
  partsCost: number;
  partsRevenue: number;
  totalCharged: number;
  profit: number;
  marginPct: number;
};

export type Product = {
  id: number;
  sku: string;
  internalCode?: string | null;
  description: string;
  cost: string;
  salePrice: string;
  stock: number;
  minStock: number;
  location?: string | null;
  warrantyMonths?: number | null;
  status?: "ACTIVE" | "INACTIVE";
  categoryId: number;
  category?: { id: number; name: string };
  brandId?: number | null;
  brand?: { id: number; name: string } | null;
  supplierRefs?: {
    id: number;
    supplierRef: string;
    lastCost?: string | null;
    supplier: { id: number; name: string };
  }[];
};

export type ProductCategory = { id: number; name: string };

export type InventoryMovement = {
  id: number;
  type: string;
  quantity: number;
  unitCost?: string | null;
  notes?: string | null;
  createdAt: string;
  user: { id: number; fullName: string };
};

export type Service = {
  id: number;
  code?: string | null;
  name: string;
  description?: string | null;
  basePrice: string;
  estimatedCost?: string | null;
  warrantyMonths?: number | null;
  estimatedTimeHours?: string | null;
  status?: "ACTIVE" | "INACTIVE";
};

export const QUOTATION_STATUSES = [
  "DRAFT",
  "SENT",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
  "CONVERTED",
] as const;
export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

export const QUOTATION_STATUS_LABELS: Record<QuotationStatus, string> = {
  DRAFT: "Borrador",
  SENT: "Enviada",
  PENDING: "En espera",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  EXPIRED: "Vencida",
  CONVERTED: "Convertida",
};

export type QuotationItemType = "PART" | "SERVICE" | "LABOR" | "OTHER";

export type QuotationItem = {
  id: number;
  type: QuotationItemType;
  description: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  product?: { id: number; sku: string; description: string } | null;
  service?: { id: number; code?: string | null; name: string } | null;
};

export type QuotationListItem = {
  id: number;
  quotationNumber: string;
  status: QuotationStatus;
  date: string;
  total: string;
  customer: { id: number; fullName: string };
  sourceOrder?: { id: number; orderCode: string } | null;
};

export type QuotationDetail = {
  id: number;
  quotationNumber: string;
  status: QuotationStatus;
  date: string;
  subtotal: string;
  discount: string;
  tax: string;
  shipping: string;
  total: string;
  validUntil?: string | null;
  notes?: string | null;
  customer: { id: number; fullName: string; phone?: string | null };
  sourceOrder?: { id: number; orderCode: string; status: string } | null;
  items: QuotationItem[];
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  NEQUI: "Nequi",
  BANCOLOMBIA: "Bancolombia",
  TRANSFER: "Transferencia",
  CARD: "Tarjeta",
  OTHER: "Otro",
};

export type PaymentMethod = keyof typeof PAYMENT_METHOD_LABELS;

export type Supplier = {
  id: number;
  name: string;
  contactName?: string | null;
  documentId?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
  paymentAccount?: string | null;
  notes?: string | null;
  status?: "ACTIVE" | "INACTIVE";
  purchases?: { id: number; date: string; total: string; paymentStatus: string }[];
};

export type SaleItem = {
  id: number;
  quantity: number;
  unitPrice: string;
  discount: string;
  subtotal: string;
  product: { id: number; sku: string; description: string };
};

export type Sale = {
  id: number;
  date: string;
  invoiceNumber?: string | null;
  subtotal: string;
  discount: string;
  total: string;
  paymentMethod: string;
  status: string;
  customer?: { id: number; fullName: string } | null;
  seller: { id: number; fullName: string };
  items?: SaleItem[];
};

export type PurchaseItem = {
  id: number;
  quantity: number;
  unitCost: string;
  subtotal: string;
  product: { id: number; sku: string; description: string };
};

export type Purchase = {
  id: number;
  date: string;
  invoiceNumber?: string | null;
  subtotal: string;
  tax: string;
  shipping: string;
  total: string;
  paymentMethod?: string | null;
  paymentStatus: "PENDING" | "PARTIAL" | "PAID";
  supplier: { id: number; name: string };
  items?: PurchaseItem[];
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  PARTIAL: "Parcial",
  PAID: "Pagada",
};

export type CashMovementEntry = {
  id: number;
  type: "INCOME" | "EXPENSE";
  category: string;
  amount: string;
  description?: string | null;
  date: string;
  user: { id: number; fullName: string };
};

export type CashRegister = {
  id: number;
  openedAt: string;
  closedAt?: string | null;
  openingAmount: string;
  closingAmount?: string | null;
  expectedAmount?: string | null;
  difference?: string | null;
  status: "OPEN" | "CLOSED";
  openedBy: { id: number; fullName: string };
  closedBy?: { id: number; fullName: string } | null;
  movements?: CashMovementEntry[];
};

export type DashboardSummary = {
  equiposRecibidosHoy: number;
  equiposPorEstado: Record<string, number>;
  cotizacionesPendientes: number;
  dineroPendienteClientes: number;
  ventasDelDia: number;
  ingresosDelMes: number;
  gastosDelMes: number;
  gananciaEstimada: number;
  repuestosStockBajo: number;
  garantiasPorVencer: number;
  reparacionesPorTecnico: { technician: string; count: number }[];
};

export type MonthlyCount = { month: string; count: number };
export type MonthlyRevenue = { month: string; total: number };
export type BrandCount = { brand: string; count: number };
export type IssueCount = { issue: string; count: number };

// --- Portal de clientes ------------------------------------------------
// Formas de datos deliberadamente reducidas: nada de contraseñas de
// equipo, notas internas, bitácora técnica, diagnósticos ni cotizaciones
// — ver customer-portal.service.ts en el backend para el detalle exacto
// de qué se excluye y por qué.

export type PortalOrderSummary = {
  id: number;
  orderCode: string;
  status: RepairStatus;
  entryDate: string;
  deliveryDate?: string | null;
  totalValue: string;
  paidAmount: string;
  device: {
    model?: string | null;
    brand?: { name: string } | null;
    deviceType?: { name: string } | null;
  };
};

export type PortalQuotationSummary = {
  id: number;
  quotationNumber: string;
  date: string;
  status: QuotationStatus;
  total: string;
  validUntil?: string | null;
  sourceOrder?: { id: number; orderCode: string } | null;
};

export type PortalQuotationDetail = PortalQuotationSummary & {
  subtotal: string;
  discount: string;
  tax: string;
  shipping: string;
  items: { id: number; description: string; quantity: number; unitPrice: string; subtotal: string }[];
};

export type PortalOrderDetail = PortalOrderSummary & {
  reportedIssue: string;
  physicalCondition?: string | null;
  chargerReceived: boolean;
  batteryReceived: boolean;
  keyboardReceived: boolean;
  mouseReceived: boolean;
  device: PortalOrderSummary["device"] & { serialNumber?: string | null };
  photos: { id: number; fileUrl: string; uploadedAt: string; category?: string | null }[];
  diagnostics: {
    id: number;
    createdAt: string;
    initialSymptom?: string | null;
    componentSuspected?: string | null;
    componentReplaced?: string | null;
    result?: string | null;
    technician?: { fullName: string } | null;
    measurements: {
      id: number;
      pointName: string;
      expectedValue?: string | null;
      measuredValue?: string | null;
      unit?: string | null;
      status?: string | null;
    }[];
    photos: { id: number; fileUrl: string; uploadedAt: string }[];
  }[];
  logs: {
    id: number;
    date: string;
    procedure?: string | null;
    measurement?: string | null;
    component?: string | null;
    reference?: string | null;
    result?: string | null;
    notes?: string | null;
    technician?: { fullName: string } | null;
    photos: { id: number; fileUrl: string; uploadedAt: string }[];
  }[];
  payments: { id: number; date: string; amount: string; method: string }[];
  warranties: {
    id: number;
    coverageDescription: string;
    warrantyEndDate: string;
    status: WarrantyStatus;
  }[];
};
