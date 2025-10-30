declare module 'react-tinacms-inline' {
  import type { ComponentType } from 'react';

  export const InlineForm: ComponentType<Record<string, unknown>>;
  export const InlineText: ComponentType<Record<string, unknown>>;
  export const InlineTextarea: ComponentType<Record<string, unknown>>;
}
