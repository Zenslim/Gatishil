import "server-only";

const prefix = "[i18n-missing]";
const seen = new Set<string>();

type LogParams = {
  collection: string;
  slug: string;
  field: string;
};

export function logMissingTranslation({ collection, slug, field }: LogParams) {
  const key = `${collection}:${slug}:${field}`;
  if (seen.has(key)) return;
  seen.add(key);
  console.warn(`${prefix} ${collection}.${slug}.${field}`);
}
