"use client";

// Minimal client-side helpers. Replace 'seal' step with real WebAuthn later.
export async function sealAndPublish(payload: {
  title: string; slug: string; excerpt: string; content_mdx: string; tags: string[];
}) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    if (!url || !key) {
      console.warn("Missing Supabase env; simulating publish OK.");
      return true;
    }
    const res = await fetch(`${url}/rest/v1/posts`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify({
        title: payload.title,
        slug: payload.slug,
        excerpt: payload.excerpt,
        content_mdx: payload.content_mdx,
        tags: payload.tags,
        status: "published",
      }),
    });
    if (!res.ok) {
      console.error("Publish error:", await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export async function sealAndComment(payload: { post_id: string; text: string; }) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    if (!url || !key) {
      console.warn("Missing Supabase env; simulating comment OK.");
      return true;
    }
    const res = await fetch(`${url}/rest/v1/comments`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify({
        post_id: payload.post_id,
        text: payload.text,
        trust_signature: "demo-signature",
      }),
    });
    if (!res.ok) {
      console.error("Comment error:", await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}
