declare module 'tinacms' {
  import type { ComponentType, ReactNode } from 'react';

  export class TinaCMS {
    constructor(options?: unknown);
    enable(): void;
    disable(): void;
  }
  export const TinaProvider: ComponentType<{ cms: TinaCMS; children: ReactNode }>;
  export function useForm<TValues = Record<string, unknown>>(config: unknown): [TValues, any];
  export function usePlugin(plugin: unknown): void;
  export default TinaCMS;
}
