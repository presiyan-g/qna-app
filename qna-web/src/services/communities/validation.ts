import { CommunityValidationError } from './errors';

export type CreateCommunityInput = {
  name: string;
  slug: string;
  description: string;
  emoji: string;
  cadence: 'daily' | 'weekly' | 'custom';
  categoryId: string | null;
};

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CADENCES = new Set(['daily', 'weekly', 'custom']);
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateCreateCommunityInput(raw: {
  name?: unknown;
  description?: unknown;
  emoji?: unknown;
  cadence?: unknown;
  categoryId?: unknown;
}): CreateCommunityInput {
  const fieldErrors: Record<string, string> = {};
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  const description =
    typeof raw.description === 'string' ? raw.description.trim() : '';
  const emoji = typeof raw.emoji === 'string' ? raw.emoji.trim() : '';
  const cadence = typeof raw.cadence === 'string' ? raw.cadence : 'daily';
  const categoryIdRaw =
    typeof raw.categoryId === 'string' ? raw.categoryId.trim() : '';
  const slug = slugify(name);

  if (!name) fieldErrors.name = 'Community name is required.';
  else if (name.length < 3) fieldErrors.name = 'Use at least 3 characters.';
  else if (name.length > 80) fieldErrors.name = 'Use 80 characters or fewer.';

  if (!slug || !SLUG_RE.test(slug)) {
    fieldErrors.name = 'Use a name with letters or numbers.';
  }

  if (description.length > 280) {
    fieldErrors.description = 'Use 280 characters or fewer.';
  }

  if (emoji.length > 12) {
    fieldErrors.emoji = 'Use a short emoji or icon.';
  }

  if (!CADENCES.has(cadence)) {
    fieldErrors.cadence = 'Choose a valid cadence.';
  }

  let categoryId: string | null = null;
  if (categoryIdRaw) {
    if (!UUID_RE.test(categoryIdRaw)) {
      fieldErrors.categoryId = 'Choose a valid category.';
    } else {
      categoryId = categoryIdRaw;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new CommunityValidationError(fieldErrors);
  }

  return {
    name,
    slug,
    description,
    emoji,
    cadence: cadence as CreateCommunityInput['cadence'],
    categoryId,
  };
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}
