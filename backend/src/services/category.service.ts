import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';

export const DEFAULT_CATEGORIES = [
  { slug: 'faculdade', name: 'Faculdade', color: '#6366F1' },
  { slug: 'estagio', name: 'Estágio', color: '#0EA5E9' },
  { slug: 'trabalho', name: 'Trabalho', color: '#F97316' },
  { slug: 'estudos', name: 'Estudos', color: '#10B981' },
  { slug: 'pessoal', name: 'Pessoal', color: '#EC4899' },
  { slug: 'outros', name: 'Outros', color: '#64748B' },
] as const;

/** Categorias consideradas "estudo" e "trabalho" nos indicadores. */
export const STUDY_SLUGS = ['faculdade', 'estudos'];
export const WORK_SLUGS = ['estagio', 'trabalho'];

export const categoryService = {
  async ensureDefaults() {
    for (const category of DEFAULT_CATEGORIES) {
      await prisma.category.upsert({
        where: { slug: category.slug },
        update: { name: category.name, color: category.color },
        create: category,
      });
    }
  },

  list() {
    return prisma.category.findMany({ orderBy: { createdAt: 'asc' } });
  },

  async assertExists(categoryId: string) {
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) throw new AppError('Categoria inválida.', 422);
    return category;
  },
};
