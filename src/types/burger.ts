export type ProductType = 'burger' | 'drink' | 'side';

export interface Burger {
  id: string;
  name: string;
  shortDescription: string;
  ingredients: string[];
  price: number;
  image: string | null;
  detailDescription: string;
  type: ProductType;
}
