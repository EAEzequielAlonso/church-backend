export enum InventoryItemCategory {
  FURNITURE = 'FURNITURE',       // Mobiliario
  SOUND = 'SOUND',               // Sonido
  INSTRUMENTS = 'INSTRUMENTS',   // Instrumentos
  TECHNOLOGY = 'TECHNOLOGY',     // Tecnología/IT
  LIGHTING = 'LIGHTING',         // Iluminación
  KITCHEN = 'KITCHEN',           // Cocina
  STATIONERY = 'STATIONERY',     // Papelería
  DECORATION = 'DECORATION',     // Decoración
  OTHER = 'OTHER',
}

export enum InventoryMovementType {
  IN = 'IN',
  OUT = 'OUT',
}

/**
 * Unified reason enum. Valid for both IN and OUT movements.
 * IN  → PURCHASE | DONATION | TRANSFER | ADJUSTMENT
 * OUT → BROKEN | LOST | TRANSFER | ADJUSTMENT
 */
export enum InventoryReason {
  PURCHASE = 'PURCHASE',    // Compra (IN)
  DONATION = 'DONATION',    // Donación (IN)
  TRANSFER = 'TRANSFER',    // Traslado (IN/OUT)
  BROKEN = 'BROKEN',      // Roto/Dañado (OUT)
  LOST = 'LOST',        // Perdido/Robado (OUT)
  ADJUSTMENT = 'ADJUSTMENT',  // Ajuste / Inventario inicial (IN/OUT)
}
