import { defineConfig } from 'tinacms';

export default defineConfig({
  clientId: process.env.TINA_PUBLIC_CLIENT_ID || '',
  token: process.env.TINA_TOKEN || '',
  // Local mode works without Tina Cloud; keep build minimal
  build: {
    outputFolder: 'admin',
    publicFolder: 'public',
  },
  media: {
    tina: {
      mediaRoot: 'uploads',
      publicFolder: 'public',
    },
  },
  schema: {
    collections: [
      {
        name: 'pages',
        label: 'Pages',
        path: 'content/pages',
        format: 'json',
        ui: { allowedActions: { create: true, delete: false } },
        fields: [
          { type: 'string', name: 'slug', label: 'Slug', isTitle: true, required: true },
          { type: 'string', name: 'title_en', label: 'Title (EN)' },
          { type: 'string', name: 'title_np', label: 'Title (NP)' },
          { type: 'rich-text', name: 'body_en', label: 'Body (EN)' },
          // Blocks field with TEMPLATES AS ARRAY (fixes TinaSchemaValidationError)
          {
            type: 'object',
            name: 'blocks',
            label: 'Blocks',
            list: true,
            ui: { visualSelector: true },
            templates: [
              {
                name: 'hero',
                label: 'Hero',
                fields: [
                  { type: 'string', name: 'eyebrow_en', label: 'Eyebrow (EN)' },
                  { type: 'string', name: 'eyebrow_np', label: 'Eyebrow (NP)' },
                  { type: 'string', name: 'heading_en', label: 'Heading (EN)' },
                  { type: 'string', name: 'heading_np', label: 'Heading (NP)' },
                  { type: 'rich-text', name: 'sub_en', label: 'Subcopy (EN)' },
                  { type: 'rich-text', name: 'sub_np', label: 'Subcopy (NP)' },
                ],
              },
              {
                name: 'manifestoGrid',
                label: 'Manifesto Grid',
                fields: [
                  {
                    type: 'object',
                    name: 'items',
                    label: 'Items',
                    list: true,
                    fields: [
                      { type: 'string', name: 'title_en', label: 'Title (EN)' },
                      { type: 'string', name: 'title_np', label: 'Title (NP)' },
                      { type: 'rich-text', name: 'body_en', label: 'Body (EN)' },
                      { type: 'rich-text', name: 'body_np', label: 'Body (NP)' },
                    ],
                  },
                ],
              },
              {
                name: 'foundations',
                label: 'Foundations',
                fields: [
                  { type: 'string', name: 'heading_en', label: 'Heading (EN)' },
                  { type: 'string', name: 'heading_np', label: 'Heading (NP)' },
                  {
                    type: 'object',
                    name: 'pillars',
                    label: 'Pillars',
                    list: true,
                    fields: [
                      { type: 'string', name: 'title_en', label: 'Title (EN)' },
                      { type: 'string', name: 'title_np', label: 'Title (NP)' },
                      { type: 'rich-text', name: 'body_en', label: 'Body (EN)' },
                      { type: 'rich-text', name: 'body_np', label: 'Body (NP)' },
                    ],
                  },
                ],
              },
              {
                name: 'footer',
                label: 'Footer',
                fields: [
                  { type: 'string', name: 'cta_en', label: 'CTA (EN)' },
                  { type: 'string', name: 'cta_np', label: 'CTA (NP)' },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
});
