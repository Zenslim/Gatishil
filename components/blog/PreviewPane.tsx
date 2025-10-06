"use client";

import { MarkdownRenderer } from "@/lib/mdxRenderer";

export default function PreviewPane({ content }: { content: string }) {
  return (
    <div className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 min-h-[420px]">
      <div className="prose prose-invert max-w-none">
        <MarkdownRenderer content={content || "_Preview will appear here…_"} />
      </div>
    </div>
  );
}
