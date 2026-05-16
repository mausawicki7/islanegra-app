import { supabase } from './supabaseClient';
import type {
  ProductIngredient,
  SpecificExtra,
  UniversalExtra,
} from '@/types/customization';

interface UniversalExtraRow {
  id: string;
  name: string;
  emoji: string | null;
  price: number | string;
  selection_type: 'counter' | 'toggle';
  max_quantity: number;
  display_order: number;
  active: boolean;
}

interface SpecificExtraRow {
  id: string;
  product_id: string;
  name: string;
  emoji: string | null;
  price: number | string;
  display_order: number;
  active: boolean;
}

interface ProductIngredientRow {
  id: string;
  product_id: string;
  name: string;
  emoji: string | null;
  removable: boolean;
  display_order: number;
}

export async function fetchUniversalExtras(): Promise<UniversalExtra[]> {
  const { data, error } = await supabase
    .from('universal_extras')
    .select('id, name, emoji, price, selection_type, max_quantity, display_order, active')
    .eq('active', true)
    .order('display_order', { ascending: true });

  if (error) throw new Error(error.message);
  return ((data ?? []) as UniversalExtraRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    price: Number(row.price),
    selectionType: row.selection_type,
    maxQuantity: row.max_quantity,
    displayOrder: row.display_order,
  }));
}

export async function fetchSpecificExtras(productId: string): Promise<SpecificExtra[]> {
  const { data, error } = await supabase
    .from('product_specific_extras')
    .select('id, product_id, name, emoji, price, display_order, active')
    .eq('product_id', productId)
    .eq('active', true)
    .order('display_order', { ascending: true });

  if (error) throw new Error(error.message);
  return ((data ?? []) as SpecificExtraRow[]).map((row) => ({
    id: row.id,
    productId: row.product_id,
    name: row.name,
    emoji: row.emoji,
    price: Number(row.price),
    displayOrder: row.display_order,
  }));
}

export async function fetchProductIngredients(productId: string): Promise<ProductIngredient[]> {
  const { data, error } = await supabase
    .from('product_ingredients')
    .select('id, product_id, name, emoji, removable, display_order')
    .eq('product_id', productId)
    .order('display_order', { ascending: true });

  if (error) throw new Error(error.message);
  return ((data ?? []) as ProductIngredientRow[]).map((row) => ({
    id: row.id,
    productId: row.product_id,
    name: row.name,
    emoji: row.emoji,
    removable: row.removable,
    displayOrder: row.display_order,
  }));
}

export interface BurgerCustomizationData {
  universalExtras: UniversalExtra[];
  specificExtras: SpecificExtra[];
  ingredients: ProductIngredient[];
}

export async function fetchBurgerCustomization(
  productId: string,
): Promise<BurgerCustomizationData> {
  const [universalExtras, specificExtras, ingredients] = await Promise.all([
    fetchUniversalExtras(),
    fetchSpecificExtras(productId),
    fetchProductIngredients(productId),
  ]);
  return { universalExtras, specificExtras, ingredients };
}
