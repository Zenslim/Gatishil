import { defineConfig } from "tinacms";

const branch =
  process.env.TINA_BRANCH ??
  process.env.VERCEL_GIT_COMMIT_REF ??
  process.env.GITHUB_REF_NAME ??
  "main";

export default defineConfig({
  branch,
  client: {
    referenceDepth: 3,
    tinaGraphqlUrlOverride: process.env.NEXT_PUBLIC_TINA_API_URL,
  },
  media: {
    tina: {
      publicFolder: "public",
      mediaRoot: "uploads",
    },
  },
  build: {
    publicFolder: "public",
    outputFolder: "admin",
  },
  schema: {
    collections: [
      {
        name: "posts",
        label: "Posts",
        path: "content/posts",
        format: "mdx",
        ui: {
          router: ({ document }) =>
            document?.slug ? `/blog/${document.slug}` : undefined,
        },
        fields: [
          {
            type: "string",
            name: "title",
            label: "Title",
            required: true,
          },
          {
            type: "string",
            name: "title_np",
            label: "Title (Nepali)",
          },
          {
            type: "string",
            name: "slug",
            label: "Slug",
            required: true,
          },
          {
            type: "datetime",
            name: "date",
            label: "Publish Date",
            ui: {
              dateFormat: "MMM DD, YYYY",
            },
            required: true,
          },
          {
            type: "image",
            name: "cover",
            label: "Cover Image",
          },
          {
            type: "string",
            name: "author",
            label: "Author",
          },
          {
            type: "string",
            name: "tags",
            label: "Tags",
            list: true,
          },
          {
            type: "string",
            name: "excerpt",
            label: "Excerpt",
            ui: {
              component: "textarea",
            },
          },
          {
            type: "rich-text",
            name: "body",
            label: "Body",
            isBody: true,
          },
          {
            type: "rich-text",
            name: "body_np",
            label: "Body (Nepali)",
          },
        ],
      },
      {
        name: "pages",
        label: "Pages",
        path: "content/pages",
        format: "mdx",
        ui: {
          router: ({ document }) =>
            document?.slug ? `/pages/${document.slug}` : undefined,
        },
        fields: [
          {
            type: "string",
            name: "title",
            label: "Title",
            required: true,
          },
          {
            type: "string",
            name: "title_np",
            label: "Title (Nepali)",
          },
          {
            type: "string",
            name: "slug",
            label: "Slug",
            required: true,
          },
          {
            type: "datetime",
            name: "date",
            label: "Updated",
          },
          {
            type: "image",
            name: "cover",
            label: "Cover Image",
          },
          {
            type: "rich-text",
            name: "body",
            label: "Body",
            isBody: true,
          },
          {
            type: "rich-text",
            name: "body_np",
            label: "Body (Nepali)",
          },
        ],
      },
    ],
  },
});
