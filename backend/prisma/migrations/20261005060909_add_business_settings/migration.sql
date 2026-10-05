-- CreateTable
CREATE TABLE "business_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "businessName" TEXT NOT NULL DEFAULT 'CompuFix Soluciones Integrales',
    "shortName" TEXT NOT NULL DEFAULT 'CompuFix',
    "tagline" TEXT NOT NULL DEFAULT 'Taller de reparación de computadores',
    "locationTag" TEXT NOT NULL DEFAULT 'Cartagena, Bolívar',
    "footerLocation" TEXT NOT NULL DEFAULT 'Cartagena, Colombia',
    "footerTagline" TEXT NOT NULL DEFAULT 'Diagnóstico · Reparación · Repuestos',
    "phoneDisplay" TEXT DEFAULT '301 395 1619',
    "phoneDial" TEXT DEFAULT '+573013951619',
    "whatsappNumber" TEXT DEFAULT '573013951619',
    "whatsappMessage" TEXT NOT NULL DEFAULT 'Hola, quiero una cotización para mi equipo',
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "addressCity" TEXT,
    "mapsUrlOverride" TEXT,
    "facebookUrl" TEXT,
    "instagramUrl" TEXT,
    "youtubeUrl" TEXT,
    "logoUrl" TEXT,
    "accentColor" TEXT NOT NULL DEFAULT '#c2884d',
    "accentStrongColor" TEXT NOT NULL DEFAULT '#e3a868',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_settings_pkey" PRIMARY KEY ("id")
);
