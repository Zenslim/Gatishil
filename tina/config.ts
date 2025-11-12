import { defineConfig } from 'tinacms';

const branch =
  process.env.VERCEL_GIT_COMMIT_REF ||
  process.env.NEXT_PUBLIC_VERCEL_BRANCH ||
  process.env.HEAD ||
  'main';

const tinaApiUrl =
  process.env.NEXT_PUBLIC_TINA_API_URL ||
  'https://edit.gatishilnepal.org/tina/graphql';

const repository =
  process.env.GITHUB_REPOSITORY ||
  process.env.NEXT_PUBLIC_GITHUB_REPOSITORY ||
  'gatishil/GatishilNepal';

export default defineConfig({
  branch,
  clientId: '',
  token: '',
  apiURL: tinaApiUrl,
  storage: {
    manager: {
      github: {
        repo: repository,
        branch,
      },
    },
    media: {
      r2: {
        bucket: process.env.R2_BUCKET || 'tina-content',
        accountId: process.env.R2_ACCOUNT_ID || '',
      },
    },
  },
  media: {
    tina: {
      publicFolder: 'public',
      mediaRoot: 'uploads',
    },
  },
  schema: {
    collections: [
      {
        name: 'blog',
        label: 'Blog Posts',
        path: 'content/blog',
        format: 'mdx',
        ui: {
          allowedActions: {
            create: true,
            delete: true,
          },
        },
        fields: [
          {
            type: 'string',
            name: 'title',
            label: 'Title',
            required: true,
          },
          {
            type: 'string',
            name: 'title_en',
            label: 'Title (English)',
          },
          {
            type: 'string',
            name: 'title_np',
            label: 'Title (Nepali)',
          },
          {
            type: 'string',
            name: 'slug',
            label: 'Slug',
            required: true,
            ui: {
              description: 'Used for the blog URL.',
            },
          },
          {
            type: 'string',
            name: 'author',
            label: 'Author',
          },
          {
            type: 'datetime',
            name: 'published_at',
            label: 'Published At',
            ui: {
              timeFormat: 'HH:mm',
            },
          },
          {
            type: 'rich-text',
            name: 'body',
            label: 'Body',
            isBody: true,
          },
          {
            type: 'rich-text',
            name: 'body_en',
            label: 'Body (English)',
          },
          {
            type: 'rich-text',
            name: 'body_np',
            label: 'Body (Nepali)',
          },
        ],
      },
    ],
  },
});
