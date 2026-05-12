import { supabase } from './supabaseClient';
import type { Order, OrderInput } from '@/types/order';

function generateOrderNumber(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${yy}${mm}${dd}-${rand}`;
}

function computeSubtotal(items: OrderInput['items']): number {
  return items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
}

export async function createOrder(input: OrderInput): Promise<Order> {
  const subtotal = computeSubtotal(input.items);
  const total = subtotal;
  const orderNumber = generateOrderNumber();

  const { data: orderRow, error: orderErr } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      table_number: input.tableNumber,
      subtotal,
      total,
      payment_method: input.paymentMethod,
      note: input.note,
      status: 'new',
    })
    .select()
    .single();

  if (orderErr || !orderRow) {
    throw new Error(orderErr?.message ?? 'No se pudo crear el pedido');
  }

  const itemRows = input.items.map((it) => ({
    order_id: orderRow.id,
    product_id: it.productId,
    product_name: it.productName,
    product_type: it.productType,
    quantity: it.quantity,
    unit_price: it.unitPrice,
    subtotal: it.unitPrice * it.quantity,
  }));

  const { data: insertedItems, error: itemsErr } = await supabase
    .from('order_items')
    .insert(itemRows)
    .select();

  if (itemsErr) {
    throw new Error(itemsErr.message);
  }

  return {
    id: orderRow.id,
    orderNumber: orderRow.order_number,
    tableNumber: orderRow.table_number,
    subtotal: Number(orderRow.subtotal),
    total: Number(orderRow.total),
    paymentMethod: orderRow.payment_method,
    note: orderRow.note,
    status: orderRow.status,
    createdAt: orderRow.created_at,
    items: (insertedItems ?? []).map((row) => ({
      id: row.id,
      orderId: row.order_id,
      productId: row.product_id,
      productName: row.product_name,
      productType: row.product_type,
      quantity: row.quantity,
      unitPrice: Number(row.unit_price),
      subtotal: Number(row.subtotal),
    })),
  };
}
