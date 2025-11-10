import remarkGfm from "remark-gfm";
import { MDXRemote } from "next-mdx-remote/rsc";

const mdxComponents = {};

export function MDXContent({ source }: { source: string }) {
  if (!source) {
    return null;
  }
  return (
    <MDXRemote
      source={source}
      components={mdxComponents}
      options={{
        mdxOptions: {
          remarkPlugins: [remarkGfm],
        },
      }}
    />
  );
}
