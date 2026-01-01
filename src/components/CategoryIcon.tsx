import { Dumbbell, BookOpen, Palette, Heart, Briefcase, User } from 'lucide-react';
import type { Category } from '@/types';

export const CATEGORIES: Category[] = ['fitness', 'learning', 'creative', 'health', 'work', 'personal'];

interface CategoryIconProps {
  category: Category;
  size?: number;
}

export function CategoryIcon({ category, size = 14 }: CategoryIconProps) {
  const iconProps = { size, strokeWidth: 2 };

  switch (category) {
    case 'fitness':
      return <Dumbbell {...iconProps} />;
    case 'learning':
      return <BookOpen {...iconProps} />;
    case 'creative':
      return <Palette {...iconProps} />;
    case 'health':
      return <Heart {...iconProps} />;
    case 'work':
      return <Briefcase {...iconProps} />;
    case 'personal':
      return <User {...iconProps} />;
    default:
      return null;
  }
}

export function getCategoryLabel(category: Category): string {
  const labels: Record<Category, string> = {
    fitness: 'Fitness',
    learning: 'Learning',
    creative: 'Creative',
    health: 'Health',
    work: 'Work',
    personal: 'Personal',
  };
  return labels[category];
}
