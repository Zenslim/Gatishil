"use client";
import { supabase } from "./supabaseClient";

// Insert post with authenticated JWT
export async function sealAndPublish(payload: {
  title: string; slug: string; excerpt: string; content_mdx: string; tags: string[];
}) {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session) {
      alert("Please sign in first.");
      return false;
    }

    const { error } = await supabase.from("posts").insert({
      title: payload.title,
      slug: payload.slug,
      excerpt: payload.excerpt,
      content_mdx: payload.content_mdx,
      tags: payload.tags,
      status: "published",
    });

    if (error) {
      console.error("Publish error:", error);
      alert("Publish failed. Check console for details.");
      return false;
    }
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

// Insert comment with authenticated JWT
export async function sealAndComment(payload: { post_id: string; text: string }) {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session) {
      alert("Please sign in first.");
      return false;
    }

    const { error } = await supabase.from("comments").insert({
      post_id: payload.post_id,
      text: payload.text,
      trust_signature: "demo-signature",
    });

    if (error) {
      console.error("Comment error:", error);
      alert("Comment failed. Check console for details.");
      return false;
    }
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}
