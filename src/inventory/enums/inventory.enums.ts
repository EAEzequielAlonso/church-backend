export enum InventoryItemCategory {
  FURNITURE = 'FURNITURE', // Mobiliario
  SOUND = 'SOUND', // Sonido
  INSTRUMENTS = 'INSTRUMENTS', // Instrumentos
  TECHNOLOGY = 'TECHNOLOGY', // Tecnología/IT
  LIGHTING = 'LIGHTING', // Iluminación
  KITCHEN = 'KITCHEN', // Cocina
  STATIONERY = 'STATIONERY', // Papelería
  DECORATION = 'DECORATION', // Decoración
  OTHER = 'OTHER',
}

export enum InventoryMovementType {
  IN = 'IN',
  OUT = 'OUT',
}

export enum InventoryInReason {
  PURCHASE = 'PURCHASE', // Compra
  DONATION = 'DONATION', // Donación
  TRANSFER = 'TRANSFER', // Traslado (entrada)
  ADJUSTMENT = 'ADJUSTMENT', // Ajuste (inventario inicial o corrección)
  RETURN = 'RETURN', // Devolución (prestado y devuelto)
}

export enum InventoryOutReason {
  BROKEN = 'BROKEN', // Roto/Dañado
  LOST = 'LOST', // Perdido/Robado
  DISCARDED = 'DISCARDED', // Descartado/Obsoleto
  TRANSFER = 'TRANSFER', // Traslado (salida)
  ADJUSTMENT = 'ADJUSTMENT', // Ajuste de corrección
  LOAN = 'LOAN', // Préstamo
}
