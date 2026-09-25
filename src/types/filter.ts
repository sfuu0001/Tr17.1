import { DishItem } from '../types';

export interface CategoryTreeNode {
  id: string;
  name: string;
  enName: string;
  count: number;
  subcategories: {
    id: string;
    name: string;
    dishes: DishItem[];
  }[];
}

export interface DishRankingItem {
  id: string;
  dishId: string;
  rank: number;
  dish: DishItem;
  hotScore: number;
  tag: string;
}

export interface FilterOptions {
  priceRange: 'all' | '0-30' | '30-60' | '60+';
  orderType: 'all' | 'delivery' | 'dine_in';
  onlyAvailable: boolean;
  hasDiscount: boolean;
  isChefSpecial: boolean;
}

export const INITIAL_FILTER_OPTIONS: FilterOptions = {
  priceRange: 'all',
  orderType: 'all',
  onlyAvailable: false,
  hasDiscount: false,
  isChefSpecial: false,
};
