import type {
  OrderItem,
  OrderItemRemovedIngredient,
  OrderItemSpecificExtra,
  OrderItemUniversalExtra,
} from '@/types/order';

export interface OrderItemRowLike {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_type: 'burger' | 'drink' | 'side';
  quantity: number;
  unit_price: number | string;
  subtotal: number | string;
  universal_extras?: unknown;
  specific_extras?: unknown;
  removed_ingredients?: unknown;
  item_note?: string | null;
  extras_total?: number | string | null;
  item_total?: number | string | null;
}

export function mapOrderItemRow(it: OrderItemRowLike): OrderItem {
  return {
    id: it.id,
    orderId: it.order_id,
    productId: it.product_id,
    productName: it.product_name,
    productType: it.product_type,
    quantity: it.quantity,
    unitPrice: Number(it.unit_price),
    subtotal: Number(it.subtotal),
    universalExtras: Array.isArray(it.universal_extras)
      ? (it.universal_extras as OrderItemUniversalExtra[])
      : [],
    specificExtras: Array.isArray(it.specific_extras)
      ? (it.specific_extras as OrderItemSpecificExtra[])
      : [],
    removedIngredients: Array.isArray(it.removed_ingredients)
      ? (it.removed_ingredients as OrderItemRemovedIngredient[])
      : [],
    itemNote: it.item_note ?? null,
    extrasTotal: it.extras_total != null ? Number(it.extras_total) : 0,
    itemTotal: it.item_total != null ? Number(it.item_total) : Number(it.subtotal),
  };
}
