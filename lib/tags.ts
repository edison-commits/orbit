export function parseTags(tagsJson?: string | null): string[] {
  if (!tagsJson) return [];
  try {
    const parsed = JSON.parse(tagsJson);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    return parsed
      .map((tag) => String(tag).trim())
      .filter(Boolean)
      .filter((tag) => {
        const key = tag.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  } catch {
    return [];
  }
}

export function normalizeTagInput(input: string): string[] {
  const seen = new Set<string>();
  return input
    .split(/[,#\n]/)
    .map((tag) => tag.trim().replace(/^#+/, ''))
    .filter(Boolean)
    .map((tag) => tag.toLowerCase())
    .filter((tag) => {
      if (seen.has(tag)) return false;
      seen.add(tag);
      return true;
    });
}

export function tagsToInput(tagsJson?: string | null): string {
  return parseTags(tagsJson).join(', ');
}

export function tagsToJson(input: string): string | null {
  const tags = normalizeTagInput(input);
  return tags.length > 0 ? JSON.stringify(tags) : null;
}
