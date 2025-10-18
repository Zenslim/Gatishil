// lib/blogApi.ts
// Minimal blog API shims to satisfy editor import paths. Replace with real implementation later.
export type BlogPost = {
  id?: string;
  title: string;
  body: string;
  created_at?: string;
  updated_at?: string;
};

export async function listDrafts(): Promise<BlogPost[]> {
  return [];
}

export async function getPost(id: string): Promise<BlogPost | null> {
  return null;
}

export async function savePost(post: BlogPost): Promise<{ ok: boolean; id?: string }> {
  return { ok: true, id: post.id ?? 'draft' };
}

export async function publishPost(id: string): Promise<{ ok: boolean }> {
  return { ok: true };
}
