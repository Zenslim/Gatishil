import { defineConfig } from "tinacms";

type LocalizedStringField = {
  name: string;
  label: string;
};

const localizedString = ({ name, label }: LocalizedStringField) => ({
  type: "string" as const,
  name,
  label,
});

const localizedRichText = ({ name, label }: LocalizedStringField) => ({
  type: "rich-text" as const,
  name,
  label,
});

const isLocal = process.env.TINA_PUBLIC_IS_LOCAL === "true";
const branch =
  process.env.TINA_BRANCH ||
  process.env.VERCEL_GIT_COMMIT_REF ||
  process.env.HEAD ||
  "main";

export default defineConfig({
  branch,
  clientId: isLocal ? undefined : process.env.TINA_PUBLIC_CLIENT_ID,
  token: isLocal ? undefined : process.env.TINA_TOKEN,
  build: {
    outputFolder: "admin",
    publicFolder: "public",
  },
  media: {
    tina: {
      mediaRoot: "uploads",
      publicFolder: "public",
    },
  },
  schema: {
    collections: [
      {
        name: "pages",
        label: "Pages",
        path: "content/pages",
        format: "json",
        ui: {
          router: ({ document }) => {
            if (document._sys.filename === "home") {
              return "/";
            }
            return `/${document._sys.filename}`;
          },
        },
        fields: [
          localizedString({ name: "title_en", label: "Title (English)" }),
          localizedString({ name: "title_np", label: "Title (Nepali)" }),
          localizedRichText({ name: "body_en", label: "Body (English)" }),
          localizedRichText({ name: "body_np", label: "Body (Nepali)" }),
          {
            type: "object",
            name: "blocks",
            label: "Blocks",
            list: true,
            ui: {
              itemProps: (item) => {
                const templateLabel =
                  item?._template === "hero"
                    ? "Hero"
                    : item?._template === "manifesto"
                      ? "Manifesto"
                      : item?._template === "foundations"
                        ? "Foundations"
                        : item?._template === "footer"
                          ? "Footer"
                          : "Block";
                return {
                  label: templateLabel,
                };
              },
            },
            templates: {
              hero: {
                label: "Hero",
                fields: [
                  localizedString({ name: "badge_en", label: "Badge (English)" }),
                  localizedString({ name: "badge_np", label: "Badge (Nepali)" }),
                  localizedString({
                    name: "headline_prefix_en",
                    label: "Headline Prefix (English)",
                  }),
                  localizedString({
                    name: "headline_prefix_np",
                    label: "Headline Prefix (Nepali)",
                  }),
                  localizedString({
                    name: "headline_suffix_en",
                    label: "Headline Suffix (English)",
                  }),
                  localizedString({
                    name: "headline_suffix_np",
                    label: "Headline Suffix (Nepali)",
                  }),
                  localizedString({ name: "tagline_en", label: "Tagline (English)" }),
                  localizedString({ name: "tagline_np", label: "Tagline (Nepali)" }),
                  localizedRichText({
                    name: "description_en",
                    label: "Description (English)",
                  }),
                  localizedRichText({
                    name: "description_np",
                    label: "Description (Nepali)",
                  }),
                  {
                    type: "object",
                    name: "primary_cta",
                    label: "Primary CTA",
                    fields: [
                      localizedString({
                        name: "label_en",
                        label: "Label (English)",
                      }),
                      localizedString({
                        name: "label_np",
                        label: "Label (Nepali)",
                      }),
                      {
                        type: "string",
                        name: "href",
                        label: "Href",
                      },
                    ],
                  },
                  {
                    type: "object",
                    name: "secondary_cta",
                    label: "Secondary CTA",
                    fields: [
                      localizedString({
                        name: "label_en",
                        label: "Label (English)",
                      }),
                      localizedString({
                        name: "label_np",
                        label: "Label (Nepali)",
                      }),
                      {
                        type: "string",
                        name: "href",
                        label: "Href",
                      },
                    ],
                  },
                  localizedString({
                    name: "disclaimer_en",
                    label: "Disclaimer (English)",
                  }),
                  localizedString({
                    name: "disclaimer_np",
                    label: "Disclaimer (Nepali)",
                  }),
                  {
                    type: "object",
                    name: "daily_pulse",
                    label: "Daily Pulse",
                    fields: [
                      localizedString({
                        name: "title_en",
                        label: "Title (English)",
                      }),
                      localizedString({
                        name: "title_np",
                        label: "Title (Nepali)",
                      }),
                      localizedString({
                        name: "subtitle_en",
                        label: "Subtitle (English)",
                      }),
                      localizedString({
                        name: "subtitle_np",
                        label: "Subtitle (Nepali)",
                      }),
                      {
                        type: "object",
                        name: "cards",
                        label: "Cards",
                        list: true,
                        fields: [
                          localizedString({
                            name: "eyebrow_en",
                            label: "Eyebrow (English)",
                          }),
                          localizedString({
                            name: "eyebrow_np",
                            label: "Eyebrow (Nepali)",
                          }),
                          localizedString({
                            name: "title_en",
                            label: "Title (English)",
                          }),
                          localizedString({
                            name: "title_np",
                            label: "Title (Nepali)",
                          }),
                          localizedString({
                            name: "cta_label_en",
                            label: "CTA Label (English)",
                          }),
                          localizedString({
                            name: "cta_label_np",
                            label: "CTA Label (Nepali)",
                          }),
                          {
                            type: "string",
                            name: "href",
                            label: "Href",
                          },
                          {
                            type: "boolean",
                            name: "highlight",
                            label: "Highlight Card",
                            ui: {
                              defaultValue: false,
                            },
                          },
                          {
                            type: "object",
                            name: "secondary_cta",
                            label: "Secondary CTA",
                            ui: {
                              defaultItem: {
                                href: "",
                              },
                            },
                            fields: [
                              localizedString({
                                name: "label_en",
                                label: "Label (English)",
                              }),
                              localizedString({
                                name: "label_np",
                                label: "Label (Nepali)",
                              }),
                              {
                                type: "string",
                                name: "href",
                                label: "Href",
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              manifesto: {
                label: "Manifesto Grid",
                fields: [
                  localizedString({ name: "kicker_en", label: "Kicker (English)" }),
                  localizedString({ name: "kicker_np", label: "Kicker (Nepali)" }),
                  localizedString({ name: "title_en", label: "Title (English)" }),
                  localizedString({ name: "title_np", label: "Title (Nepali)" }),
                  localizedRichText({
                    name: "subtitle_en",
                    label: "Subtitle (English)",
                  }),
                  localizedRichText({
                    name: "subtitle_np",
                    label: "Subtitle (Nepali)",
                  }),
                  localizedString({ name: "closer_en", label: "Closer (English)" }),
                  localizedString({ name: "closer_np", label: "Closer (Nepali)" }),
                  {
                    type: "object",
                    name: "items",
                    label: "Items",
                    list: true,
                    fields: [
                      localizedString({ name: "title_en", label: "Title (English)" }),
                      localizedString({ name: "title_np", label: "Title (Nepali)" }),
                      localizedRichText({
                        name: "body_en",
                        label: "Body (English)",
                      }),
                      localizedRichText({
                        name: "body_np",
                        label: "Body (Nepali)",
                      }),
                    ],
                  },
                ],
              },
              foundations: {
                label: "Foundations",
                fields: [
                  localizedString({ name: "kicker_en", label: "Kicker (English)" }),
                  localizedString({ name: "kicker_np", label: "Kicker (Nepali)" }),
                  localizedString({ name: "title_en", label: "Title (English)" }),
                  localizedString({ name: "title_np", label: "Title (Nepali)" }),
                  localizedRichText({
                    name: "subtitle_en",
                    label: "Subtitle (English)",
                  }),
                  localizedRichText({
                    name: "subtitle_np",
                    label: "Subtitle (Nepali)",
                  }),
                  localizedString({ name: "closer_en", label: "Closer (English)" }),
                  localizedString({ name: "closer_np", label: "Closer (Nepali)" }),
                  {
                    type: "object",
                    name: "stones",
                    label: "Foundational Stones",
                    list: true,
                    fields: [
                      localizedString({ name: "title_en", label: "Title (English)" }),
                      localizedString({ name: "title_np", label: "Title (Nepali)" }),
                      localizedRichText({
                        name: "description_en",
                        label: "Description (English)",
                      }),
                      localizedRichText({
                        name: "description_np",
                        label: "Description (Nepali)",
                      }),
                    ],
                  },
                ],
              },
              footer: {
                label: "Footer",
                fields: [
                  localizedString({ name: "site_en", label: "Site Label (English)" }),
                  localizedString({ name: "site_np", label: "Site Label (Nepali)" }),
                  localizedString({ name: "tagline_en", label: "Tagline (English)" }),
                  localizedString({ name: "tagline_np", label: "Tagline (Nepali)" }),
                  localizedString({
                    name: "copyright_suffix_en",
                    label: "Copyright Suffix (English)",
                  }),
                  localizedString({
                    name: "copyright_suffix_np",
                    label: "Copyright Suffix (Nepali)",
                  }),
                  {
                    type: "object",
                    name: "links",
                    label: "Links",
                    list: true,
                    fields: [
                      localizedString({ name: "label_en", label: "Label (English)" }),
                      localizedString({ name: "label_np", label: "Label (Nepali)" }),
                      {
                        type: "string",
                        name: "href",
                        label: "Href",
                      },
                    ],
                  },
                ],
              },
            },
          },
        ],
      },
      {
        name: "blocks",
        label: "Reusable Blocks",
        path: "content/blocks",
        format: "json",
        fields: [
          localizedString({ name: "title_en", label: "Title (English)" }),
          localizedString({ name: "title_np", label: "Title (Nepali)" }),
          localizedRichText({ name: "body_en", label: "Body (English)" }),
          localizedRichText({ name: "body_np", label: "Body (Nepali)" }),
        ],
      },
    ],
  },
});
