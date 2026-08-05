import type { Category } from '../types';

/**
 * Default categories are a fixed, known set (no custom-category UI exists yet),
 * so their names can be safely translated by id. Falls back to the stored name
 * for any future custom category that has no translation entry.
 */
export function categoryDisplayName(category: Category, t: (key: string) => string): string {
  const key = `category.${category.id}`;
  const translated = t(key);
  return translated === key ? category.name : translated;
}
