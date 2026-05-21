import type { CommunityRole } from './api';

export function formatCommunityCadence(value: string) {
  return toTitleCase(value);
}

export function formatCommunityRole(value: CommunityRole | null) {
  return value ? toTitleCase(value) : 'Not joined';
}

function toTitleCase(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}
