import { useEffect, useState } from 'react';
import { userApi } from '../services/endpoints';
import type { Category } from '../types';

let cache: Category[] | null = null;
let pending: Promise<Category[]> | null = null;

/** Categorias padrão do sistema (carregadas uma única vez). */
export function useCategories() {
  const [categories, setCategories] = useState<Category[]>(cache ?? []);

  useEffect(() => {
    if (cache) return;
    pending ??= userApi.categories();
    pending
      .then((list) => {
        cache = list;
        setCategories(list);
      })
      .catch(() => {
        pending = null;
      });
  }, []);

  return categories;
}
