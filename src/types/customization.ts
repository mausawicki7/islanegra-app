export type ExtraSelectionType = 'counter' | 'toggle';

export interface UniversalExtra {
  id: string;
  name: string;
  emoji: string | null;
  price: number;
  selectionType: ExtraSelectionType;
  maxQuantity: number;
  displayOrder: number;
}

export interface SpecificExtra {
  id: string;
  productId: string;
  name: string;
  emoji: string | null;
  price: number;
  displayOrder: number;
}

export interface ProductIngredient {
  id: string;
  productId: string;
  name: string;
  emoji: string | null;
  removable: boolean;
  displayOrder: number;
}

/** Snapshot persistido en order_items.universal_extras (jsonb). */
export interface UniversalExtraSnapshot {
  extra_id: string;
  name: string;
  emoji: string | null;
  qty: number;
  unit_price: number;
}

/** Snapshot persistido en order_items.specific_extras (jsonb). */
export interface SpecificExtraSnapshot {
  extra_id: string;
  name: string;
  emoji: string | null;
  unit_price: number;
}

/** Selección actual del cliente en pantalla. El precio NO viaja al backend. */
export interface ItemCustomization {
  /** map extraId → qty seleccionada (0 = no elegida). */
  universalExtras: Record<string, number>;
  /** set de extras específicos elegidos. */
  specificExtras: Set<string>;
  /** set de ingredient_ids que el cliente quiere remover. */
  removedIngredients: Set<string>;
  /** nota libre del ítem (no del pedido). */
  note: string;
}
