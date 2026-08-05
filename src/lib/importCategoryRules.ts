import type { Category } from '../types';

interface CategoryRule {
  categoryId: string;
  keywords: string[];
}

/** Curated merchant/description keyword rules, ordered by specificity (brand names before generic words). */
export const IMPORT_CATEGORY_RULES: CategoryRule[] = [
  {
    categoryId: 'cat-groceries',
    keywords: ['migros', 'carrefour', 'a101', 'bim', 'şok', 'sok market', 'market'],
  },
  {
    categoryId: 'cat-dining',
    keywords: [
      'starbucks',
      'yemeksepeti',
      'getir yemek',
      'restaurant',
      'restoran',
      'cafe',
      'kahve',
      'burger',
      'pizza',
    ],
  },
  {
    categoryId: 'cat-transport',
    keywords: [
      'shell',
      'opet',
      'petrol ofisi',
      'total ',
      'uber',
      'bitaksi',
      'iett',
      'metro istanbul',
      'otopark',
      'taxi',
      'taksi',
    ],
  },
  {
    categoryId: 'cat-entertainment',
    keywords: ['netflix', 'spotify', 'sinema', 'cinema', 'playstation', 'steam', 'youtube premium'],
  },
  {
    categoryId: 'cat-utilities',
    keywords: ['türk telekom', 'turkcell', 'vodafone', 'elektrik', 'doğalgaz', 'internet fatura'],
  },
  {
    categoryId: 'cat-shopping',
    keywords: ['trendyol', 'hepsiburada', 'amazon', 'zara', 'h&m', 'lc waikiki'],
  },
  {
    categoryId: 'cat-health',
    keywords: ['eczane', 'pharmacy', 'hastane', 'hospital', 'optik'],
  },
  {
    categoryId: 'cat-housing',
    keywords: ['kira', 'aidat', 'rent'],
  },
  {
    categoryId: 'cat-salary',
    keywords: ['maaş', 'salary'],
  },
];

/** Case-insensitive substring match against curated rules, first match wins. Returns null if nothing matches. */
export function suggestCategoryId(description: string, categories: Category[]): string | null {
  const text = description.toLowerCase();
  const existingIds = new Set(categories.map((c) => c.id));
  for (const rule of IMPORT_CATEGORY_RULES) {
    if (!existingIds.has(rule.categoryId)) continue;
    if (rule.keywords.some((kw) => text.includes(kw))) return rule.categoryId;
  }
  return null;
}
